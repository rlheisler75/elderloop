-- Weekly demo reset (pg_cron 'reset-demo-dates', Fridays) shifts the demo community's
-- dates forward so it always looks current. Budget data is anchored to calendar
-- months and hand-checked (20261003_demo_budget_phase2_data.sql,
-- 20261004_demo_budget_phase4_data.sql), and most of it (purchase orders, supply
-- issues, census, off-system purchases, linen discards) was never shifted. Two
-- shifted tables carried budget history, so they now stay put:
--   * food_waste_logs: no longer shifted (waste share on the Dietary report)
--   * work_orders closed with a close-out record (parts, vendor cost, or labor hours):
--     no longer shifted (Maintenance spend and costs). Open jobs, PM due dates, and
--     closed jobs without a close-out still shift as before.
-- Otherwise unchanged.
CREATE OR REPLACE FUNCTION public.reset_demo_dates(p_org_id uuid DEFAULT 'a5555c06-f99d-4ec0-ad2f-e3c818466bb2'::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last_reset date;
  v_drift      int;
BEGIN
  SELECT COALESCE(demo_last_reset, '2026-04-22'::date)
  INTO v_last_reset
  FROM organizations
  WHERE id = p_org_id;

  v_drift := CURRENT_DATE - v_last_reset;

  IF v_drift = 0 THEN
    RETURN jsonb_build_object(
      'status',     'skipped',
      'reason',     'already reset today',
      'last_reset', v_last_reset
    );
  END IF;

  -- Tell the audit trigger to skip logging for this session
  SET LOCAL app.skip_audit = 'true';

  -- ── Activities ──────────────────────────────────────────────
  UPDATE activities SET
    start_date     = start_date + v_drift,
    recur_end_date = CASE WHEN recur_end_date IS NOT NULL
                          THEN recur_end_date + v_drift END
  WHERE organization_id = p_org_id;

  -- ── Activity Attendance ─────────────────────────────────────
  UPDATE activity_attendance SET
    occurrence_date = occurrence_date + v_drift
  WHERE organization_id = p_org_id;

  -- ── Activity RSVPs ──────────────────────────────────────────
  UPDATE activity_rsvps SET
    occurrence_date = occurrence_date + v_drift
  WHERE organization_id = p_org_id;

  -- ── Work Orders ─────────────────────────────────────────────
  -- Closed jobs with a close-out record are budget history: they stay put.
  UPDATE work_orders SET
    created_at         = created_at         + (v_drift || ' days')::interval,
    due_date           = CASE WHEN due_date IS NOT NULL
                              THEN due_date + v_drift END,
    next_due           = CASE WHEN next_due IS NOT NULL
                              THEN next_due + v_drift END,
    completed_at       = CASE WHEN completed_at IS NOT NULL
                              THEN completed_at + (v_drift || ' days')::interval END,
    sla_response_due   = CASE WHEN sla_response_due IS NOT NULL
                              THEN sla_response_due + (v_drift || ' days')::interval END,
    sla_completion_due = CASE WHEN sla_completion_due IS NOT NULL
                              THEN sla_completion_due + (v_drift || ' days')::interval END,
    sla_responded_at   = CASE WHEN sla_responded_at IS NOT NULL
                              THEN sla_responded_at + (v_drift || ' days')::interval END,
    vendor_eta         = CASE WHEN vendor_eta IS NOT NULL
                              THEN vendor_eta + (v_drift || ' days')::interval END
  WHERE organization_id = p_org_id
    AND NOT (status = 'closed'
             AND (parts_cost IS NOT NULL OR vendor_cost IS NOT NULL OR actual_hours IS NOT NULL));

  -- ── PM Schedules ─────────────────────────────────────────────
  UPDATE pm_schedules SET
    next_due       = next_due + v_drift,
    last_generated = CASE WHEN last_generated IS NOT NULL
                          THEN last_generated + v_drift END
  WHERE organization_id = p_org_id;

  -- ── Compliance Inspections ───────────────────────────────────
  UPDATE compliance_inspections SET
    inspection_date = inspection_date + v_drift,
    next_due_date   = CASE WHEN next_due_date IS NOT NULL
                           THEN next_due_date + v_drift END
  WHERE organization_id = p_org_id;

  -- ── Meter Readings ──────────────────────────────────────────
  UPDATE meter_readings SET
    reading_date = reading_date + v_drift
  WHERE organization_id = p_org_id;

  -- ── Transportation Trips ────────────────────────────────────
  UPDATE trips SET
    trip_date = trip_date + v_drift
  WHERE organization_id = p_org_id;

  -- ── Announcements ───────────────────────────────────────────
  UPDATE announcements SET
    starts_at  = starts_at  + (v_drift || ' days')::interval,
    expires_at = CASE WHEN expires_at IS NOT NULL
                      THEN expires_at + (v_drift || ' days')::interval END
  WHERE organization_id = p_org_id;

  -- ── Incident Reports ────────────────────────────────────────
  UPDATE incident_reports SET
    incident_date          = incident_date + v_drift,
    follow_up_date         = CASE WHEN follow_up_date IS NOT NULL
                                  THEN follow_up_date + v_drift END,
    family_notified_at     = CASE WHEN family_notified_at IS NOT NULL
                                  THEN family_notified_at + (v_drift || ' days')::interval END,
    supervisor_notified_at = CASE WHEN supervisor_notified_at IS NOT NULL
                                  THEN supervisor_notified_at + (v_drift || ' days')::interval END,
    reviewed_at            = CASE WHEN reviewed_at IS NOT NULL
                                  THEN reviewed_at + (v_drift || ' days')::interval END
  WHERE organization_id = p_org_id;

  -- ── Security Rounds ─────────────────────────────────────────
  UPDATE security_rounds SET
    started_at   = CASE WHEN started_at IS NOT NULL
                        THEN started_at + (v_drift || ' days')::interval END,
    completed_at = CASE WHEN completed_at IS NOT NULL
                        THEN completed_at + (v_drift || ' days')::interval END
  WHERE organization_id = p_org_id;

  -- ── Security Reports ────────────────────────────────────────
  -- No dedicated "filed" date column — created_at is the only signal for
  -- when the report was made, same reasoning as Work Orders above.
  UPDATE security_reports SET
    created_at  = created_at + (v_drift || ' days')::interval,
    reviewed_at = CASE WHEN reviewed_at IS NOT NULL
                       THEN reviewed_at + (v_drift || ' days')::interval END
  WHERE organization_id = p_org_id;

  -- ── Chapel Services ─────────────────────────────────────────
  UPDATE chapel_services SET
    service_date           = service_date + v_drift,
    stream_started_at      = CASE WHEN stream_started_at IS NOT NULL
                                  THEN stream_started_at + (v_drift || ' days')::interval END,
    recording_uploaded_at  = CASE WHEN recording_uploaded_at IS NOT NULL
                                  THEN recording_uploaded_at + (v_drift || ' days')::interval END
  WHERE organization_id = p_org_id;

  -- ── Food Waste Logs ─────────────────────────────────────────
  -- Not shifted: waste is budget history (Dietary waste share), like the rest of
  -- the demo's spend data.

  -- ── Physician Diet Orders ───────────────────────────────────
  UPDATE physician_diet_orders SET
    order_date = order_date + v_drift,
    applied_at = CASE WHEN applied_at IS NOT NULL
                      THEN applied_at + (v_drift || ' days')::interval END
  WHERE organization_id = p_org_id;

  -- ── Social Services: Social Profiles ─────────────────────────
  UPDATE ss_social_profiles SET
    last_reviewed_at = CASE WHEN last_reviewed_at IS NOT NULL
                            THEN last_reviewed_at + v_drift END,
    review_due_date  = CASE WHEN review_due_date IS NOT NULL
                            THEN review_due_date + v_drift END
  WHERE organization_id = p_org_id;

  -- ── Social Services: Mood Logs ────────────────────────────────
  UPDATE ss_mood_logs SET
    logged_at = CASE WHEN logged_at IS NOT NULL
                     THEN logged_at + (v_drift || ' days')::interval END
  WHERE organization_id = p_org_id;

  -- ── Social Services: Case Notes ───────────────────────────────
  UPDATE ss_case_notes SET
    contact_date   = contact_date + v_drift,
    follow_up_date = CASE WHEN follow_up_date IS NOT NULL
                          THEN follow_up_date + v_drift END
  WHERE organization_id = p_org_id;

  -- ── Social Services: Goals ────────────────────────────────────
  UPDATE ss_goals SET
    target_date   = CASE WHEN target_date IS NOT NULL
                         THEN target_date + v_drift END,
    achieved_date = CASE WHEN achieved_date IS NOT NULL
                         THEN achieved_date + v_drift END
  WHERE organization_id = p_org_id;

  -- ── Social Services: Grievances ───────────────────────────────
  UPDATE ss_grievances SET
    filed_at                = CASE WHEN filed_at IS NOT NULL
                                   THEN filed_at + (v_drift || ' days')::interval END,
    resolved_at             = CASE WHEN resolved_at IS NOT NULL
                                   THEN resolved_at + (v_drift || ' days')::interval END,
    regulatory_report_date  = CASE WHEN regulatory_report_date IS NOT NULL
                                   THEN regulatory_report_date + v_drift END
  WHERE organization_id = p_org_id;

  -- ── Social Services: Care Conferences ─────────────────────────
  UPDATE ss_care_conferences SET
    scheduled_date       = scheduled_date + v_drift,
    completed_date       = CASE WHEN completed_date IS NOT NULL
                                THEN completed_date + v_drift END,
    next_conference_date = CASE WHEN next_conference_date IS NOT NULL
                                THEN next_conference_date + v_drift END
  WHERE organization_id = p_org_id;

  -- ── Social Services: Discharge Plans ──────────────────────────
  UPDATE ss_discharge_plans SET
    anticipated_discharge_date = CASE WHEN anticipated_discharge_date IS NOT NULL
                                      THEN anticipated_discharge_date + v_drift END,
    actual_discharge_date      = CASE WHEN actual_discharge_date IS NOT NULL
                                      THEN actual_discharge_date + v_drift END
  WHERE organization_id = p_org_id;

  -- ── Social Services: Referrals ────────────────────────────────
  UPDATE ss_referrals SET
    referred_at    = referred_at + v_drift,
    follow_up_date = CASE WHEN follow_up_date IS NOT NULL
                          THEN follow_up_date + v_drift END
  WHERE organization_id = p_org_id;

  -- ── Scheduled Shifts ────────────────────────────────────────
  UPDATE scheduled_shifts SET
    shift_date     = shift_date + v_drift,
    recur_end_date = CASE WHEN recur_end_date IS NOT NULL
                          THEN recur_end_date + v_drift END,
    calloff_at     = CASE WHEN calloff_at IS NOT NULL
                          THEN calloff_at + (v_drift || ' days')::interval END
  WHERE organization_id = p_org_id;

  -- ── Survey Responses (linked via surveys) ───────────────────
  UPDATE survey_responses SET
    submitted_at = submitted_at + (v_drift || ' days')::interval
  WHERE survey_id IN (
    SELECT id FROM surveys WHERE organization_id = p_org_id
  );

  -- ── Stamp last reset date ───────────────────────────────────
  UPDATE organizations
  SET demo_last_reset = CURRENT_DATE
  WHERE id = p_org_id;

  RETURN jsonb_build_object(
    'status',     'success',
    'drift_days', v_drift,
    'reset_to',   CURRENT_DATE,
    'org_id',     p_org_id
  );
END;
$function$;
