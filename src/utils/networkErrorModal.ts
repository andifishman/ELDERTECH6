// Disparador global del modal de "sin conexión" (NetworkErrorModal) — mismo
// patrón que hablemosActiveChat.ts: un módulo con una única función
// registrada por el componente raíz, para que cualquier servicio (apiClient,
// login, lo que sea) pueda pedir mostrar el modal sin pasar por Context ni
// prop drilling.
type Listener = () => void;

let listener: Listener | null = null;

export function registrarModalErrorDeRed(fn: Listener | null): void {
  listener = fn;
}

export function mostrarErrorDeRed(): void {
  listener?.();
}
