// Soporte WEB para `adjustsFontSizeToFit` / `minimumFontScale` de <Text>.
//
// react-native-web ignora esas props, así que un texto que en el celular se achica para entrar
// en una línea (el nombre "ElderTech" y la fecha del Home, títulos de cabecera, nombres de
// contactos…) en web se cortaba con "…" — para una persona mayor es perder información.
//
// Cómo funciona: el wrapper de Text (utils/escalaTexto.ts) marca esos textos con
// `data-fit="<escala mínima>"`. Acá un observador mide cada uno y, si no entra (su contenido es
// más ancho/alto que su caja), le baja el font-size en pasos de 5 % hasta que entre o llegue al mínimo.
// Se re-evalúa cuando cambia el contenido, el tamaño de la caja o el ancho de la ventana.
import { Platform } from 'react-native';

const PASO = 0.05;

function desborda(el: HTMLElement): boolean {
  return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
}

function ajustar(el: HTMLElement): void {
  const minimo = Number(el.dataset.fit) || 0.5;
  el.style.removeProperty('font-size');
  if (!desborda(el)) return;
  const base = parseFloat(getComputedStyle(el).fontSize);
  if (!Number.isFinite(base)) return;
  for (let escala = 1 - PASO; escala >= minimo - 1e-6; escala -= PASO) {
    el.style.fontSize = `${(base * escala).toFixed(2)}px`;
    if (!desborda(el)) return;
  }
}

let instalado = false;

export function instalarAjusteTextoWeb(): void {
  if (Platform.OS !== 'web' || instalado || typeof document === 'undefined') return;
  instalado = true;

  const pendientes = new Set<HTMLElement>();
  let programado = false;
  const procesar = () => {
    programado = false;
    pendientes.forEach((el) => {
      if (el.isConnected) ajustar(el);
    });
    pendientes.clear();
  };
  const encolar = (el: HTMLElement) => {
    pendientes.add(el);
    if (!programado) {
      programado = true;
      requestAnimationFrame(procesar);
    }
  };

  const observadorTamano = new ResizeObserver((entradas) => entradas.forEach((e) => encolar(e.target as HTMLElement)));
  const vigilar = (el: HTMLElement) => {
    if (el.dataset.fitVigilado) return;
    el.dataset.fitVigilado = '1';
    observadorTamano.observe(el);
    encolar(el);
  };
  const buscar = (raiz: ParentNode) => raiz.querySelectorAll<HTMLElement>('[data-fit]').forEach(vigilar);

  new MutationObserver((cambios) => {
    for (const cambio of cambios) {
      cambio.addedNodes.forEach((nodo) => {
        if (nodo instanceof HTMLElement) {
          if (nodo.dataset.fit) vigilar(nodo);
          buscar(nodo);
        }
      });
      // Cambió el texto de un elemento ya vigilado
      const objetivo = cambio.target instanceof HTMLElement ? cambio.target : cambio.target.parentElement;
      const afectado = objetivo?.closest<HTMLElement>('[data-fit]');
      if (afectado && cambio.type === 'characterData') encolar(afectado);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });

  window.addEventListener('resize', () => document.querySelectorAll<HTMLElement>('[data-fit]').forEach(encolar));
  buscar(document);
}
