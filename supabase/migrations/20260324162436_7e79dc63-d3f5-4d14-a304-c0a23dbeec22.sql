ALTER TABLE public.sent_email_logs 
ADD COLUMN body_html text DEFAULT NULL,
ADD COLUMN attachment_url text DEFAULT NULL;