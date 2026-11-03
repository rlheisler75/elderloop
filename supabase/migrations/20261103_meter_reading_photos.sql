-- Meter readings: a photo of the meter face taken with the reading, so a mistyped
-- number can be checked against the dial before it is billed.
-- Stored like other module photos (announcement-images bucket, public URL).
alter table public.meter_readings add column if not exists photo_url text;
