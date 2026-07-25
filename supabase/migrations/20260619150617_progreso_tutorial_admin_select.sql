-- Función auxiliar para verificar si el usuario actual es admin o staff
CREATE OR REPLACE FUNCTION public.es_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.perfiles_usuario
    WHERE id = auth.uid()
      AND rol IN ('admin', 'staff')
      AND activo = true
  );
$$;

-- Política para que admin/staff pueda leer el progreso de TODOS los residentes
CREATE POLICY progreso_admin_select ON public.progreso_tutorial
  FOR SELECT
  USING (es_staff());
