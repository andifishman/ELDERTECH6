import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY no configurada en el servidor' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body: { messages?: unknown; max_tokens?: unknown; tools?: unknown; tool_choice?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { messages, max_tokens, tools, tool_choice } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages inválido' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const groqBody: Record<string, unknown> = {
    model: GROQ_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: Math.min(Number(max_tokens) || 400, 600),
  };

  if (tools) {
    groqBody.tools = tools;
    groqBody.tool_choice = tool_choice ?? 'auto';
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(groqBody),
  });

  const responseText = await res.text();

  return new Response(responseText, {
    status: res.status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
