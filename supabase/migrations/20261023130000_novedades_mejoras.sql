-- ============================================================
-- Novedades — más funcionalidades en el backoffice
--
--   publicar_en   → cuándo empieza a verse en la app (permite programar fecha y hora)
--   es_borrador   → guardada pero todavía no publicada
--   fijada        → aparece primero en la lista de los residentes
--   categoria     → tipo de noticia (evento, salud, comida…), con ícono en la app
--   fecha_evento  → si la noticia es de algo que va a pasar, cuándo (se muestra en la tarjeta)
-- ============================================================

alter table public.novedades add column if not exists publicar_en timestamptz not null default now();
alter table public.novedades add column if not exists es_borrador boolean not null default false;
alter table public.novedades add column if not exists fijada boolean not null default false;
alter table public.novedades add column if not exists categoria text not null default 'general';
alter table public.novedades add column if not exists fecha_evento timestamptz;

-- Las que ya existían se publicaron cuando se crearon.
update public.novedades set publicar_en = created_at where publicar_en > created_at;

alter table public.novedades drop constraint if exists novedades_categoria_check;
alter table public.novedades
  add constraint novedades_categoria_check
  check (categoria in ('general', 'evento', 'salud', 'comida', 'cumpleanos', 'visita', 'aviso'));

create index if not exists idx_novedades_org_publicar on public.novedades (organizacion_id, publicar_en desc);

notify pgrst, 'reload schema';
