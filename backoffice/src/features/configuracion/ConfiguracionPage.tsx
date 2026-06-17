// ========================================
// PANTALLA: ConfiguracionPage
// DESCRIPCIÓN:
// Configuración general del geriátrico (organización):
// nombre, logo, dirección, teléfono y email. Los cambios
// impactan en la app móvil de los residentes.
// ========================================
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Building2 } from 'lucide-react';
import { supabase, ORG_ID } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryClient';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState } from '@/components/common/states';
import { notify } from '@/components/ui/toast';
import { registrarAuditoria } from '@/services/auditService';
import type { Organizacion } from '@/types/database.types';

interface Campos {
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  logo_url: string;
}

async function obtenerOrganizacion(): Promise<Organizacion | null> {
  const { data, error } = await supabase.from('organizaciones').select('*').eq('id', ORG_ID).maybeSingle();
  if (error) throw error;
  return (data as Organizacion) ?? null;
}

export function ConfiguracionPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: queryKeys.organizacion, queryFn: obtenerOrganizacion });
  const { register, handleSubmit, reset } = useForm<Campos>();

  useEffect(() => {
    if (!data) return;
    reset({
      nombre: data.nombre ?? '',
      direccion: data.direccion ?? '',
      telefono: data.telefono ?? '',
      email: data.email ?? '',
      logo_url: data.logo_url ?? '',
    });
  }, [data, reset]);

  const guardar = useMutation({
    mutationFn: async (c: Campos) => {
      const { error } = await supabase
        .from('organizaciones')
        .update({
          nombre: c.nombre,
          direccion: c.direccion || null,
          telefono: c.telefono || null,
          email: c.email || null,
          logo_url: c.logo_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ORG_ID);
      if (error) throw error;
      await registrarAuditoria({ accion: 'editar', tabla: 'organizaciones', registroId: ORG_ID, descripcion: 'Actualizó la configuración general' });
    },
    onSuccess: () => {
      notify.success('Configuración guardada');
      void qc.invalidateQueries({ queryKey: queryKeys.organizacion });
    },
    onError: () => notify.error('No se pudo guardar la configuración'),
  });

  if (isLoading) return <LoadingState mensaje="Cargando configuración…" />;

  return (
    <div className="space-y-5">
      <PageHeader titulo="Configuración general" descripcion="Datos del geriátrico que ven los residentes en la app." />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" /> Datos de la institución
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((c) => guardar.mutate(c))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" {...register('nombre', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logo">Logo (URL)</Label>
              <Input id="logo" placeholder="https://…" {...register('logo_url')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="direccion">Dirección</Label>
              <Textarea id="direccion" rows={2} {...register('direccion')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" {...register('telefono')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={guardar.isPending}>
                <Save className="h-4 w-4" /> {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
