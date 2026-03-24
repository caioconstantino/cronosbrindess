import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  orderId?: string;
  senderName?: string;
  senderId?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

async function getSmtpConfig(supabase: any): Promise<SmtpConfig> {
  // Try to read from email_settings table first
  const { data } = await supabase
    .from('email_settings')
    .select('smtp_host, smtp_port, smtp_user, smtp_password')
    .limit(1)
    .maybeSingle();

  if (data?.smtp_host && data?.smtp_user && data?.smtp_password) {
    console.log('Using SMTP config from database');
    return {
      host: data.smtp_host,
      port: data.smtp_port || 465,
      user: data.smtp_user,
      password: data.smtp_password,
    };
  }

  // Fallback to environment variables
  console.log('Using SMTP config from environment variables');
  return {
    host: Deno.env.get('SMTP_HOST') || '',
    port: parseInt(Deno.env.get('SMTP_PORT') || '465'),
    user: Deno.env.get('SMTP_USER') || '',
    password: Deno.env.get('SMTP_PASSWORD') || '',
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let emailData: EmailRequest;

  try {
    emailData = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const { to, subject, html, orderId, senderName, senderId, attachments } = emailData;

  try {
    const smtpConfig = await getSmtpConfig(supabase);

    if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.password) {
      throw new Error('SMTP não configurado. Acesse Configurações > Email para configurar.');
    }

    console.log('Sending email to:', to, 'via', smtpConfig.host);

    const client = new SMTPClient({
      connection: {
        hostname: smtpConfig.host,
        port: smtpConfig.port,
        tls: true,
        auth: {
          username: smtpConfig.user,
          password: smtpConfig.password,
        },
      },
    });

    const emailConfig: any = {
      from: smtpConfig.user,
      to: to,
      subject: subject,
      content: 'text/html',
      html: html,
    };

    if (attachments && attachments.length > 0) {
      console.log('Processing attachments:', attachments.length);
      emailConfig.attachments = attachments.map(att => {
        const binaryString = atob(att.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return {
          filename: att.filename,
          content: bytes,
          contentType: att.contentType,
        };
      });
    }

    await client.send(emailConfig);
    await client.close();

    console.log('Email sent successfully to:', to);

    await supabase.from('sent_email_logs').insert({
      recipient_email: to,
      subject: subject,
      status: 'sent',
      order_id: orderId || null,
      sent_by: senderId || null,
      sent_by_name: senderName || null,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    console.error('Error sending email:', error);

    await supabase.from('sent_email_logs').insert({
      recipient_email: to,
      subject: subject,
      status: 'failed',
      error_message: error.message,
      order_id: orderId || null,
      sent_by: senderId || null,
      sent_by_name: senderName || null,
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
