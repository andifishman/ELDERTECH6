// ========================================
// COMPONENTE: SelectorInstitucion
// DESCRIPCIÓN:
// Muestra en qué institución se está trabajando. Un super admin puede cambiar de institución (todo el backoffice pasa a
// mostrar y editar los datos de esa); el resto de las cuentas ve solo el nombre de la suya.
// ========================================
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { elegirOrganizacion, organizacionElegida } from '@/lib/organizacionActiva';
import { listarInstituciones } from '@/services/organizacionesService';
import { aplicarColorPrincipal } from '@/lib/tema';

export function SelectorInstitucion() {
  const q = useQuery({ queryKey: ['instituciones'], queryFn: listarInstituciones, staleTime: 60_000 });
  const data = q.data;

  // Si lo guardado ya no es válido (otra cuenta, institución dada de baja), se limpia: el backend lo ignoró.
  useEffect(() => {
    const guardada = organizacionElegida();
    if (data && guardada && guardada !== data.actualId) elegirOrganizacion(null);
  }, [data]);

  // Todo el backoffice toma el color de la institución en la que se está trabajando.
  useEffect(() => {
    if (data) aplicarColorPrincipal(data.colorPrincipal);
  }, [data]);

  if (!data) return null;
  const actual = data.instituciones.find((i) => i.id === data.actualId);

  const cambiar = (id: string) => {
    if (id === data.actualId) return;
    elegirOrganizacion(id);
    // Recarga completa: vacía el caché de datos y las suscripciones en vivo de la institución anterior.
    window.location.reload();
  };

  return (
    <div className="mx-3 mb-2 rounded-xl bg-white/10 p-3">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/70">
        <Building2 className="h-3.5 w-3.5" aria-hidden /> Institución
      </p>
      {data.puedeCambiar ? (
        <select
          value={data.actualId ?? ''}
          onChange={(e) => cambiar(e.target.value)}
          aria-label="Institución con la que trabajar"
          className="w-full rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-white/60"
        >
          {data.instituciones.map((i) => (
            <option key={i.id} value={i.id} className="text-foreground">
              {i.nombre}{i.ciudad ? ` · ${i.ciudad}` : ''}
            </option>
          ))}
        </select>
      ) : (
        <p className="truncate text-sm font-semibold">{actual?.nombre ?? '—'}</p>
      )}
    </div>
  );
}
