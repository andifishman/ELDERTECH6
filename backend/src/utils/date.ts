/** Formatea una fecha como 'YYYY-MM-DD' en horario local — igual que `toSupabaseDate` del cliente. */
export function toSupabaseDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
