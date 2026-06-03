/**
 * app/mas/radio/[id].tsx
 * ──────────────────────
 * Pantalla de detalle de una radio específica.
 * Diseñada para adultos mayores: botones grandes, texto grande, alto contraste.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRadioData } from '@/hooks/useRadio';
import { useRadioPlayer } from '@/context/RadioContext';
import { useFavoritos } from '@/hooks/useFavoritos';
import { useHistorialRadio } from '@/hooks/useHistorialRadio';
import { NowPlayingBar } from '@/components/radio/NowPlayingBar';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { RadioStation } from '@/types/radio.types';

// ─────────────────────────────────────────────────────────────────────────────

export default function RadioDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data } = useRadioData();
  const { radioActual, estado, volumen, subirVolumen, bajarVolumen, reproducir, detener } = useRadioPlayer();
  const { toggleFavorito, esFavorito } = useFavoritos();
  const { agregarAlHistorial } = useHistorialRadio();

  // Animación del punto "EN VIVO"
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const radio = data?.radios.find((r) => r.id === id) ?? null;

  const esActiva = radioActual?.id === radio?.id;
  const cargando = esActiva && estado === 'loading';
  const reproduciendo = esActiva && estado === 'playing';
  const hayError = esActiva && estado === 'error';
  const esFav = radio ? esFavorito(radio.id) : false;

  // Radios similares: misma categoría, excluyendo la actual, máx 3
  const similares: RadioStation[] = radio
    ? (data?.radios ?? [])
        .filter(
          (r) =>
            r.id !== radio.id &&
            (r.categoriaId === radio.categoriaId || r.pais === radio.pais),
        )
        .slice(0, 3)
    : [];

  // Animación pulsante para el indicador EN VIVO
  useEffect(() => {
    if (reproduciendo) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [reproduciendo, pulseAnim]);

  // Agregar al historial cuando empieza a reproducir
  useEffect(() => {
    if (reproduciendo && radio) {
      agregarAlHistorial(radio.id);
    }
  }, [reproduciendo, radio?.id]);

  async function handleTogglePlay() {
    if (!radio) return;
    if (reproduciendo) {
      await detener();
    } else {
      await reproducir(radio);
    }
  }

  // ── Pantalla de carga / no encontrada ──────────────────────────────────────
  if (!data) {
    return (
      <View style={[styles.root, styles.centrado]}>
        <ActivityIndicator size="large" color={Colors.brand.greenDark} />
        <Text style={styles.cargandoTexto}>Cargando...</Text>
      </View>
    );
  }

  if (!radio) {
    return (
      <View style={[styles.root, styles.centrado]}>
        <Text style={styles.errorEmoji}>📻</Text>
        <Text style={styles.errorTexto}>Radio no encontrada</Text>
        <TouchableOpacity
          style={styles.volverBtn}
          onPress={() => router.back()}
          accessibilityLabel="Volver a la lista de radios"
          accessibilityRole="button"
        >
          <Text style={styles.volverBtnTexto}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Colores del botón de reproducción ─────────────────────────────────────
  const playBtnColor = cargando
    ? Colors.ui.disabled
    : reproduciendo
    ? Colors.brand.red
    : Colors.radio.playButton;

  const playBtnLabel = cargando
    ? 'Conectando...'
    : reproduciendo
    ? 'Detener'
    : 'Reproducir';

  // ── Render principal ───────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* ── Header verde con volver + nombre ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          accessibilityLabel="Volver a la lista de radios"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={26} color={Colors.text.onDark} />
        </TouchableOpacity>

        <Text style={styles.headerTitulo} numberOfLines={1}>
          {radio.nombre}
        </Text>

        {/* espacio vacío para mantener el título centrado */}
        <View style={styles.headerBtnPlaceholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Área central: emoji + info ── */}
        <View style={styles.heroSection}>
          {/* Emoji de categoría en círculo grande */}
          <View style={styles.emojiCirculo}>
            <Text style={styles.emojiGrande}>
              {radio.categoriaEmoji ?? '📻'}
            </Text>
          </View>

          {/* Nombre */}
          <Text style={styles.radioNombre}>{radio.nombre}</Text>

          {/* Indicador EN VIVO animado */}
          {reproduciendo && (
            <View style={styles.enVivoRow}>
              <Animated.View style={[styles.enVivoPunto, { opacity: pulseAnim }]} />
              <Text style={styles.enVivoTexto}>EN VIVO</Text>
            </View>
          )}

          {/* Descripción */}
          {radio.descripcion ? (
            <Text style={styles.descripcion}>{radio.descripcion}</Text>
          ) : null}

          {/* Badges: categoría + idioma/país */}
          <View style={styles.badgesRow}>
            {radio.categoria ? (
              <View style={styles.badge}>
                <Text style={styles.badgeTexto}>
                  {radio.categoriaEmoji} {radio.categoria}
                </Text>
              </View>
            ) : null}
            {radio.paisEmoji && radio.paisNombre ? (
              <View style={[styles.badge, styles.badgePais]}>
                <Text style={styles.badgeTexto}>
                  {radio.paisEmoji} {radio.paisNombre}
                </Text>
              </View>
            ) : null}
            {radio.ciudad ? (
              <View style={[styles.badge, styles.badgeCiudad]}>
                <Text style={styles.badgeTexto}>📍 {radio.ciudad}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Botón de reproducción GIGANTE ── */}
        <View style={styles.playerSection}>
          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: playBtnColor }]}
            onPress={handleTogglePlay}
            disabled={cargando}
            activeOpacity={0.8}
            accessibilityLabel={
              cargando
                ? 'Conectando a la radio, por favor espere'
                : reproduciendo
                ? `Detener ${radio.nombre}`
                : `Reproducir ${radio.nombre}`
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: cargando, selected: reproduciendo }}
          >
            {cargando ? (
              <ActivityIndicator size="large" color={Colors.text.onDark} />
            ) : (
              <Ionicons
                name={reproduciendo ? 'stop' : 'play'}
                size={52}
                color={Colors.text.onDark}
              />
            )}
          </TouchableOpacity>

          {/* Texto de estado debajo del botón */}
          <Text style={styles.estadoTexto}>{playBtnLabel}</Text>
          {cargando && (
            <Text style={styles.estadoSubtexto}>
              Estamos conectando la radio, por favor esperá unos segundos...
            </Text>
          )}

          {/* Mensaje de error */}
          {hayError && (
            <View style={styles.errorBadge}>
              <Ionicons name="warning" size={18} color={Colors.brand.red} />
              <Text style={styles.errorBadgeTexto}>
                No se pudo conectar a esta radio
              </Text>
            </View>
          )}

          {/* ── Botón favorito debajo del reproductor ── */}
          <TouchableOpacity
            style={[styles.favBtn, esFav && styles.favBtnActivo]}
            onPress={() => toggleFavorito(radio.id)}
            accessibilityLabel={esFav ? `Eliminar ${radio.nombre} de favoritos` : `Agregar ${radio.nombre} a favoritos`}
            accessibilityRole="button"
          >
            <Ionicons
              name={esFav ? 'heart' : 'heart-outline'}
              size={26}
              color={esFav ? '#FF6B6B' : Colors.text.secondary}
            />
            <Text style={[styles.favBtnTexto, esFav && styles.favBtnTextoActivo]}>
              {esFav ? 'Eliminar de favoritos' : 'Agregar a favoritos'}
            </Text>
          </TouchableOpacity>

          {/* Texto explicativo */}
          <Text style={styles.favExplicacion}>
            {esFav
              ? '❤️ Esta radio aparece primero en tu lista'
              : 'Las radios favoritas aparecen primero en la lista'}
          </Text>

          {/* ── Control de volumen ── */}
          <View style={styles.volumenContainer}>
            <Text style={styles.volumenTitulo}>🔊 Volumen de la radio</Text>
            <Text style={styles.volumenSubtitulo}>
              Usá los botones para subir o bajar el volumen
            </Text>
            <View style={styles.volumenRow}>
              <TouchableOpacity
                style={[styles.volBtn, volumen <= 0 && styles.volBtnDeshabilitado]}
                onPress={bajarVolumen}
                disabled={volumen <= 0}
                accessibilityLabel="Bajar volumen"
                accessibilityRole="button"
              >
                <Text style={styles.volBtnTexto}>−</Text>
                <Text style={styles.volBtnLabel}>Bajar</Text>
              </TouchableOpacity>

              {/* Barra de nivel con 10 segmentos */}
              <View style={styles.volBarContainer}>
                {Array.from({ length: 10 }).map((_, i) => {
                  const activo = i < Math.round(volumen * 10);
                  const color = i < 6 ? '#4CAF50' : i < 8 ? '#FFC107' : '#F44336';
                  return (
                    <View
                      key={i}
                      style={[
                        styles.volSegmento,
                        activo ? { backgroundColor: color } : styles.volSegmentoVacio,
                      ]}
                    />
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.volBtn, volumen >= 1 && styles.volBtnDeshabilitado]}
                onPress={subirVolumen}
                disabled={volumen >= 1}
                accessibilityLabel="Subir volumen"
                accessibilityRole="button"
              >
                <Text style={styles.volBtnTexto}>+</Text>
                <Text style={styles.volBtnLabel}>Subir</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.volumenPorcentaje}>{Math.round(volumen * 100)}%</Text>
          </View>
        </View>

        {/* ── Radios similares ── */}
        {similares.length > 0 && (
          <View style={styles.similaresSection}>
            <Text style={styles.similaresTitulo}>Radios similares</Text>
            {similares.map((sim) => (
              <RadioSimilarCard key={sim.id} radio={sim} />
            ))}
          </View>
        )}

        {/* Espacio para la NowPlayingBar */}
        <View style={{ height: 90 }} />
      </ScrollView>

      <NowPlayingBar />
    </View>
  );
}

// ─── Tarjeta de radio similar ─────────────────────────────────────────────────

interface RadioSimilarCardProps {
  radio: RadioStation;
}

function RadioSimilarCard({ radio }: RadioSimilarCardProps) {
  const { alternar, radioActual, estado } = useRadioPlayer();
  const esActiva = radioActual?.id === radio.id;
  const reproduciendo = esActiva && estado === 'playing';
  const cargando = esActiva && estado === 'loading';

  return (
    <TouchableOpacity
      style={[styles.similarCard, reproduciendo && styles.similarCardActiva]}
      onPress={() => router.push(`/mas/radio/${radio.id}`)}
      accessibilityLabel={`Ver detalle de ${radio.nombre}`}
      accessibilityRole="button"
    >
      <View style={[styles.similarIcono, reproduciendo && styles.similarIconoActivo]}>
        <Text style={styles.similarEmoji}>{radio.categoriaEmoji ?? '📻'}</Text>
      </View>

      <View style={styles.similarInfo}>
        <Text style={[styles.similarNombre, reproduciendo && styles.similarNombreActivo]} numberOfLines={1}>
          {radio.nombre}
        </Text>
        {radio.descripcion ? (
          <Text style={styles.similarDesc} numberOfLines={1}>
            {radio.descripcion}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.similarPlayBtn, reproduciendo && styles.similarPlayBtnActivo]}
        onPress={() => alternar(radio)}
        accessibilityLabel={reproduciendo ? `Detener ${radio.nombre}` : `Reproducir ${radio.nombre}`}
        accessibilityRole="button"
      >
        {cargando ? (
          <ActivityIndicator size="small" color={Colors.text.onDark} />
        ) : (
          <Ionicons
            name={reproduciendo ? 'stop' : 'play'}
            size={22}
            color={Colors.text.onDark}
          />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  centrado: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },

  // ── Header
  header: {
    backgroundColor: Colors.brand.greenDark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screen.horizontal,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  headerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  //placeholder transparente para centrar el título cuando no hay botón derecho
  headerBtnPlaceholder: {
    width: 48,
    height: 48,
    flexShrink: 0,
  },
  headerTitulo: {
    flex: 1,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
    textAlign: 'center',
  },

  // ── Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },

  // ── Hero section
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.screen.horizontal,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
    backgroundColor: Colors.ui.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
    gap: Spacing.md,
  },
  emojiCirculo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 3,
    borderColor: Colors.brand.greenDark,
  },
  emojiGrande: {
    fontSize: 64,
  },
  radioNombre: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  descripcion: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: Spacing.lg,
  },

  // ── EN VIVO badge animado
  enVivoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Spacing.radius.full,
  },
  enVivoPunto: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.brand.red,
  },
  enVivoTexto: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.red,
    letterSpacing: 1,
  },

  // ── Badges
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  badge: {
    backgroundColor: Colors.ui.background,
    borderRadius: Spacing.radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  badgePais: {
    backgroundColor: '#E3F2FD',
    borderColor: '#90CAF9',
  },
  badgeCiudad: {
    backgroundColor: '#F3E5F5',
    borderColor: '#CE93D8',
  },
  badgeTexto: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.medium,
  },

  // ── Player section
  playerSection: {
    alignItems: 'center',
    paddingVertical: Spacing.section,
    gap: Spacing.lg,
    backgroundColor: Colors.ui.background,
  },
  playBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  estadoTexto: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
  },
  estadoSubtexto: {
    fontSize: Typography.size.sm,
    color: Colors.text.hint,
    textAlign: 'center',
    paddingHorizontal: Spacing.xxl,
    lineHeight: 22,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.radius.lg,
  },
  errorBadgeTexto: {
    fontSize: Typography.size.md,
    color: Colors.brand.red,
    fontWeight: Typography.weight.medium,
  },

  // ── Botón favorito
  favBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.radius.full,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    backgroundColor: Colors.ui.surface,
    minHeight: Spacing.touch.comfortable,
  },
  favBtnActivo: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF0F0',
  },
  favBtnTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
  },
  favBtnTextoActivo: {
    color: '#C62828',
  },
  favExplicacion: {
    fontSize: Typography.size.sm,
    color: Colors.text.hint,
    textAlign: 'center',
    paddingHorizontal: Spacing.xxl,
  },

  // ── Radios similares
  similaresSection: {
    paddingHorizontal: Spacing.screen.horizontal,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  similaresTitulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  similarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    minHeight: 72,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  similarCardActiva: {
    borderColor: Colors.radio.playButton,
    backgroundColor: '#F0FAF0',
  },
  similarIcono: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  similarIconoActivo: {
    backgroundColor: '#D0EDD0',
  },
  similarEmoji: {
    fontSize: 22,
  },
  similarInfo: {
    flex: 1,
    gap: 3,
  },
  similarNombre: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  similarNombreActivo: {
    color: Colors.radio.playButton,
  },
  similarDesc: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },
  similarPlayBtn: {
    width: Spacing.touch.comfortable,
    height: Spacing.touch.comfortable,
    borderRadius: Spacing.touch.comfortable / 2,
    backgroundColor: Colors.radio.playButton,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  similarPlayBtnActivo: {
    backgroundColor: Colors.brand.red,
  },

  // ── Estados de carga / error de pantalla
  cargandoTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
  },
  errorEmoji: {
    fontSize: 56,
  },
  errorTexto: {
    fontSize: Typography.size.lg,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  volverBtn: {
    backgroundColor: Colors.brand.greenDark,
    borderRadius: Spacing.radius.full,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    minHeight: Spacing.touch.comfortable,
    justifyContent: 'center',
  },
  volverBtnTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.onDark,
    fontWeight: Typography.weight.semibold,
  },

  // ── Volumen
  volumenContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
    width: '100%',
    paddingHorizontal: Spacing.screen.horizontal,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.xl,
    marginHorizontal: Spacing.screen.horizontal,
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  volumenTitulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  volumenSubtitulo: {
    fontSize: Typography.size.sm,
    color: Colors.text.hint,
    textAlign: 'center',
  },
  volumenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
    justifyContent: 'center',
  },
  volBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.brand.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    flexShrink: 0,
  },
  volBtnDeshabilitado: {
    backgroundColor: Colors.ui.disabled,
    elevation: 0,
  },
  volBtnTexto: {
    fontSize: 36,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
    lineHeight: 40,
  },
  volBarContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'flex-end',
    height: 36,
  },
  volSegmento: {
    flex: 1,
    borderRadius: 3,
    height: '100%',
  },
  volSegmentoVacio: {
    backgroundColor: Colors.ui.border,
  },
  volumenPorcentaje: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
  },
});
