// ========================================
// SERVICIO: Artículos / Tutoriales
// DESCRIPCIÓN:
// CRUD del contenido educativo (tabla `articulos`):
// videos y guías con categoría, nivel y estado. Las
// publicaciones aparecen al instante en la app.
// ========================================
import { supabase } from '@/lib/supabase';
import type { ArticuloConCategoria, CategoriaArticulo, NivelArticulo, TipoArticulo } from '@/types/database.types';
import { registrarAuditoria } from './auditService';

export interface ArticuloInput {
  titulo: string;
  descripcion?: string | null;
  categoria_id?: string | null;
  tipo: TipoArticulo;
  nivel: NivelArticulo;
  url_contenido?: string | null;
  duracion_minutos?: number | null;
  imagen_preview_url?: string | null;
  activo: boolean; // true = publicado, false = borrador
}

export async function listarArticulos(): Promise<ArticuloConCategoria[]> {
  const { data, error } = await supabase
    .from('articulos')
    .select('*, categoria:categorias_articulo(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ArticuloConCategoria[];
}

export async function listarCategoriasArticulo(): Promise<CategoriaArticulo[]> {
  const { data, error } = await supabase
    .from('categorias_articulo')
    .select('*')
    .eq('activo', true)
    .order('orden');
  if (error) throw error;
  return (data ?? []) as CategoriaArticulo[];
}

export async function obtenerArticulo(id: string): Promise<ArticuloConCategoria | null> {
  const { data, error } = await supabase
    .from('articulos')
    .select('*, categoria:categorias_articulo(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ArticuloConCategoria) ?? null;
}

export async function crearArticulo(input: ArticuloInput): Promise<string> {
  const { data, error } = await supabase.from('articulos').insert({ ...input, vistas: 0 }).select('id').single();
  if (error) throw error;
  await registrarAuditoria({
    accion: input.activo ? 'publicar' : 'crear',
    tabla: 'articulos',
    registroId: data.id,
    descripcion: `${input.activo ? 'Publicó' : 'Creó borrador de'} "${input.titulo}"`,
  });
  return data.id;
}

export async function actualizarArticulo(id: string, input: ArticuloInput): Promise<void> {
  const { error } = await supabase
    .from('articulos')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  await registrarAuditoria({ accion: 'editar', tabla: 'articulos', registroId: id, descripcion: `Editó "${input.titulo}"` });
}

export async function eliminarArticulo(id: string, titulo?: string): Promise<void> {
  const { error } = await supabase.from('articulos').delete().eq('id', id);
  if (error) throw error;
  await registrarAuditoria({ accion: 'eliminar', tabla: 'articulos', registroId: id, descripcion: `Eliminó "${titulo ?? id}"` });
}
