ALTER TABLE public.email_settings 
ADD COLUMN smtp_host text DEFAULT '',
ADD COLUMN smtp_port integer DEFAULT 465,
ADD COLUMN smtp_user text DEFAULT '',
ADD COLUMN smtp_password text DEFAULT '';