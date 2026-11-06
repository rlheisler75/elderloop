// Screen addresses: elderloop.xyz/<facility number>-<screen name> (also /s/...),
// e.g. /1002-lobby. signage_resolve() (public, no sign-in on a TV) returns the
// community and the screen's layout; the bare number opens the Signage layout.
import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Signage from './Signage'
import TV from '../tv/TV'

export default function SignageScreen() {
  const { code = '' } = useParams()
  const m = code.match(/^(\d{3,7})(?:-([a-z0-9-]+))?$/i)
  const [screen, setScreen] = useState(undefined) // undefined = loading, null = not found

  useEffect(() => {
    if (!m) return
    supabase.rpc('signage_resolve', { p_number: Number(m[1]), p_url_name: m[2] || '' })
      .then(({ data }) => setScreen(data?.[0] || null))
  }, [code])

  // Not a screen address (e.g. a mistyped page): back to the normal app
  if (!m) return <Navigate to="/" replace />
  if (screen === undefined) return <div style={{ position: 'fixed', inset: 0, background: '#0c2340' }} />
  if (!screen) return (
    <div style={{ position: 'fixed', inset: 0, background: '#0c2340', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
      <div>
        <p style={{ fontSize: 22 }}>This screen address isn't set up.</p>
        <p style={{ fontSize: 14, opacity: 0.6, marginTop: 8 }}>elderloop.xyz/{code}. Add it under Communication → Digital Signage.</p>
      </div>
    </div>
  )
  return screen.display === 'tv'
    ? <TV slugOverride={screen.org_slug} screenUrl={`elderloop.xyz/${code.toLowerCase()}`} />
    : <Signage orgSlug={screen.org_slug} />
}
