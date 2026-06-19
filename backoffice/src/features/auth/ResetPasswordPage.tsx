import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CheckCircle2, Leaf, Loader2, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notify } from '@/components/ui/toast';

interface FormValues {
  password: string;
  confirmPassword: string;
}

export function ResetPasswordPage() {
  const [listo, setListo] = useState(false);
  const [enlaceInvalido, setEnlaceInvalido] = useState(false);
  const [actualizado, setActualizado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>();

  useEffect(() => {
    const timer = setTimeout(() => setEnlaceInvalido(true), 8000);

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        clearTimeout(timer);
        setListo(true);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        clearTimeout(timer);
        setListo(true);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const onSubmit = async (values: FormValues) => {
    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setEnviando(false);
    if (error) {
      notify.error('Error al actualizar la contraseña', error.message);
      return;
    }
    setActualizado(true);
    await supabase.auth.signOut();
    setTimeout(() => navigate('/login', { replace: true }), 3000);
  };

  const brandPanel = (
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
          Elegí tu nueva contraseña
        </h1>
        <p className="mt-4 text-white/80">
          Usá una contraseña segura que no hayas utilizado antes.
        </p>
      </div>
      <p className="text-sm text-white/60">© {new Date().getFullYear()} ElderTech · Ledor Vador</p>
    </div>
  );

  if (actualizado) {
    return (
      <div className="grid min-h-screen lg:grid-cols-2">
        {brandPanel}
        <div className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-sm space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold tracking-tight">¡Contraseña actualizada!</h2>
            <p className="text-sm text-muted-foreground">
              Tu contraseña fue actualizada correctamente. En unos segundos serás redirigido al inicio de sesión.
            </p>
            <Link to="/login" className="text-sm text-primary hover:underline">
              Ir al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (enlaceInvalido && !listo) {
    return (
      <div className="grid min-h-screen lg:grid-cols-2">
        {brandPanel}
        <div className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-sm space-y-4 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Enlace inválido o expirado</h2>
            <p className="text-sm text-muted-foreground">
              El enlace de recuperación ya no es válido. Solicitá uno nuevo desde la pantalla de login.
            </p>
            <Link to="/recuperar-contrasena" className="text-sm text-primary hover:underline">
              Solicitar nuevo enlace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!listo) {
    return (
      <div className="grid min-h-screen lg:grid-cols-2">
        {brandPanel}
        <div className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-sm space-y-4 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verificando enlace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {brandPanel}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white">
              <Leaf className="h-6 w-6" />
            </div>
            <p className="text-xl font-extrabold">ElderTech Backoffice</p>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">Nueva contraseña</h2>
          <p className="mt-1 text-sm text-muted-foreground">Elegí una contraseña segura para tu cuenta.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nueva contraseña</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="pl-9"
                  {...register('password', {
                    required: 'Ingresá tu nueva contraseña',
                    minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                  })}
                />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="pl-9"
                  {...register('confirmPassword', {
                    required: 'Confirmá tu contraseña',
                    validate: (val) => val === watch('password') || 'Las contraseñas no coinciden',
                  })}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={enviando}>
              {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Actualizar contraseña'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
