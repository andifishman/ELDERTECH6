import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Mail, Send } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { Aviso, Boton, Campo, mensajeDeError } from '@/components/ui';
import { solicitarAcceso, verificarEmail, type Institucion } from '@/services/acceso';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ESPERA_REENVIO = 45;

type Paso = 'email' | 'codigo' | 'solicitud' | 'enviada';

export function LoginPage() {
  const { pedirCodigo, verificarCodigo } = useAuth();
  const [paso, setPaso] = useState<Paso>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [espera, setEspera] = useState(0);

  // Datos del pedido de acceso (solo si el email no está dado de alta)
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [datos, setDatos] = useState({ nombre: '', apellido: '', telefono: '', residenteTexto: '', parentesco: '', organizacionId: '' });

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((e) => e - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const emailLimpio = email.trim().toLowerCase();

  /** Primer paso: ¿el email está dado de alta? Si sí, se manda el código; si no, se ofrece pedir acceso. */
  const continuar = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!EMAIL.test(emailLimpio) || trabajando) return;
    setTrabajando(true);
    setError(null);
    try {
      const { estado, instituciones: lista } = await verificarEmail(emailLimpio);
      if (estado === 'deshabilitado') {
        setError('El acceso de este email está deshabilitado. Comunicate con la residencia.');
        return;
      }
      if (estado === 'no_registrado') {
        setInstituciones(lista);
        setDatos((d) => ({ ...d, organizacionId: lista.length === 1 ? lista[0]!.id : '' }));
        setPaso('solicitud');
        return;
      }
      const { error: err } = await pedirCodigo(emailLimpio);
      if (err) return setError(err);
      setPaso('codigo');
      setCodigo('');
      setEspera(ESPERA_REENVIO);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setTrabajando(false);
    }
  };

  const reenviarCodigo = async () => {
    if (espera > 0 || trabajando) return;
    setTrabajando(true);
    setError(null);
    const { error: err } = await pedirCodigo(emailLimpio);
    setTrabajando(false);
    if (err) return setError(err);
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

  const pedirAcceso = async (e: FormEvent) => {
    e.preventDefault();
    if (!solicitudLista || trabajando) return;
    setTrabajando(true);
    setError(null);
    try {
      await solicitarAcceso({
        email: emailLimpio,
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        telefono: datos.telefono.trim() || null,
        residenteTexto: datos.residenteTexto.trim(),
        parentesco: datos.parentesco.trim() || null,
        ...(datos.organizacionId ? { organizacionId: datos.organizacionId } : {}),
      });
      setPaso('enviada');
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setTrabajando(false);
    }
  };

  const solicitudLista = !!datos.nombre.trim() && !!datos.apellido.trim() && !!datos.residenteTexto.trim() && (instituciones.length <= 1 || !!datos.organizacionId);
  const set = (campo: keyof typeof datos, valor: string) => setDatos((d) => ({ ...d, [campo]: valor }));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <img src="/icon-192.png" alt="" width={88} height={88} className="mx-auto mb-4 rounded-2xl" />
        <h1 className="text-2xl font-bold text-primary-800">ElderTech Familias</h1>
        <p className="mt-1 text-soft">Mirá cómo está tu familiar y comunicate con la residencia.</p>
      </div>

      {paso === 'email' && (
        <form onSubmit={continuar} className="space-y-4" noValidate>
          <Campo etiqueta="Tu email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@ejemplo.com" ayuda="Te mandamos un código por email. No hace falta contraseña." autoFocus />
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Boton type="submit" bloque cargando={trabajando} disabled={!EMAIL.test(emailLimpio)}>
            <Mail className="h-5 w-5" aria-hidden /> Continuar
          </Boton>
          <p className="text-center text-sm text-soft">Usá el email con el que te dio de alta la residencia. Si todavía no te dieron de alta, en el próximo paso podés pedir acceso.</p>
        </form>
      )}

      {paso === 'codigo' && (
        <form onSubmit={entrar} className="space-y-4" noValidate>
          <Aviso>Te mandamos un código a <strong>{emailLimpio}</strong>. Revisá también la carpeta de spam.</Aviso>
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
            <Boton variante="fantasma" bloque disabled={espera > 0 || trabajando} onClick={() => void reenviarCodigo()}>{espera > 0 ? `Pedir otro código (en ${espera} s)` : 'Pedir otro código'}</Boton>
            <Boton variante="fantasma" bloque onClick={() => { setPaso('email'); setError(null); }}>Cambiar el email</Boton>
          </div>
        </form>
      )}

      {paso === 'solicitud' && (
        <form onSubmit={pedirAcceso} className="space-y-4" noValidate>
          <Aviso tipo="error">El email <strong>{emailLimpio}</strong> todavía no está dado de alta en la residencia.</Aviso>
          <p>Si sos familiar de un residente, completá estos datos: le avisamos al personal para que revise tu pedido y te dé acceso.</p>
          <Campo etiqueta="Tu nombre" value={datos.nombre} maxLength={80} autoComplete="given-name" onChange={(e) => set('nombre', e.target.value)} />
          <Campo etiqueta="Tu apellido" value={datos.apellido} maxLength={80} autoComplete="family-name" onChange={(e) => set('apellido', e.target.value)} />
          <Campo etiqueta="¿De quién sos familiar?" value={datos.residenteTexto} maxLength={160} onChange={(e) => set('residenteTexto', e.target.value)} placeholder="Nombre y apellido del residente" />
          <Campo etiqueta="Parentesco (opcional)" value={datos.parentesco} maxLength={60} onChange={(e) => set('parentesco', e.target.value)} placeholder="Ej. hija, nieto, sobrino" />
          <Campo etiqueta="Teléfono (opcional)" type="tel" inputMode="tel" autoComplete="tel" value={datos.telefono} maxLength={40} onChange={(e) => set('telefono', e.target.value)} ayuda="Por si el personal necesita comunicarse con vos." />
          {instituciones.length > 1 && (
            <div className="space-y-1.5">
              <label htmlFor="residencia" className="block font-semibold">Residencia</label>
              <select id="residencia" value={datos.organizacionId} onChange={(e) => set('organizacionId', e.target.value)} className="min-h-12 w-full rounded-xl border-2 border-primary-200 bg-white px-3 text-base">
                <option value="">Elegí una residencia…</option>
                {instituciones.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </div>
          )}
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Boton type="submit" bloque cargando={trabajando} disabled={!solicitudLista}><Send className="h-5 w-5" aria-hidden /> Pedir acceso</Boton>
          <Boton variante="fantasma" bloque onClick={() => { setPaso('email'); setError(null); }}>Probar con otro email</Boton>
        </form>
      )}

      {paso === 'enviada' && (
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-700" aria-hidden />
          <h2 className="text-xl font-bold">Listo, avisamos a la residencia</h2>
          <p>El personal va a revisar tu pedido. Cuando lo aprueben te llega un email a <strong>{emailLimpio}</strong> para entrar (revisá también el spam).</p>
          <p className="text-sm text-soft">Si es urgente, comunicate con la residencia por teléfono.</p>
          <Boton variante="secundario" bloque onClick={() => { setPaso('email'); setError(null); }}>Volver</Boton>
        </div>
      )}
    </main>
  );
}
