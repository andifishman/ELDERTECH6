const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "Publicada hoy", "Publicada ayer" o "Publicada el 22 de octubre" — en hora local del celular. */
export function fechaDePublicacion(iso: string): string {
  const fecha = new Date(iso);
  const hoy = new Date();
  const inicioDelDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((inicioDelDia(hoy) - inicioDelDia(fecha)) / 86_400_000);
  if (dias === 0) return 'Publicada hoy';
  if (dias === 1) return 'Publicada ayer';
  return `Publicada el ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}
