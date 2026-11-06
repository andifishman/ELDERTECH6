# App de familiares (ElderTech Familias)

PWA aparte (`familia/`) para que los familiares de los residentes vean su vida en la residencia y no se sientan
desinformados. Mismo repo, mismo backend (`/api/familia/*`) y misma base que la app de residentes y el backoffice.

## Qué hace

| Pantalla | Qué ve / hace el familiar | Dónde lo carga el personal |
|---|---|---|
| Inicio | Avisos importantes sin leer, próxima actividad del residente, fotos nuevas, mensajes sin leer, próximos eventos | — |
| Calendario → Actividades | Actividades del **piso** del residente (feed del Hogar, igual que la app de residentes) | Sistema del Hogar |
| Calendario → Agenda de {residente} | Lo que **el propio residente** anotó en su agenda. Solo lectura | App de residentes |
| Calendario → Eventos | Eventos de la residencia; si están abiertos, se anota e indica cuántas personas van | Backoffice → Contenido para familias → Eventos |
| Fotos | Carrusel por álbum, reacciones y comentarios | Backoffice → Contenido para familias → Fotos |
| Mensajes | Chat de ida y vuelta con el residente (texto y fotos del lado familiar; el residente contesta en texto) | — |
| Más → Avisos | Avisos con "Ya lo leí" | Backoffice → Contenido para familias → Avisos (ve quién leyó) |
| Más → Noticias | Novedades marcadas "También para las familias" | Backoffice → Novedades |
| Más → Documentos | PDFs e imágenes generales | Backoffice → Contenido para familias → Documentos |
| Más → Consultas y reclamos | Consulta (con categoría), sugerencia o reclamo, con seguimiento y respuesta | Backoffice → Comunicación con familias |
| Más → Proponer una actividad | Sugerir un taller o ofrecerse a darlo | Backoffice → Comunicación con familias → Propuestas |

Quedaron **fuera** a pedido: videollamada, gustos del residente y resumen diario.

## Reglas de privacidad (no negociables)

- Un familiar solo ve a los residentes con **vínculo activo** (lo crea y lo revoca el personal desde Backoffice → Familiares).
  `requireFamiliar` lee los vínculos de la base **en cada request**: revocar rige al instante.
- Todo `residenteId` que llega del cliente pasa por `exigirVinculo` (`backend/src/utils/familia.ts`). Un residente ajeno da 404.
- Todo lo del familiar se filtra por `organizacion_id` y por su `familiar_id` (consultas, propuestas, mensajes, inscripciones).
- Nada clínico: esta app no expone ningún dato de salud. Las consultas avisan que no se escriban datos de salud ni urgencias.
- Fotos, documentos y fotos de mensajes viven en buckets **privados** (`familia-fotos`, `familia-documentos`,
  `familia-mensajes`) y se entregan con URLs firmadas de **1 hora**. Nunca públicas. El tipo de archivo se verifica por
  los bytes, no por la extensión.
- Solo se muestran los álbumes que el personal **publica de forma explícita** (borrador por defecto). Hoy un álbum
  publicado lo ven **todas** las familias de la institución. La columna `familia_albumes.residente_ids` queda reservada
  para sumar consentimiento de imagen por residente más adelante.
- Los comentarios aparecen al instante; el personal con permiso `eliminar` en *Contenido para familias* los borra.

## Puesta en marcha (desarrollo)

```bash
cd familia && npm install     # solo la primera vez
cp .env.example .env          # completar VITE_SUPABASE_ANON_KEY
npm run dev                   # http://localhost:5174
```

El backend (`cd backend && npm run dev`) tiene que estar corriendo. En `backend/.env`:

```
FAMILIA_APP_URL=http://localhost:5174      # a dónde aterriza el link de invitación
CORS_ALLOWED_ORIGINS=...,http://localhost:5174
```

## Antes de usarlo con familias reales (en este orden)

1. **Aplicar las migraciones** en este orden (la primera va sola porque `ALTER TYPE … ADD VALUE` no se puede usar en
   su misma transacción):
   - `supabase/migrations/20261101120000_familia_rol.sql`
   - `supabase/migrations/20261101120500_familia_module.sql`
   - `supabase/migrations/20261101121000_familia_solicitudes_acceso.sql` (pedidos de acceso, ver más abajo)
2. **Cerrar el acceso directo a Supabase (CRÍTICO).** Los familiares también son usuarios "authenticated". Si en
   producción siguen las políticas abiertas `TO authenticated USING (true)`, un familiar con conocimientos técnicos
   podría leer con la clave pública tablas de contenido (por ejemplo `residentes` de todas las instituciones, con DNI)
   saltándose el backend. Verificar en el SQL Editor:
   ```sql
   select tablename, policyname, cmd, qual from pg_policies
   where schemaname = 'public' and roles @> '{authenticated}' and qual = 'true';
   ```
   Si devuelve filas, aplicar `supabase/endurecer_rls_y_storage.sql` (ver `supabase/README.md`: antes desplegar el
   backend, hacer backup). Las tablas nuevas de familias ya nacen cerradas (solo admin/staff).
3. **Supabase Auth → Email** (el login es por código de 6 dígitos por email, sin contraseña):
   - Plantilla **Magic Link** y **Invite user**: incluir el código `{{ .Token }}` en el cuerpo (si no, el email trae
     solo un link y no el código que pide la pantalla de login).
   - **SMTP propio** (Authentication → SMTP): el correo por defecto de Supabase tiene un límite de pocos mails por hora
     y no alcanza para invitar familias.
   - **Redirect URLs**: agregar la URL pública de la app de familiares (es donde aterriza la invitación).
   - Largo y vencimiento del código: dejar el largo en 6 (la pantalla acepta de 6 a 8 dígitos).
4. **Backend**: `FAMILIA_APP_URL` y `CORS_ALLOWED_ORIGINS` con el dominio de la app de familiares.
5. **Deploy de la app**: proyecto de Vercel con *Root Directory* `familia`, variables `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY` y `VITE_API_URL` (la URL **real** del backend: la app muestra un cartel de "no configurada"
   si queda en localhost en un build de producción).
6. **Permisos del personal**: los administradores (`rol = admin`) reciben los tres módulos nuevos con la migración
   (`familiares`, `familia_contenido`, `familia_comunicacion`). El personal `staff` queda sin ellos: asignarlos desde
   Backoffice → Accesos.
7. **Textos legales**: la Ley 25.326 (datos personales) y el consentimiento de imagen los tiene que revisar alguien con
   criterio legal antes de publicar fotos de residentes.

## Alta de un familiar

Backoffice → **Familiares** → *Nuevo familiar*: nombre, email, residente(s) y parentesco. Le llega un email con el link
de invitación; después entra siempre con su email + un código. Un residente puede tener varios familiares y un familiar
varios residentes. **Revocar** corta el acceso a ese residente al instante y no borra nada (se puede reactivar).

## Pedidos de acceso (quien intenta entrar sin estar dado de alta)

En la pantalla de entrada, la app consulta al backend si el email está dado de alta (`POST /api/acceso-familia/verificar`, público):

- **Dado de alta** → se manda el código por email.
- **Deshabilitado** → se le avisa que se comunique con la residencia.
- **No dado de alta** → se le dice y puede completar un formulario (nombre, a quién visita, parentesco, teléfono). Eso crea una **solicitud** que el personal ve en Backoffice → Familiares (recuadro amarillo). *Aprobar* abre el alta con los datos cargados (el email sale de la solicitud, no se puede cambiar) y manda la invitación; *Rechazar* la cierra sin avisarle.

Límites: un solo pedido pendiente por email (los reintentos lo actualizan), 5 pedidos por hora y 20 consultas por 10 minutos por IP, y tope de 300 pendientes por residencia. **Consecuencia a tener en cuenta:** como la pantalla dice si un email está dado de alta o no, alguien podría ir probando emails para saber quiénes son familiares; el límite por IP lo frena pero no lo elimina.

## Pendientes conocidos

- Los avisos y mensajes nuevos se ven al abrir la app (y la pestaña Mensajes se actualiza sola cada 30 s), pero **no
  hay notificaciones push ni email** para el familiar. Para sumarlo: Web Push (ya hay VAPID en el backend) o email.
- El residente contesta con texto; no hay voz ni fotos de su lado.
- Consentimiento de imagen por residente (ver arriba).
