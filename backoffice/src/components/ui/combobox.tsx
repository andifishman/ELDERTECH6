import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  id: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (id: string, label: string) => void;
  placeholder?: string;
  placeholderSearch?: string;
  onCrear?: (label: string) => Promise<string>;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Elegir…',
  placeholderSearch = 'Buscar o escribir…',
  onCrear,
  disabled,
}: ComboboxProps) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [creando, setCreando] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);

  const filtrados = options.filter((o) =>
    o.label.toLowerCase().includes(busqueda.toLowerCase()),
  );

  const exactMatch = options.some(
    (o) => o.label.toLowerCase() === busqueda.toLowerCase(),
  );

  // Cerrar al hacer click afuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false);
        setBusqueda('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const abrir = () => {
    if (disabled) return;
    setAbierto(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const seleccionar = (opt: ComboboxOption) => {
    onChange(opt.id, opt.label);
    setAbierto(false);
    setBusqueda('');
  };

  const crear = async () => {
    if (!busqueda.trim() || !onCrear) return;
    setCreando(true);
    try {
      const newId = await onCrear(busqueda.trim());
      onChange(newId, busqueda.trim());
      setAbierto(false);
      setBusqueda('');
    } catch {
      // onCrear es responsable de mostrar el mensaje de error al usuario
    } finally {
      setCreando(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={abrir}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors',
          'hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className={cn(selected ? 'text-foreground' : 'text-muted-foreground')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {abierto && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={placeholderSearch}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setAbierto(false); setBusqueda(''); }
                if (e.key === 'Enter') {
                  if (filtrados.length === 1) seleccionar(filtrados[0]);
                  else if (busqueda && !exactMatch && onCrear) crear();
                }
              }}
            />
          </div>

          <ul className="max-h-52 overflow-y-auto py-1">
            {filtrados.length === 0 && !busqueda && (
              <li className="px-3 py-2 text-sm text-muted-foreground">Sin opciones</li>
            )}
            {filtrados.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => seleccionar(opt)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                >
                  <Check className={cn('h-4 w-4 shrink-0 text-primary', value === opt.id ? 'opacity-100' : 'opacity-0')} />
                  {opt.label}
                </button>
              </li>
            ))}
            {busqueda && !exactMatch && onCrear && (
              <li>
                <button
                  type="button"
                  onClick={crear}
                  disabled={creando}
                  className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-sm text-primary hover:bg-primary/5"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  {creando ? 'Creando…' : `Crear "${busqueda}"`}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
