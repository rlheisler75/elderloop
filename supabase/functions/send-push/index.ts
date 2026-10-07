import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const respond = (data: object, status = 200) =>
  new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Server-to-server only: send-broadcast calls this with the service role key.
  // The public anon key (or a signed-in user's token) must not be able to push
  // arbitrary text to anyone's devices.
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!SERVICE_ROLE || token !== SERVICE_ROLE) {
    return respond({ success: false, error: 'Not allowed' }, 403)
  }

  try {
    const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? ''
    const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    const VAPID_EMAIL   = 'mailto:info@loopwaresolutions.com'

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      console.error('VAPID keys not configured')
      return respond({ success: false, error: 'VAPID keys not configured' })
    }

    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      SERVICE_ROLE,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await req.json()
    const { recipient_ids, title, message, url, tag } = body

    if (!recipient_ids?.length || !title) {
      return respond({ success: false, error: 'recipient_ids and title are required' })
    }

    // Fetch subscriptions for these users
    const { data: subs, error: subsErr } = await admin
      .from('push_subscriptions')
      .select('id, profile_id, endpoint, p256dh, auth')
      .in('profile_id', recipient_ids)

    if (subsErr) {
      console.error('Failed to fetch subscriptions:', subsErr.message)
      return respond({ success: false, error: subsErr.message })
    }

    if (!subs?.length) {
      console.log('No push subscriptions found for recipients:', recipient_ids)
      return respond({ success: true, sent: 0, message: 'No push subscriptions found' })
    }

    console.log(`Sending push to ${subs.length} subscription(s)`)

    const payload = JSON.stringify({
      title,
      body:  message || '',
      url:   url || '/app/dashboard',
      tag:   tag  || 'elderloop',
    })

    let sent = 0
    const expired: string[] = []
    const errors: string[] = []

    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          { TTL: 86400 }
        )
        sent++
        console.log(`Push sent to ${sub.endpoint.substring(0, 50)}...`)
      } catch (err: any) {
        const statusCode = err?.statusCode ?? err?.status ?? 0
        console.error(`Push failed for sub ${sub.id}: status=${statusCode} msg=${err?.message}`)
        if (statusCode === 410 || statusCode === 404) {
          expired.push(sub.id)
        } else {
          errors.push(`${sub.id}: ${err?.message}`)
        }
      }
    }))

    // Remove expired subscriptions
    if (expired.length) {
      await admin.from('push_subscriptions').delete().in('id', expired)
      console.log(`Removed ${expired.length} expired subscription(s)`)
    }

    console.log(`Done: sent=${sent} expired=${expired.length} errors=${errors.length}`)
    return respond({ success: true, sent, total: subs.length, expired: expired.length, errors })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('send-push error:', message)
    return respond({ success: false, error: message })
  }
})
