import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPER_ADMIN_IDS = [
  'b035a808-2a4b-4296-9a69-76ac491b1367',
  '9cb4b7a5-759b-432d-a805-bd4722954c88',
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // ── Autenticación: quién llama ──────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'No autorizado' }, 401);

  const { data: callerData, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !callerData.user) return json({ error: 'Sesión inválida' }, 401);

  const callerId = callerData.user.id;
  let autorizado = SUPER_ADMIN_IDS.includes(callerId);
  if (!autorizado) {
    const { data: perfilCaller } = await admin
      .from('perfiles_usuario')
      .select('rol')
      .eq('id', callerId)
      .maybeSingle();
    autorizado = perfilCaller?.rol === 'admin' || perfilCaller?.rol === 'staff';
  }
  if (!autorizado) return json({ error: 'No tenés permisos para gestionar usuarios' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const accion = body.accion;

  // ── Crear usuario ────────────────────────────────────────────────────────
  if (accion === 'crear') {
    const nombre = String(body.nombre ?? '').trim();
    const apellido = String(body.apellido ?? '').trim();
    const dni = String(body.dni ?? '').trim();
    const seccion = body.seccion ? String(body.seccion) : null;
    const usernameRaw = String(body.username ?? '').trim();

    if (!nombre || !apellido) return json({ error: 'Nombre y apellido son obligatorios' }, 400);
    if (!dni || dni.length < 4) return json({ error: 'El DNI es obligatorio (mínimo 4 caracteres)' }, 400);
    if (!seccion) return json({ error: 'La sección es obligatoria' }, 400);
    if (!usernameRaw || usernameRaw.length < 3) {
      return json({ error: 'El nombre de usuario es obligatorio (mínimo 3 caracteres)' }, 400);
    }

    const username = usernameRaw.toLowerCase().replace(/\s+/g, '');

    const { data: existente } = await admin
      .from('perfiles_usuario')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    if (existente) return json({ error: 'Ese nombre de usuario ya está en uso' }, 400);

    const { data: org } = await admin.from('organizaciones').select('id').limit(1).single();
    if (!org) return json({ error: 'No hay organización configurada' }, 500);

    const emailInterno = `${username}@eldertech.internal`;

    const { data: nuevoAuth, error: authCreateError } = await admin.auth.admin.createUser({
      email: emailInterno,
      password: dni,
      email_confirm: true,
      user_metadata: { username },
    });

    if (authCreateError || !nuevoAuth.user) {
      return json({ error: authCreateError?.message ?? 'No se pudo crear el usuario' }, 400);
    }

    const userId = nuevoAuth.user.id;

    const { data: residente, error: residenteError } = await admin
      .from('residentes')
      .insert({
        organizacion_id: org.id,
        nombre,
        apellido,
        dni,
        seccion,
        activo: true,
      })
      .select('id')
      .single();

    if (residenteError || !residente) {
      await admin.auth.admin.deleteUser(userId);
      return json({ error: residenteError?.message ?? 'No se pudo crear el residente' }, 400);
    }

    const { error: perfilError } = await admin.from('perfiles_usuario').insert({
      id: userId,
      residente_id: residente.id,
      organizacion_id: org.id,
      username,
      rol: 'residente',
      activo: true,
    });

    if (perfilError) {
      await admin.from('residentes').delete().eq('id', residente.id);
      await admin.auth.admin.deleteUser(userId);
      return json({ error: perfilError.message }, 400);
    }

    return json({ id: residente.id, username });
  }

  // ── Resetear contraseña (DNI) ───────────────────────────────────────────
  if (accion === 'resetear_password') {
    const residenteId = String(body.residente_id ?? '');
    const dni = String(body.dni ?? '').trim();
    if (!residenteId || !dni || dni.length < 4) {
      return json({ error: 'Datos inválidos' }, 400);
    }

    const { data: perfil } = await admin
      .from('perfiles_usuario')
      .select('id')
      .eq('residente_id', residenteId)
      .maybeSingle();

    if (!perfil) return json({ error: 'No se encontró el usuario del residente' }, 404);

    const { error: updateAuthError } = await admin.auth.admin.updateUserById(perfil.id, { password: dni });
    if (updateAuthError) return json({ error: updateAuthError.message }, 400);

    const { error: updateResidenteError } = await admin
      .from('residentes')
      .update({ dni, updated_at: new Date().toISOString() })
      .eq('id', residenteId);
    if (updateResidenteError) return json({ error: updateResidenteError.message }, 400);

    return json({ ok: true });
  }

  return json({ error: 'Acción no reconocida' }, 400);
});
