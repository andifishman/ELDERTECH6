import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notify } from '@/components/ui/toast';
import { iniciales } from '@/lib/utils';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
}

export function EditarPerfilDialog({ abierto, onCerrar }: Props) {
  const { perfil, actualizarPerfil } = useAuth();
  const [nombre, setNombre] = useState(perfil?.nombre_completo ?? '');
  const [avatarUrl, setAvatarUrl] = useState(perfil?.avatar_url ?? '');
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  const subirAvatar = async (archivo: File) => {
    setSubiendoAvatar(true);
    try {
      const ext = archivo.name.split('.').pop() ?? 'jpg';
      const nombre_archivo = `avatars/${perfil?.id ?? 'user'}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('tutorial-images')
        .upload(nombre_archivo, archivo, { cacheControl: '3600', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('tutorial-images').getPublicUrl(nombre_archivo);
      setAvatarUrl(data.publicUrl);
    } catch {
      notify.error('No se pudo subir la foto');
    } finally {
      setSubiendoAvatar(false);
    }
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await actualizarPerfil({
        nombre_completo: nombre.trim() || undefined,
        avatar_url: avatarUrl || undefined,
      });
      notify.success('Perfil actualizado');
      onCerrar();
    } catch {
      notify.error('No se pudo guardar el perfil');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="relative">
            <Avatar className="h-24 w-24">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
              <AvatarFallback className="text-2xl">{iniciales(nombre || perfil?.nombre_completo)}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              disabled={subiendoAvatar}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-white shadow-md hover:bg-primary/90 transition-colors"
            >
              {subiendoAvatar
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Camera className="h-4 w-4" />
              }
            </button>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) subirAvatar(f); }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Tocá la cámara para cambiar la foto</p>
        </div>

        {/* Campos */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre completo</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre completo"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={perfil?.email ?? ''} disabled className="text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Input value={perfil?.rol ?? ''} disabled className="capitalize text-muted-foreground" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando || subiendoAvatar}>
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
