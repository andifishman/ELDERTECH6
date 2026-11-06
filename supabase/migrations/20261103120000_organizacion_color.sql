-- ============================================================
-- ElderTech — Color principal por institución
--
-- Cada institución tiene su color de marca. Lo edita el super admin desde Backoffice → Instituciones y lo
-- toman el backoffice y la app de familias de esa institución (la app de residentes lo recibe del backend:
-- GET /api/me/branding).
--
-- Formato fijo "#RRGGBB". null = el violeta ElderTech por defecto. El backend además exige un contraste
-- mínimo contra el blanco (texto blanco legible sobre el color) para no romper la accesibilidad.
-- ============================================================

alter table public.organizaciones add column if not exists color_principal text;

alter table public.organizaciones drop constraint if exists organizaciones_color_principal_formato;
alter table public.organizaciones add constraint organizaciones_color_principal_formato
  check (color_principal is null or color_principal ~ '^#[0-9A-Fa-f]{6}$');
