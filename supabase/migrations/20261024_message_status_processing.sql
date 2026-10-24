-- send-broadcast claims a message by moving it from 'sending' to 'processing' so a
-- repeat call can't send it twice, but message_status had no 'processing' value: the
-- claim update failed, the function answered 409 "already sent", and nothing went
-- out (push, email, or SMS). Found while sending the first live test text, 2026-10-24.
alter type public.message_status add value if not exists 'processing' after 'sending';
