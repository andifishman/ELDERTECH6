import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Leaf, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notify } from '@/components/ui/toast';

interface FormValues {
  email: string;
}

export function RecuperarContrasenaPage() {
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();

  const onSubmit = async (values: FormValues) => {
    setEnviando(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(values.email.trim(), { redirectTo });
    setEnviando(false);
    if (error) {
      notify.error('Error al enviar el correo', error.message);
      return;
    }
    setEmailEnviado(values.email.trim());
    setEnviado(true);
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
          Recuperá el acceso a tu cuenta
        </h1>
        <p className="mt-4 text-white/80">
          Te enviaremos un correo con las instrucciones para restablecer tu contraseña.
        </p>
      </div>
      <p className="text-sm text-white/60">© {new Date().getFullYear()} ElderTech · Ledor Vador</p>
    </div>
  );

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

          {enviado ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Revisá tu correo</h2>
              <p className="text-sm text-muted-foreground">
                Si <strong>{emailEnviado}</strong> está registrado, recibirás un mensaje con el enlace
                para restablecer tu contraseña. Revisá también la carpeta de spam.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold tracking-tight">Recuperar contraseña</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ingresá tu Gmail y te enviaremos las instrucciones.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Gmail</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="tu@gmail.com"
                      className="pl-9"
                      {...register('email', { required: 'Ingresá tu Gmail' })}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={enviando}>
                  {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enviar correo'}
                </Button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al inicio de sesión
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
