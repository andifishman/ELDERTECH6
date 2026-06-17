// ========================================
// PANTALLA: LoginPage
// DESCRIPCIÓN:
// Inicio de sesión del backoffice con Supabase Auth.
// Diseño de marca (verde ElderTech) en panel lateral +
// formulario validado con react-hook-form.
// ========================================
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Leaf, Loader2, Lock, Mail } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notify } from '@/components/ui/toast';

interface FormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const { session, signIn, cargando } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [enviando, setEnviando] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();

  // si ya hay sesión, no mostramos el login
  if (!cargando && session) {
    const destino = (location.state as { from?: Location })?.from?.pathname ?? '/';
    return <Navigate to={destino} replace />;
  }

  const onSubmit = async (values: FormValues) => {
    setEnviando(true);
    const { error } = await signIn(values.email.trim(), values.password);
    setEnviando(false);
    if (error) {
      notify.error('No pudimos iniciar sesión', 'Verificá tu email y contraseña.');
      return;
    }
    notify.success('¡Bienvenido!');
    navigate('/', { replace: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* panel de marca */}
      <div className="relative hidden flex-col justify-between bg-primary-600 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            <Leaf className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-extrabold">ElderTech</p>
            <p className="text-sm text-white/70">Backoffice</p>
          </div>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-extrabold leading-tight">
            Gestioná la experiencia de tus residentes
          </h1>
          <p className="mt-4 text-white/80">
            Horarios, tutoriales, asistente IA y usuarios. Todo lo que cambies acá se refleja al
            instante en la app de los residentes.
          </p>
        </div>
        <p className="text-sm text-white/60">© {new Date().getFullYear()} ElderTech · Ledor Vador</p>
      </div>

      {/* formulario */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white">
              <Leaf className="h-6 w-6" />
            </div>
            <p className="text-xl font-extrabold">ElderTech Backoffice</p>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-muted-foreground">Ingresá con tu cuenta de administrador.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@eldertech.com"
                  className="pl-9"
                  {...register('email', { required: 'Ingresá tu email' })}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9"
                  {...register('password', { required: 'Ingresá tu contraseña' })}
                />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={enviando}>
              {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
