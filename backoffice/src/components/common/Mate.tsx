// ========================================
// COMPONENTE: Mate (la mascota de ElderTech en el backoffice)
// DESCRIPCIÓN:
// Un mate con cara que acompaña los mensajes del sistema: se pierde en la
// 404, se preocupa en los errores, sonríe cuando todo salió bien. Mismo
// personaje que la 404 estática (`public/404.html`). Usa los colores del
// tema (claro/oscuro) y respeta "reducir movimiento" (ver index.css).
// ========================================
import { useId } from 'react';
import { cn } from '@/lib/utils';

export type EstadoMate = 'perdido' | 'preocupado' | 'feliz' | 'neutral';

interface MateProps {
  estado?: EstadoMate;
  /** Vapor y corazón animados (para tamaños grandes). En los íconos chicos se omite. */
  animado?: boolean;
  className?: string;
}

function Cara({ estado }: { estado: EstadoMate }) {
  if (estado === 'feliz') {
    return (
      <>
        <path d="M60 148 Q66 140 72 148" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M90 148 Q96 140 102 148" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M70 160 Q81 174 92 160" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
      </>
    );
  }
  const ojos = (
    <>
      <g className="mate-parpado">
        <ellipse cx="66" cy="146" rx="6.5" ry="8" fill="#fff" />
        <circle cx="68" cy="148" r="3.6" fill="#2c1d44" />
      </g>
      <g className="mate-parpado">
        <ellipse cx="96" cy="146" rx="6.5" ry="8" fill="#fff" />
        <circle cx="98" cy="148" r="3.6" fill="#2c1d44" />
      </g>
    </>
  );
  if (estado === 'preocupado') {
    return (
      <>
        {ojos}
        <path d="M58 137 L72 131" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M104 137 L90 131" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
        <ellipse cx="81" cy="167" rx="5" ry="4" fill="none" stroke="#fff" strokeWidth="3.5" />
        <path d="M108 150 C112 156 112 160 108 162 C104 160 104 156 108 150Z" fill="#9fd3ff" />
      </>
    );
  }
  return (
    <>
      {ojos}
      <path
        d={estado === 'perdido' ? 'M72 166 Q81 160 90 166' : 'M72 163 Q81 169 90 163'}
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="56" cy="160" rx="6" ry="3.5" fill="#e0709a" opacity=".55" />
      <ellipse cx="106" cy="160" rx="6" ry="3.5" fill="#e0709a" opacity=".55" />
    </>
  );
}

export function Mate({ estado = 'neutral', animado = false, className }: MateProps) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 160 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={cn('mate overflow-visible', animado && 'mate-flota', className)}
      data-id={id}
    >
      {animado && (
        <>
          <path className="mate-vapor" d="M62 66 C52 54 72 46 62 32 C56 24 62 18 64 14" />
          <path className="mate-vapor mate-vapor-2" d="M82 62 C72 50 92 42 82 28 C76 20 82 14 84 10" />
          {estado !== 'preocupado' && (
            <path className="mate-corazon" d="M104 40 c-5-8-15-3-11 5 c2 4 11 10 11 10 s9-6 11-10 c4-8-6-13-11-5z" />
          )}
        </>
      )}
      <line x1="88" y1="92" x2="118" y2="34" stroke="#c9ced6" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="119.5" cy="31" rx="7" ry="4.5" transform="rotate(-28 119.5 31)" fill="#aab1bd" />
      <ellipse cx="80" cy="96" rx="40" ry="12" fill="#3f6b28" />
      <path d="M46 96 C52 80 66 74 80 74 C94 74 108 80 114 96 C100 102 60 102 46 96Z" fill="#5c8a3a" />
      <path d="M40 98 C32 150 54 190 80 190 C106 190 128 150 120 98 C104 108 56 108 40 98Z" fill="hsl(var(--primary))" />
      <path d="M44 128 C64 138 96 138 116 128" fill="none" stroke="#000" strokeWidth="7" strokeLinecap="round" opacity=".18" />
      <path d="M50 110 C46 134 54 160 66 174" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".22" />
      <Cara estado={estado} />
    </svg>
  );
}
