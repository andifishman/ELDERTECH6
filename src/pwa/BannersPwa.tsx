// Banners de la versión web: (1) "hay una versión nueva" y (2) "instalá ElderTech en tu pantalla de inicio".
// Se monta una vez en app/_layout.tsx; en Android/iOS (app nativa) no renderiza nada.
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { aplicarActualizacion, useHayActualizacionWeb } from './serviceWorker';
import { esIOS, estaInstalada } from './avisosWeb';

const CLAVE_DESCARTADO = 'eldertech.instalar.descartadoHasta';
const DIAS_SIN_MOLESTAR = 14;

interface EventoInstalar extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function instalacionDescartada(): boolean {
  try {
    return Number(window.localStorage.getItem(CLAVE_DESCARTADO) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function descartarInstalacion(): void {
  try {
    window.localStorage.setItem(CLAVE_DESCARTADO, String(Date.now() + DIAS_SIN_MOLESTAR * 86_400_000));
  } catch {
    // sin localStorage (modo privado): el banner reaparecerá, no es grave
  }
}

function esMovil(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

export function BannersPwa(): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const hayActualizacion = useHayActualizacionWeb();
  const [eventoInstalar, setEventoInstalar] = useState<EventoInstalar | null>(null);
  const [mostrarInstalar, setMostrarInstalar] = useState(false);
  const [verPasosIOS, setVerPasosIOS] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    if (estaInstalada() || instalacionDescartada() || !esMovil()) return undefined;

    if (esIOS()) {
      // Safari de iPhone no dispara `beforeinstallprompt`: solo se puede explicar el camino manual.
      setMostrarInstalar(true);
      return undefined;
    }
    const alPrompt = (e: Event) => {
      e.preventDefault(); // guardamos el evento para dispararlo desde nuestro botón grande
      setEventoInstalar(e as EventoInstalar);
      setMostrarInstalar(true);
    };
    const alInstalar = () => setMostrarInstalar(false);
    window.addEventListener('beforeinstallprompt', alPrompt);
    window.addEventListener('appinstalled', alInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', alPrompt);
      window.removeEventListener('appinstalled', alInstalar);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (eventoInstalar) {
      await eventoInstalar.prompt();
      const { outcome } = await eventoInstalar.userChoice;
      if (outcome === 'accepted') setMostrarInstalar(false);
      setEventoInstalar(null);
    } else {
      setVerPasosIOS(true);
    }
  }, [eventoInstalar]);

  const cerrarInstalar = useCallback(() => {
    descartarInstalacion();
    setMostrarInstalar(false);
  }, []);

  if (Platform.OS !== 'web') return null;

  const separacionInferior = Math.max(insets.bottom, Spacing.md);

  return (
    <>
      {hayActualizacion ? (
        <View style={[estilos.barra, { paddingBottom: separacionInferior }]} accessibilityRole="alert">
          <Text style={estilos.texto}>Hay una versión nueva de ElderTech.</Text>
          <TouchableOpacity style={estilos.boton} onPress={aplicarActualizacion} accessibilityRole="button">
            <Text style={estilos.botonTexto}>Actualizar ahora</Text>
          </TouchableOpacity>
        </View>
      ) : mostrarInstalar ? (
        <View style={[estilos.barra, { paddingBottom: separacionInferior }]}>
          <Text style={estilos.texto}>Instalá ElderTech en tu pantalla de inicio para abrirla como una aplicación.</Text>
          <View style={estilos.fila}>
            <TouchableOpacity style={estilos.boton} onPress={instalar} accessibilityRole="button">
              <Text style={estilos.botonTexto}>Instalar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[estilos.boton, estilos.botonSecundario]} onPress={cerrarInstalar} accessibilityRole="button">
              <Text style={estilos.botonTexto}>Ahora no</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <Modal transparent animationType="fade" visible={verPasosIOS} onRequestClose={() => setVerPasosIOS(false)}>
        <View style={estilos.fondoModal}>
          <View style={estilos.tarjeta}>
            <Text style={estilos.tituloModal}>Cómo instalar ElderTech</Text>
            <Text style={estilos.paso}>1. Tocá el botón <Text style={estilos.negrita}>Compartir</Text> de Safari (el cuadrado con una flecha hacia arriba, abajo en la pantalla).</Text>
            <Text style={estilos.paso}>2. Bajá en la lista y tocá <Text style={estilos.negrita}>Agregar a inicio</Text>.</Text>
            <Text style={estilos.paso}>3. Tocá <Text style={estilos.negrita}>Agregar</Text>, arriba a la derecha.</Text>
            <Text style={estilos.paso}>4. Abrí ElderTech desde el ícono nuevo en tu pantalla de inicio.</Text>
            <TouchableOpacity style={estilos.boton} onPress={() => setVerPasosIOS(false)} accessibilityRole="button">
              <Text style={estilos.botonTexto}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  // En el flujo normal (NO flotando encima): un banner superpuesto taparía el botón "Ingresar" o el
  // botón "Volver" del pie de cada pantalla — para esta población eso es peor que perder unos píxeles.
  barra: {
    alignSelf: 'stretch',
    backgroundColor: Colors.brand.greenDark,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.screen.horizontal,
    gap: Spacing.sm,
  },
  texto: { fontSize: Typography.size.md, color: '#FFFFFF', lineHeight: 24 },
  fila: { flexDirection: 'row', gap: Spacing.sm },
  boton: {
    flex: 1,
    minHeight: Spacing.touch.comfortable,
    borderRadius: Spacing.radius.lg,
    backgroundColor: '#2E7D32',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  botonSecundario: { backgroundColor: 'transparent' },
  botonTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: '#FFFFFF' },
  fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: Spacing.screen.horizontal },
  tarjeta: { width: '100%', maxWidth: 440, backgroundColor: '#FFFFFF', borderRadius: Spacing.radius.xl, padding: Spacing.xl, gap: Spacing.md },
  tituloModal: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  paso: { fontSize: Typography.size.md, color: Colors.text.primary, lineHeight: 26 },
  negrita: { fontWeight: Typography.weight.bold },
});
