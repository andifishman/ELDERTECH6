# Base de datos (Supabase)

## Estado honesto de las migraciones

`supabase/migrations/` **todavía no alcanza para levantar la base desde cero**.
Hay estructura que existe en producción y ningún archivo crea:

- Faltan las tablas base (`organizaciones`, `residentes`, `actividades`,
  `tipos_actividad`, `ubicaciones`, `responsables`, `tutoriales`…). La segunda
  migración (`20260518113844_expand_residentes.sql`) ya hace `ALTER TABLE
  residentes` sobre una tabla que nadie crea.
- Columnas usadas por el código y creadas a mano desde el dashboard
  (`perfiles_usuario.ultimo_acceso`, `.nombre_completo`, `.avatar_url`,
  `.email`, `residentes.ultima_conexion`). La migración
  `20261102120000_perfiles_sin_escritura_cliente.sql` las declara con
  `add column if not exists`, así que es segura en producción y deja el repo
  completo para estas columnas.
- Cinco prefijos de versión están repetidos o incompletos (no son
  `YYYYMMDDHHMMSS`), y la CLI de Supabase los trata como la misma versión:
  `20260608_*` (×3), `20260619_*` (×3), `20260630_*` (×2), `20260703_*` (×1).
  Se ordenan por nombre, no por cuándo se escribieron.

`schema.sql` es un volcado **de referencia** (dice "not meant to be run"), no
la fuente de verdad.

## Cómo cerrar el hueco (hay que hacerlo con acceso a la base real)

1. Volcar la estructura de producción:
   `supabase db dump --schema public,storage --file supabase/baseline.sql`
   (o `pg_dump --schema-only`). Eso es la migración *baseline*.
2. Mover las migraciones actuales a `supabase/migrations_historicas/` y dejar
   en `migrations/` el baseline (timestamp anterior a todo) + las posteriores.
3. Marcar el baseline como ya aplicado en producción para que no se vuelva a
   ejecutar: `supabase migration repair --status applied <version-baseline>`.
4. Renombrar con timestamp completo las 9 migraciones de prefijo corto y
   registrar el cambio con `supabase migration repair` (`reverted` el nombre
   viejo, `applied` el nuevo). **No renombrar sin hacer el repair**: la tabla
   `supabase_migrations.schema_migrations` de producción usa esas versiones.
5. Probar: proyecto de Supabase vacío + `supabase db push` tiene que terminar sin errores.

No se hizo en este cambio porque requiere el dump real de producción.

## Reglas de acceso (RLS)

**Aplicado** (`migrations/20261102120000_perfiles_sin_escritura_cliente.sql`):
nadie escribe `perfiles_usuario` ni `residentes` desde un cliente. RLS filtra
filas, no columnas, así que la política "update own" permitía cambiarse el
`rol`. Todo cambio de perfil pasa por el backend (service role).

**Script manual** (`endurecer_rls_y_storage.sql`, con `revertir_endurecer_rls_y_storage.sql`
para deshacerlo): cierra las políticas `TO authenticated USING (true)` (hoy
cualquier residente es "authenticated" y lee/escribe tablas de contenido) y
vuelve privados los buckets de audio/fotos del chat. Se pega a mano en el SQL
Editor y NO está en `migrations/` porque no se pudo probar contra una base de
prueba. Desplegar antes el backend que firma las URLs (`storageUrls.ts`).

Al agregar una política nueva: **nunca** `TO authenticated USING (true)`.
