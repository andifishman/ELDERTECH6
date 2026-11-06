import { useEffect, useState, type FormEvent } from 'react';
import { Mail } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { Aviso, Boton, Campo } from '@/components/ui';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ESPERA_REENVIO = 45;

export function LoginPage() {
  const { pedirCodigo, verificarCodigo } = useAuth();
  const [paso, setPaso] = useState<'email' | 'codigo'>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((e) => e - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const emailLimpio = email.trim().toLowerCase();

  const enviarCodigo = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!EMAIL.test(emailLimpio) || trabajando) return;
    setTrabajando(true);
    setError(null);
    const { error: err } = await pedirCodigo(emailLimpio);
    setTrabajando(false);
    if (err) return setError(err);
    setPaso('codigo');
    setCodigo('');
    setEspera(ESPERA_REENVIO);
  };

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    if (codigo.length < 6 || trabajando) return;
    setTrabajando(true);
    setError(null);
    const { error: err } = await verificarCodigo(emailLimpio, codigo);
    setTrabajando(false);
    if (err) setError(err);
    // Si salió bien, AuthContext detecta la sesión y la app pasa sola al Inicio.
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <img src="/icon-192.png" alt="" width={88} height={88} className="mx-auto mb-4 rounded-2xl" />
        <h1 className="text-2xl font-bold text-primary-800">ElderTech Familias</h1>
        <p className="mt-1 text-soft">Mirá cómo está tu familiar y comunicate con la residencia.</p>
      </div>

      {paso === 'email' ? (
        <form onSubmit={enviarCodigo} className="space-y-4" noValidate>
          <Campo etiqueta="Tu email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@ejemplo.com" ayuda="Te mandamos un código por email. No hace falta contraseña." autoFocus />
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Boton type="submit" bloque cargando={trabajando} disabled={!EMAIL.test(emailLimpio)}>
            <Mail className="h-5 w-5" aria-hidden /> Enviarme el código
          </Boton>
          <p className="text-center text-sm text-soft">¿Primera vez? Usá el email con el que te dio de alta la residencia. Si no te llega nada, consultale a la residencia.</p>
        </form>
      ) : (
        <form onSubmit={entrar} className="space-y-4" noValidate>
          <Aviso>Si <strong>{emailLimpio}</strong> está dado de alta en la residencia, te mandamos un código. Revisá también la carpeta de spam.</Aviso>
          <Campo
            etiqueta="Código del email"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="123456"
            className="text-center text-2xl tracking-widest"
            autoFocus
          />
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Boton type="submit" bloque cargando={trabajando} disabled={codigo.length < 6}>Entrar</Boton>
          <div className="flex flex-col gap-2">
            <Boton variante="fantasma" bloque disabled={espera > 0 || trabajando} onClick={() => void enviarCodigo()}>{espera > 0 ? `Pedir otro código (en ${espera} s)` : 'Pedir otro código'}</Boton>
            <Boton variante="fantasma" bloque onClick={() => { setPaso('email'); setError(null); }}>Cambiar el email</Boton>
          </div>
        </form>
      )}
    </main>
  );
}
