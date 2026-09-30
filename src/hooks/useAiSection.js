import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Whether an AI Add-on section ('maintenance', 'social_services') is usable for the
// current org: the add-on module is on, the clinical module too for resident-health
// sections, and the org admin hasn't switched the section off in Admin Panel → AI Add-on.
// The ai-assist Edge Function enforces the same rules; this only hides the buttons.
const CLINICAL_SECTIONS = ['social_services']

export function useAiSection(section) {
  const { organization, orgModules } = useAuth()
  const [sectionOn, setSectionOn] = useState(true)

  const moduleOn = orgModules.includes('ai_assist') &&
    (!CLINICAL_SECTIONS.includes(section) || orgModules.includes('ai_assist_clinical'))

  useEffect(() => {
    if (!moduleOn || !organization?.id) return
    supabase.from('ai_settings').select('enabled')
      .eq('organization_id', organization.id).eq('section', section).maybeSingle()
      .then(({ data }) => setSectionOn(data?.enabled !== false))
  }, [moduleOn, organization?.id, section])

  return moduleOn && sectionOn
}
