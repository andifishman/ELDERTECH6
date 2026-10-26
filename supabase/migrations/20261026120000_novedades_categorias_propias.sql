-- ============================================================
-- Novedades — categorías propias de cada residencia
--
-- Además de las 7 fijas (general, evento, salud, comida, cumpleanos,
-- visita, aviso), el backoffice puede crear categorías nuevas desde
-- "Nueva categoría". novedades.categoria guarda la clave de las fijas
-- o el id (uuid) de una de estas.
-- ============================================================

create table if not exists public.novedad_categorias (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  nombre          text not null check (char_length(btrim(nombre)) between 1 and 40),
  emoji           text check (emoji is null or char_length(emoji) <= 8),
  created_at      timestamptz not null default now()
);

create unique index if not exists uq_novedad_categorias_org_nombre
  on public.novedad_categorias (organizacion_id, lower(btrim(nombre)));

-- Solo la usa el backend (service role); nadie entra directo desde la app.
alter table public.novedad_categorias enable row level security;

-- La categoría ya no es una lista cerrada: puede ser el id de una propia.
alter table public.novedades drop constraint if exists novedades_categoria_check;

notify pgrst, 'reload schema';
