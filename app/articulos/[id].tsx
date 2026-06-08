// Pantalla de detalle de tutorial — layout fijo: media arriba, info+controles abajo
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { AppHeader } from '@/components/common/AppHeader';
import { useAuth } from '@/context/AuthContext';
import {
  useTutorialDetalle,
  usePasosTutorial,
  useProgresoTutorial,
} from '@/hooks/useTutoriales';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { formatearDuracion } from '@/services/tutorialesService';
import { hablar } from '@/utils/tts';

const { width: SCREEN_W } = Dimensions.get('window');
// Altura fija 16:9 — el video siempre llena este espacio
const VIDEO_H = Math.round(SCREEN_W * 9 / 16);

export default function TutorialDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const residenteId = profile?.residente?.id ?? null;

  const { data: tutorial, isLoading } = useTutorialDetalle(id);
  const { data: pasos = [] } = usePasosTutorial(
    tutorial?.formato === 'guia' ? id : null,
  );
  const progreso = useProgresoTutorial(
    residenteId ?? '',
    id ?? '',
    tutorial?.categoria_id ?? null,
  );

  const videoRef = useRef<Video>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [progresoPct, setProgresoPct] = useState(0);
  // Dimensiones reales del video — se actualizan cuando carga
  const [videoH, setVideoH] = useState(VIDEO_H);
  const guardarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pasoActual, setPasoActual] = useState(0);

  // Configurar modo audio para video (sin grabar, reproduce en silencioso iOS)
  useEffect(() => {
    if (tutorial?.formato === 'video') {
      import('expo-av').then(({ Audio }) => {
        Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
        }).catch(() => null);
      });
    }
  }, [tutorial?.formato]);

  useEffect(() => {
    if (residenteId && id) progreso.registrar.mutate();
  }, [residenteId, id]);

  const handlePlaybackStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      setReproduciendo(status.isPlaying ?? false);

      // Calcular altura real según aspect ratio del video
      if (status.naturalSize) {
        const { width: vw, height: vh } = status.naturalSize;
        if (vw && vh) {
          setVideoH(Math.round(SCREEN_W * vh / vw));
        }
      }

      if (status.durationMillis) {
        setProgresoPct((status.positionMillis / status.durationMillis) * 100);
      }
      if (status.positionMillis && residenteId) {
        if (guardarTimer.current) clearTimeout(guardarTimer.current);
        guardarTimer.current = setTimeout(() => {
          progreso.guardarProgreso.mutate(Math.floor(status.positionMillis / 1000));
        }, 10000);
      }
      if (
        status.durationMillis &&
        status.positionMillis / status.durationMillis >= 0.9 &&
        !tutorial?.progreso?.completado
      ) {
        progreso.marcarCompletado.mutate();
      }
    },
    [residenteId, tutorial?.progreso?.completado],
  );

  const handleFavorito = useCallback(() => {
    if (!residenteId) return;
    const nuevo = !(tutorial?.progreso?.favorito ?? false);
    progreso.toggleFavorito.mutate(nuevo);
    hablar(nuevo ? 'Agregado a favoritos' : 'Quitado de favoritos');
  }, [residenteId, tutorial?.progreso?.favorito]);

  if (isLoading || !tutorial) {
    return (
      <View style={styles.flex}>
        <AppHeader titulo="Tutorial" mostrarVolver backgroundColor={Colors.brand.purple} />
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={Colors.brand.purple} />
        </View>
      </View>
    );
  }

  const esVideo = tutorial.formato === 'video';
  const esFavorito = tutorial.progreso?.favorito ?? false;
  const completado = tutorial.progreso?.completado ?? false;
  const duracion = formatearDuracion(tutorial.duracion_segundos);
  const paso = pasos[pasoActual];
  const esUltimoPaso = pasoActual === pasos.length - 1;

  return (
    <View style={[styles.flex, { paddingBottom: insets.bottom }]}>
      <AppHeader
        titulo={tutorial.titulo}
        mostrarVolver
        backgroundColor={Colors.brand.purple}
        textoHablar={`Tutorial: ${tutorial.titulo}. ${tutorial.descripcion ?? ''}`}
      />

      {/* ══════════ ZONA MEDIA ══════════ */}
      <View style={esVideo
        ? [styles.videoZona, { height: videoH }]
        : styles.guiaZona
      }>

        {/* ── VIDEO con controles nativos ── */}
        {esVideo && tutorial.url_video && (
          <>
            <Video
              ref={videoRef}
              source={{ uri: tutorial.url_video }}
              style={{ width: SCREEN_W, height: videoH }}
              resizeMode={ResizeMode.CONTAIN}
              onPlaybackStatusUpdate={handlePlaybackStatus}
              useNativeControls
              shouldPlay={false}
              isLooping={false}
              progressUpdateIntervalMillis={500}
            />
            {/* Barra de progreso fina debajo */}
            <View style={styles.videoBarra}>
              <View style={[styles.videoBarraFill, { width: `${progresoPct}%` as any }]} />
            </View>
          </>
        )}

        {/* ── GUÍA FOTOGRÁFICA ── */}
        {!esVideo && (
          <>
            {paso?.imagen_url ? (
              <Image
                source={{ uri: paso.imagen_url }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.guiaPlaceholder}>
                <Text style={styles.guiaPlaceholderEmoji}>📷</Text>
              </View>
            )}
            <View style={styles.contadorBadge}>
              <Text style={styles.contadorTexto}>
                {pasoActual + 1} / {pasos.length}
              </Text>
            </View>
          </>
        )}

        {completado && (
          <View style={styles.completadoBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.completadoTexto}>Completado</Text>
          </View>
        )}
      </View>

      {/* ══════════ ZONA INFO — fija abajo ══════════ */}
      <View style={styles.infoZona}>

        <View style={styles.tituloRow}>
          <Text style={styles.titulo} numberOfLines={2}>{tutorial.titulo}</Text>
          <TouchableOpacity
            style={styles.favBtn}
            onPress={handleFavorito}
            accessibilityLabel={esFavorito ? 'Quitar favorito' : 'Guardar favorito'}
            accessibilityRole="button"
          >
            <Ionicons
              name={esFavorito ? 'star' : 'star-outline'}
              size={30}
              color={esFavorito ? '#FFC107' : Colors.ui.border}
            />
          </TouchableOpacity>
        </View>

        {!esVideo && paso ? (
          <>
            {paso.titulo ? <Text style={styles.pasoTitulo}>{paso.titulo}</Text> : null}
            {paso.descripcion ? (
              <Text style={styles.pasoDesc} numberOfLines={3}>{paso.descripcion}</Text>
            ) : null}
          </>
        ) : (
          tutorial.descripcion ? (
            <Text style={styles.pasoDesc} numberOfLines={2}>{tutorial.descripcion}</Text>
          ) : null
        )}

        <Text style={styles.formatoTexto}>
          {esVideo
            ? `🎥 Video${duracion ? ` · ${duracion}` : ''}`
            : `📷 Guía · ${pasos.length} pasos`}
        </Text>

        {/* Controles guía */}
        {!esVideo && pasos.length > 0 && (
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnAnterior, pasoActual === 0 && styles.navBtnDisabled]}
              onPress={() => setPasoActual((p) => Math.max(0, p - 1))}
              disabled={pasoActual === 0}
              accessibilityLabel="Paso anterior"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={22} color={Colors.text.onDark} />
              <Text style={styles.navTexto}>Anterior</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnSiguiente]}
              onPress={() => {
                if (esUltimoPaso) {
                  progreso.marcarCompletado.mutate();
                  hablar('¡Muy bien! Terminaste el tutorial.');
                  router.back();
                } else {
                  setPasoActual((p) => p + 1);
                }
              }}
              accessibilityLabel={esUltimoPaso ? 'Finalizar' : 'Siguiente paso'}
              accessibilityRole="button"
            >
              <Text style={styles.navTexto}>{esUltimoPaso ? '¡Listo!' : 'Siguiente'}</Text>
              <Ionicons
                name={esUltimoPaso ? 'checkmark-circle' : 'arrow-forward'}
                size={22}
                color={Colors.text.onDark}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Dots guía */}
        {!esVideo && pasos.length > 1 && (
          <View style={styles.dotsRow}>
            {pasos.map((_, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.dot, i === pasoActual && styles.dotActivo]}
                onPress={() => setPasoActual(i)}
                accessibilityLabel={`Paso ${i + 1}`}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.ui.background },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Zona video: altura dinámica (se calcula en handlePlaybackStatus)
  videoZona: {
    width: SCREEN_W,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  // videoNativo ya no se usa — se pasa height inline
  videoNativo: {
    width: SCREEN_W,
    height: VIDEO_H,
  },

  // Zona guía: ocupa el espacio restante
  guiaZona: {
    flex: 1,
    backgroundColor: '#E8EAF6',
    overflow: 'hidden',
    position: 'relative',
  },

  videoBarra: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  videoBarraFill: {
    height: 4,
    backgroundColor: Colors.brand.purple,
  },

  guiaPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guiaPlaceholderEmoji: { fontSize: 80 },

  contadorBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Spacing.radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  contadorTexto: {
    color: '#fff',
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },

  completadoBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Spacing.radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  completadoTexto: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: '#388E3C',
  },

  infoZona: {
    backgroundColor: Colors.ui.surface,
    paddingHorizontal: Spacing.screen.horizontal,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.ui.border,
  },

  tituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  titulo: {
    flex: 1,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.heavy,
    color: Colors.text.primary,
    lineHeight: 30,
  },
  favBtn: {
    width: Spacing.touch.min,
    height: Spacing.touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasoTitulo: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  pasoDesc: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  formatoTexto: {
    fontSize: Typography.size.sm,
    color: Colors.text.hint,
    fontWeight: Typography.weight.medium,
  },

  navRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Spacing.radius.xl,
    paddingVertical: Spacing.lg,
    minHeight: Spacing.touch.comfortable,
  },
  navBtnAnterior: {
    backgroundColor: Colors.brand.purple,
    opacity: 0.75,
  },
  navBtnSiguiente: {
    backgroundColor: Colors.brand.greenMedium,
  },
  navBtnDisabled: { opacity: 0.3 },
  navTexto: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.ui.border,
  },
  dotActivo: {
    width: 24,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.brand.purple,
  },
});
