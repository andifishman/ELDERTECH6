// Rastrea qué conversación de Hablemos está abierta en pantalla en este momento.
// La pantalla de chat lo setea al enfocarse/desenfocarse; `pushNotifications.ts`
// lo consulta para decidir si mostrar o no el push de un mensaje nuevo — si el
// usuario ya está viendo esa conversación, el chat se actualiza solo (Realtime)
// y no hace falta la alerta del sistema.
let conversacionActivaId: string | null = null;

export function setConversacionHablemosActiva(id: string | null): void {
  conversacionActivaId = id;
}

export function esConversacionHablemosActiva(id: string | null | undefined): boolean {
  return !!id && id === conversacionActivaId;
}
