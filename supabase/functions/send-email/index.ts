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
    console.log('Sending email to:', to);

    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get('SMTP_HOST') || '',
        port: parseInt(Deno.env.get('SMTP_PORT') || '465'),
        tls: true,
        auth: {
          username: Deno.env.get('SMTP_USER') || '',
          password: Deno.env.get('SMTP_PASSWORD') || '',
        },
      },
    });

    const emailConfig: any = {
      from: Deno.env.get('SMTP_USER') || '',
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

    // Log success
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

    // Log failure
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
