// Detalle de tutorial — replica el Claude Design de ElderTech:
//  · Video: reproductor + info + botón "Ver los pasos uno por uno"
//  · Pasos: cabecera de progreso + paso (foto grande, instrucción, tip) + nav + pantalla "¡Muy bien!"
// Todo tutorial (video o guía) tiene pasos: el video es la explicación, los pasos el detalle.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { AppHeader } from '@/components/common/AppHeader';
import { TutorialImage } from '@/components/tutoriales/TutorialImage';
import { useAuth } from '@/context/AuthContext';
import {
  useTutorialDetalle,
  usePasosTutorial,
  useProgresoTutorial,
  useTutorialesRelacionados,
} from '@/hooks/useTutoriales';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { formatearDuracion } from '@/services/tutorialesService';
import { hablar } from '@/utils/tts';

const { width: SCREEN_W } = Dimensions.get('window');
const VIDEO_W = SCREEN_W - Spacing.screen.horizontal * 2;
const VIDEO_H = Math.round(VIDEO_W * 9 / 16);

export default function TutorialDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const residenteId = profile?.residente?.id ?? null;

  const { data: tutorial, isLoading, isError, refetch } = useTutorialDetalle(id, residenteId);
  const { data: pasos = [] } = usePasosTutorial(id); // pasos para video y guía
  const progreso = useProgresoTutorial(
    residenteId ?? '',
    id ?? '',
    tutorial?.categoria_id ?? null,
  );
  const { data: relacionados = [] } = useTutorialesRelacionados(
    tutorial?.id ?? null,
    tutorial?.categoria_id ?? null,
  );

  const videoRef = useRef<Video>(null);
  const [progresoPct, setProgresoPct] = useState(0);
  // Para videos: arranca mostrando el video; el botón pasa a la vista de pasos.
  const [verPasos, setVerPasos] = useState(false);
  // pasoActual va de 0..pasos.length; === pasos.length significa "terminado".
  const [pasoActual, setPasoActual] = useState(0);

  const guardarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completadoRef = useRef(false);

  useEffect(() => {
    return () => {
      if (guardarTimer.current) clearTimeout(guardarTimer.current);
    };
  }, []);

  // Al cambiar de tutorial (mismo componente, ruta dinámica) reseteamos el estado.
  useEffect(() => {
    setVerPasos(false);
    setPasoActual(0);
    setProgresoPct(0);
    completadoRef.current = false;
  }, [id]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residenteId, id]);

  const handlePlaybackStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
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
        !completadoRef.current &&
        !tutorial?.progreso?.completado
      ) {
        completadoRef.current = true;
        progreso.marcarCompletado.mutate();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [residenteId, tutorial?.progreso?.completado],
  );

  const handleFavorito = useCallback(() => {
    if (!residenteId) return;
    const nuevo = !(tutorial?.progreso?.favorito ?? false);
    progreso.toggleFavorito.mutate(nuevo);
    hablar(nuevo ? 'Agregado a favoritos' : 'Quitado de favoritos');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residenteId, tutorial?.progreso?.favorito]);

  const irATutorial = useCallback(
    (otroId: string) => {
      setVerPasos(false);
      setPasoActual(0);
      router.push({ pathname: '/articulos/[id]', params: { id: otroId } });
    },
    [router],
  );

  if (isError) {
    return (
      <View style={styles.flex}>
        <AppHeader titulo="Tutorial" mostrarVolver backgroundColor={Colors.brand.purple} />
        <View style={styles.centrado}>
          <Ionicons name="cloud-offline-outline" size={56} color={Colors.text.hint} />
          <Text style={styles.estadoTitulo}>No pudimos cargar este tutorial</Text>
          <Text style={styles.estadoTexto}>Revisá tu conexión a internet e intentá de nuevo.</Text>
          <TouchableOpacity
            style={styles.btnReintentar}
            onPress={() => refetch()}
            accessibilityLabel="Reintentar"
            accessibilityRole="button"
          >
            <Text style={styles.btnReintentarTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
  const duracion = formatearDuracion(tutorial.duracion_segundos);
  const aprenderas = tutorial.lo_que_aprenderas ?? [];
  const tienePasos = pasos.length > 0;

  const FavBtn = (
    <TouchableOpacity
      style={styles.favBtn}
      onPress={handleFavorito}
      accessibilityLabel={esFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      accessibilityRole="button"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name={esFavorito ? 'star' : 'star-outline'} size={28} color={esFavorito ? '#FFC107' : Colors.ui.border} />
    </TouchableOpacity>
  );

  // ═══════════════════════ VISTA VIDEO ═══════════════════════
  if (esVideo && !verPasos) {
    return (
      <View style={[styles.flex, { paddingBottom: insets.bottom }]}>
        <AppHeader
          titulo="Tutorial"
          mostrarVolver
          backgroundColor={Colors.brand.purple}
          textoHablar={`Video. ${tutorial.titulo}. ${tutorial.descripcion ?? ''}`}
        />
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <View style={styles.videoCard}>
            {tutorial.url_video ? (
              <Video
                ref={videoRef}
                source={{ uri: tutorial.url_video }}
                style={{ width: VIDEO_W, height: VIDEO_H }}
                resizeMode={ResizeMode.CONTAIN}
                onPlaybackStatusUpdate={handlePlaybackStatus}
                useNativeControls
                shouldPlay={false}
                progressUpdateIntervalMillis={500}
              />
            ) : (
              <View style={[styles.videoVacio, { width: VIDEO_W, height: VIDEO_H }]}>
                <Ionicons name="videocam-outline" size={48} color="rgba(255,255,255,0.7)" />
                <Text style={styles.videoVacioTexto}>Video no disponible</Text>
              </View>
            )}
            <View style={styles.videoBarra}>
              <View style={[styles.videoBarraFill, { width: `${progresoPct}%` as `${number}%` }]} />
            </View>
          </View>

          <View style={styles.pill}>
            <Ionicons name="play" size={13} color={Colors.brand.purple} />
            <Text style={styles.pillTexto}>VIDEO EXPLICATIVO{duracion ? ` · ${duracion}` : ''}</Text>
          </View>

          <View style={styles.tituloRow}>
            <Text style={styles.titulo}>{tutorial.titulo}</Text>
            {FavBtn}
          </View>

          {tutorial.descripcion ? <Text style={styles.descripcion}>{tutorial.descripcion}</Text> : null}

          {tienePasos ? (
            <Text style={styles.ayuda}>
              Mirá el video y, si querés, después seguí los pasos uno por uno.
            </Text>
          ) : null}

          {aprenderas.length > 0 && (
            <View style={styles.aprenderasCard}>
              <View style={styles.aprenderasHeader}>
                <Text style={styles.aprenderasTitulo}>Qué vas a aprender</Text>
                <TouchableOpacity
                  onPress={() => hablar(`Qué vas a aprender. ${aprenderas.join('. ')}`)}
                  accessibilityLabel="Escuchar qué vas a aprender"
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="volume-medium-outline" size={22} color={Colors.brand.purple} />
                </TouchableOpacity>
              </View>
              {aprenderas.map((item, i) => (
                <View key={i} style={styles.aprenderasItem}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.brand.greenMedium} />
                  <Text style={styles.aprenderasTexto}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {relacionados.length > 0 && <Relacionados items={relacionados} onPress={irATutorial} />}
        </ScrollView>

        {tienePasos && (
          <View style={styles.footerNav}>
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnPrimary, styles.navBtnFull]}
              onPress={() => {
                setPasoActual(0);
                setVerPasos(true);
              }}
              accessibilityLabel="Ver los pasos uno por uno"
              accessibilityRole="button"
            >
              <Text style={styles.navTextoPrimary}>Ver los pasos uno por uno</Text>
              <Ionicons name="chevron-forward" size={22} color={Colors.text.onDark} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ═══════════════════════ VISTA PASOS ═══════════════════════
  const total = pasos.length;
  const terminado = pasoActual >= total && total > 0;
  const paso = !terminado ? pasos[pasoActual] : null;
  const progresoGuia = total === 0 ? 0 : terminado ? 1 : pasoActual / total;

  const escucharPaso = () => {
    if (!paso) {
      hablar('¡Muy bien! Completaste el tutorial.');
      return;
    }
    hablar(`Paso ${pasoActual + 1} de ${total}. ${paso.descripcion ?? ''} ${paso.tip ?? ''}`);
  };

  return (
    <View style={[styles.flex, { paddingBottom: insets.bottom }]}>
      <AppHeader
        titulo="Tutorial"
        mostrarVolver
        backgroundColor={Colors.brand.purple}
        textoHablar={`${tutorial.titulo}. ${tutorial.descripcion ?? ''}`}
      />

      {/* Cabecera de progreso — fija */}
      <View style={styles.progresoHeader}>
        <View style={styles.progresoRow}>
          <View style={styles.miniThumb}>
            <TutorialImage
              uri={tutorial.thumbnail_url}
              fallbackSeed={tutorial.id}
              categoria={tutorial.categoria?.nombre}
              iconSize={22}
              style={styles.miniThumbImg}
            />
          </View>
          <View style={styles.progresoInfo}>
            <Text style={styles.progresoTitulo} numberOfLines={1}>{tutorial.titulo}</Text>
            <Text style={styles.progresoPaso}>
              {terminado ? '¡Completado!' : `Paso ${pasoActual + 1} de ${total}`}
            </Text>
          </View>
          {esVideo ? (
            <TouchableOpacity
              style={styles.volverVideoBtn}
              onPress={() => setVerPasos(false)}
              accessibilityLabel="Volver al video"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="play" size={18} color={Colors.brand.purple} />
            </TouchableOpacity>
          ) : (
            FavBtn
          )}
        </View>
        <View style={styles.progresoTrack}>
          <View style={[styles.progresoFill, { width: `${progresoGuia * 100}%` as `${number}%` }]} />
        </View>
      </View>

      {/* Contenido del paso — scrolleable */}
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {!terminado && paso ? (
          <>
            <View style={styles.stepPhotoWrap}>
              <TutorialImage
                uri={paso.imagen_url}
                fallbackSeed={`${tutorial.id}-${paso.orden}`}
                categoria={tutorial.categoria?.nombre}
                iconSize={56}
                style={StyleSheet.absoluteFillObject}
                accessibilityLabel={paso.titulo ?? `Paso ${pasoActual + 1}`}
              />
              {paso.titulo ? (
                <View style={styles.stepCaptionBand}>
                  <Text style={styles.stepCaption} numberOfLines={1}>{paso.titulo}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNumero}>
                <Text style={styles.stepNumeroTexto}>{pasoActual + 1}</Text>
              </View>
              <View style={styles.stepTextoCol}>
                {paso.descripcion ? <Text style={styles.stepInstr}>{paso.descripcion}</Text> : null}
                {paso.tip ? (
                  <View style={styles.tipBox}>
                    <Ionicons name="bulb-outline" size={20} color={Colors.tutoriales.amber} style={styles.tipIcono} />
                    <Text style={styles.tipTexto}>{paso.tip}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              style={styles.escucharBtn}
              onPress={escucharPaso}
              accessibilityLabel="Escuchar este paso"
              accessibilityRole="button"
            >
              <Ionicons name="volume-medium" size={22} color={Colors.brand.purple} />
              <Text style={styles.escucharTexto}>Escuchar este paso</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.finCard}>
            <View style={styles.finCheck}>
              <Ionicons name="checkmark" size={56} color={Colors.text.onDark} />
            </View>
            <Text style={styles.finTitulo}>¡Muy bien!</Text>
            <Text style={styles.finTexto}>
              Completaste «{tutorial.titulo}». Cuando quieras, lo podés repetir.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Navegación — fija abajo */}
      {total > 0 && (
        <View style={styles.footerNav}>
          {!terminado ? (
            <>
              <TouchableOpacity
                style={[styles.navBtn, styles.navBtnGhost, pasoActual === 0 && styles.navBtnDisabled]}
                onPress={() => setPasoActual((p) => Math.max(0, p - 1))}
                disabled={pasoActual === 0}
                accessibilityLabel="Paso anterior"
                accessibilityRole="button"
              >
                <Ionicons name="arrow-back" size={22} color={pasoActual === 0 ? Colors.ui.disabled : Colors.brand.purple} />
                <Text style={[styles.navTextoGhost, pasoActual === 0 && styles.navTextoDisabled]}>Anterior</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navBtn, styles.navBtnPrimary]}
                onPress={() => {
                  if (pasoActual === total - 1) {
                    progreso.marcarCompletado.mutate();
                    hablar('¡Muy bien! Terminaste el tutorial.');
                  }
                  setPasoActual((p) => p + 1);
                }}
                accessibilityLabel={pasoActual === total - 1 ? 'Terminar' : 'Siguiente paso'}
                accessibilityRole="button"
              >
                <Text style={styles.navTextoPrimary}>{pasoActual === total - 1 ? '¡Terminé!' : 'Siguiente'}</Text>
                {pasoActual < total - 1 && <Ionicons name="arrow-forward" size={22} color={Colors.text.onDark} />}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.navBtn, styles.navBtnGhost]}
                onPress={() => setPasoActual(0)}
                accessibilityLabel="Repetir tutorial"
                accessibilityRole="button"
              >
                <Ionicons name="refresh" size={22} color={Colors.brand.purple} />
                <Text style={styles.navTextoGhost}>Repetir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navBtn, styles.navBtnDone]}
                onPress={() => router.back()}
                accessibilityLabel="Volver a tutoriales"
                accessibilityRole="button"
              >
                <Text style={styles.navTextoPrimary}>Volver a tutoriales</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

// Sección de relacionados — horizontal, con foto temática
function Relacionados({
  items,
  onPress,
}: {
  items: Array<{ id: string; titulo: string; thumbnail_url: string | null; formato: string; categoria?: { nombre: string } | null }>;
  onPress: (id: string) => void;
}) {
  return (
    <View style={styles.relSection}>
      <Text style={styles.relTitulo}>Tutoriales relacionados</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relList}>
        {items.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={styles.relCard}
            onPress={() => onPress(r.id)}
            activeOpacity={0.85}
            accessibilityLabel={`Ver tutorial: ${r.titulo}`}
            accessibilityRole="button"
          >
            <TutorialImage
              uri={r.thumbnail_url}
              fallbackSeed={r.id}
              categoria={r.categoria?.nombre}
              iconSize={26}
              style={styles.relThumb}
            />
            <Text style={styles.relCardTitulo} numberOfLines={2}>{r.titulo}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.ui.background },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxxl,
  },
  estadoTitulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  estadoTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  btnReintentar: {
    backgroundColor: Colors.brand.purple,
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.lg,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnReintentarTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },

  scrollBody: {
    padding: Spacing.screen.horizontal,
    paddingBottom: Spacing.section,
    gap: Spacing.md,
  },

  // ── Video ──
  videoCard: {
    borderRadius: Spacing.radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  videoVacio: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#241636',
  },
  videoVacioTexto: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.size.sm },
  videoBarra: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  videoBarraFill: { height: 4, backgroundColor: Colors.brand.purple },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: Colors.tutoriales.soft,
    borderRadius: Spacing.radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  pillTexto: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.purple,
    letterSpacing: 0.3,
  },

  tituloRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
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
  descripcion: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    lineHeight: 26,
  },
  ayuda: {
    fontSize: Typography.size.sm,
    color: Colors.text.hint,
    lineHeight: 22,
  },

  // ── Qué vas a aprender ──
  aprenderasCard: {
    backgroundColor: Colors.tutoriales.soft,
    borderRadius: Spacing.radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  aprenderasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aprenderasTitulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  aprenderasItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  aprenderasTexto: {
    flex: 1,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    lineHeight: 24,
  },

  // ── Cabecera de progreso (pasos) ──
  progresoHeader: {
    backgroundColor: Colors.ui.surface,
    paddingHorizontal: Spacing.screen.horizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  progresoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  miniThumb: {
    width: 48,
    height: 48,
    borderRadius: Spacing.radius.md,
    overflow: 'hidden',
    flexShrink: 0,
  },
  miniThumbImg: { width: 48, height: 48 },
  progresoInfo: { flex: 1, minWidth: 0 },
  progresoTitulo: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  progresoPaso: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  volverVideoBtn: {
    width: Spacing.touch.min,
    height: Spacing.touch.min,
    borderRadius: Spacing.radius.md,
    backgroundColor: Colors.tutoriales.soft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  progresoTrack: {
    height: 8,
    borderRadius: Spacing.radius.full,
    backgroundColor: Colors.ui.border,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  progresoFill: {
    height: 8,
    backgroundColor: Colors.brand.purple,
    borderRadius: Spacing.radius.full,
  },

  // ── Paso ──
  stepPhotoWrap: {
    width: '100%',
    height: 200,
    borderRadius: Spacing.radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.tutoriales.soft,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  stepCaptionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  stepCaption: {
    color: Colors.text.onDark,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  stepNumero: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.brand.purple,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumeroTexto: {
    color: Colors.text.onDark,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.heavy,
  },
  stepTextoCol: { flex: 1, gap: Spacing.md, paddingTop: 2 },
  stepInstr: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    lineHeight: 28,
  },

  // Tip
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.tutoriales.amberBg,
    borderWidth: 1,
    borderColor: '#F0E2B8',
    borderRadius: Spacing.radius.md,
    padding: Spacing.md,
  },
  tipIcono: { marginTop: 1 },
  tipTexto: {
    flex: 1,
    fontSize: Typography.size.md,
    color: Colors.tutoriales.amber,
    lineHeight: 22,
    fontWeight: Typography.weight.medium,
  },

  escucharBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.tutoriales.soft,
    borderRadius: Spacing.radius.lg,
    minHeight: Spacing.touch.comfortable,
    paddingVertical: Spacing.md,
  },
  escucharTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.purple,
  },

  // ── Pantalla de fin ──
  finCard: {
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.section,
    paddingHorizontal: Spacing.lg,
  },
  finCheck: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.brand.greenMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finTitulo: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.heavy,
    color: Colors.text.primary,
  },
  finTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 300,
  },

  // ── Relacionados ──
  relSection: { gap: Spacing.sm },
  relTitulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  relList: { gap: Spacing.md, paddingRight: Spacing.sm },
  relCard: { width: 150 },
  relThumb: {
    width: 150,
    height: 96,
    borderRadius: Spacing.radius.md,
  },
  relCardTitulo: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    marginTop: Spacing.xs,
    lineHeight: 19,
  },

  // ── Nav (footer) ──
  footerNav: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.ui.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.ui.border,
    paddingHorizontal: Spacing.screen.horizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Spacing.radius.lg,
    minHeight: Spacing.touch.comfortable,
    paddingVertical: Spacing.md,
  },
  navBtnFull: { flex: 1 },
  navBtnGhost: {
    backgroundColor: Colors.ui.surface,
    borderWidth: 1.5,
    borderColor: Colors.brand.purple,
  },
  navBtnPrimary: { flex: 1.4, backgroundColor: Colors.brand.purple },
  navBtnDone: { flex: 1.4, backgroundColor: Colors.brand.greenMedium },
  navBtnDisabled: { borderColor: Colors.ui.border },
  navTextoPrimary: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
  navTextoGhost: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.purple,
  },
  navTextoDisabled: { color: Colors.ui.disabled },
});
