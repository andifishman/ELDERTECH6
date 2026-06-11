// Edge Function: proxy seguro hacia Groq — la API key vive como secret del servidor.
// Deploy:  supabase functions deploy asistente
// Secret:  supabase secrets set GROQ_API_KEY=gsk_...
// El JWT del usuario se valida automáticamente (verify_jwt = true por defecto).

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY no configurada en el servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, max_tokens } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      // Tope del servidor: el cliente no puede pedir respuestas arbitrariamente largas
      max_tokens: Math.min(Number(max_tokens) || 400, 600),
    }),
  });

  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
});
