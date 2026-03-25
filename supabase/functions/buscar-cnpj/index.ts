import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cnpj } = await req.json();

    if (!cnpj) {
      return new Response(
        JSON.stringify({ error: 'CNPJ é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remove non-numeric characters
    const cleanCnpj = cnpj.replace(/\D/g, '');

    if (cleanCnpj.length !== 14) {
      return new Response(
        JSON.stringify({ error: 'CNPJ inválido. Deve conter 14 dígitos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('CNPJA_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Chave da API CNPJa não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(`https://api.cnpja.com/office/${cleanCnpj}`, {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CNPJa API error [${response.status}]:`, errorText);
      return new Response(
        JSON.stringify({ error: `Erro ao buscar CNPJ: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    // Map CNPJa response to our profile fields
    const result = {
      empresa: data.company?.name || data.alias || '',
      contato: '',
      email: data.emails?.[0]?.address || '',
      telefone: data.phones?.[0] ? `(${data.phones[0].area}) ${data.phones[0].number}` : '',
      cep: data.address?.zip || '',
      endereco: data.address?.street || '',
      numero: data.address?.number || '',
      complemento: data.address?.details || '',
      cidade: data.address?.city || '',
      estado: data.address?.state || '',
      cnpj_formatado: cleanCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
    };

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
