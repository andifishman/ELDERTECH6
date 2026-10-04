// Mapa de niveles de Jardín ElderTech — un camino vertical que serpentea y se
// scrollea (el nivel 1 abajo, el 60 arriba), dividido en 6 zonas con su propio
// fondo. Cada nivel se desbloquea al completar el anterior y se gana de 1 a 3
// estrellas según cuántos movimientos sobren. Tocar un nivel abre una ficha con
// el objetivo y lo que hace falta para cada estrella; el detalle de cada nivel
// vive en @/constants/nivelesJardin y acá solo se pinta el progreso del backend.
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '@/components/ui/AppHeader';
import { Colors } from '@/constants/theme';
import {
  NIVELES_JARDIN,
  NIVELES_POR_ZONA,
  TOTAL_NIVELES_JARDIN,
  ZONAS_JARDIN,
  esNivelJefeJardin,
  obtenerNivelJardin,
  umbralesEstrellasJardin,
  zonaDeNivel,
} from '@/constants/nivelesJardin';
import { obtenerProgresoNivelesJardin, type ProgresoNivelJardin } from '@/services/juegosService';

// ─── Geometría del camino ─────────────────────────────────────────────────
const TAM_NODO = 70; // > 48pt: botón grande para dedos poco precisos
const ESPACIO_Y = 124; // distancia vertical entre niveles
const MARGEN_ARRIBA = 170;
const MARGEN_ABAJO = 150;
const ONDA = 0.78; // cuántas "curvas" hace el camino
const PASO_MUESTRA = 0.34; // resolución con que se dibuja la curva (en niveles)
const CANTIDAD_ZONAS = ZONAS_JARDIN.length;
// Entre el último nivel de una zona y el primero de la siguiente hay un tramo más largo,
// donde va el cartel con el nombre de la zona (así no tapa ni las estrellas ni los botones).
const ESPACIO_EXTRA_ZONA = 90;
const ALTO_TOTAL = MARGEN_ARRIBA + (TOTAL_NIVELES_JARDIN - 1) * ESPACIO_Y + (CANTIDAD_ZONAS - 1) * ESPACIO_EXTRA_ZONA + MARGEN_ABAJO;

type EstadoNivel = 'bloqueado' | 'actual' | 'completado';

interface Punto {
  x: number;
  y: number;
}

/** Posición del centro del nivel `t` (puede ser fraccionario para suavizar la curva). */
function posicion(t: number, ancho: number): Punto {
  const amplitud = Math.min(ancho * 0.3, 118);
  return {
    x: ancho / 2 + amplitud * Math.sin(t * ONDA),
    y: ALTO_TOTAL - MARGEN_ABAJO - (t - 1) * ESPACIO_Y - tramosExtra(t),
  };
}

/** Espacio extra acumulado hasta `t`: crece de forma continua entre el último nivel de una zona y el primero de la siguiente. */
function tramosExtra(t: number): number {
  let extra = 0;
  for (let k = 1; k < CANTIDAD_ZONAS; k++) {
    extra += Math.min(1, Math.max(0, t - k * NIVELES_POR_ZONA)) * ESPACIO_EXTRA_ZONA;
  }
  return extra;
}

/** Y del borde entre la zona k-1 y la k (k = 1..5), a mitad de camino entre sus dos niveles. */
function limiteZona(k: number, ancho: number): number {
  if (k <= 0) return ALTO_TOTAL;
  if (k >= CANTIDAD_ZONAS) return 0;
  return (posicion(k * NIVELES_POR_ZONA, ancho).y + posicion(k * NIVELES_POR_ZONA + 1, ancho).y) / 2;
}

// ─── Camino (la "ruta" que une los niveles) ───────────────────────────────
// Sin SVG: cada tramo es un rectángulo redondeado rotado. Se dibuja en tres
// capas (borde oscuro, relleno claro y tramo ya recorrido) para dar volumen.
const Camino = memo(function Camino({ ancho, hasta }: { ancho: number; hasta: number }) {
  const tramos = useMemo(() => {
    const lista: { cx: number; cy: number; largo: number; angulo: number; t: number }[] = [];
    let anterior = posicion(1, ancho);
    for (let t = 1 + PASO_MUESTRA; t <= TOTAL_NIVELES_JARDIN + 1e-6; t += PASO_MUESTRA) {
      const actual = posicion(t, ancho);
      const dx = actual.x - anterior.x;
      const dy = actual.y - anterior.y;
      lista.push({
        cx: (anterior.x + actual.x) / 2,
        cy: (anterior.y + actual.y) / 2,
        largo: Math.sqrt(dx * dx + dy * dy) + 3,
        angulo: Math.atan2(dy, dx),
        t,
      });
      anterior = actual;
    }
    return lista;
  }, [ancho]);

  const capa = (grosor: number, colorDe: (t: number) => string, prefijo: string) =>
    tramos.map((tr) => (
      <View
        key={`${prefijo}${tr.t}`}
        style={{
          position: 'absolute',
          left: tr.cx - tr.largo / 2,
          top: tr.cy - grosor / 2,
          width: tr.largo,
          height: grosor,
          borderRadius: grosor / 2,
          backgroundColor: colorDe(tr.t),
          transform: [{ rotate: `${tr.angulo}rad` }],
        }}
      />
    ));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {capa(34, (t) => zonaDeNivel(Math.min(TOTAL_NIVELES_JARDIN, Math.round(t))).caminoBorde, 'b')}
      {capa(24, (t) => zonaDeNivel(Math.min(TOTAL_NIVELES_JARDIN, Math.round(t))).caminoRelleno, 'r')}
      {/* tramo ya recorrido: una "huella" verde por encima del camino */}
      {capa(10, (t) => (t <= hasta + 1e-6 ? '#43A047' : 'transparent'), 'v')}
    </View>
  );
});

// ─── Fondo por zonas + decoración ─────────────────────────────────────────
const Fondo = memo(function Fondo({ ancho }: { ancho: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {ZONAS_JARDIN.map((z, i) => {
        // la zona 1 está abajo del todo: va desde el borde con la zona 2 hasta el fondo del mapa
        const arriba = limiteZona(i + 1, ancho);
        const abajo = limiteZona(i, ancho);
        return (
          <LinearGradient
            key={z.nombre}
            colors={z.fondo}
            style={{ position: 'absolute', left: 0, right: 0, top: arriba, height: abajo - arriba + 1 }}
          />
        );
      })}
      {NIVELES_JARDIN.map((n) => {
        const p = posicion(n.numero, ancho);
        const zona = zonaDeNivel(n.numero);
        // decoración del lado opuesto al que está el camino, para no tapar nada
        const izquierda = p.x > ancho / 2;
        const grande = n.numero % 3 === 0;
        return (
          <Ionicons
            key={`d${n.numero}`}
            name={n.numero % 7 === 0 ? 'cloud' : zona.decoracion}
            size={grande ? 40 : 28}
            color={n.numero % 7 === 0 ? 'rgba(255,255,255,0.85)' : zona.colorDecoracion}
            style={{
              position: 'absolute',
              top: p.y - (grande ? 20 : 14) + (n.numero % 2 === 0 ? 30 : -22),
              left: izquierda ? 10 + (n.numero % 4) * 8 : undefined,
              right: izquierda ? undefined : 10 + (n.numero % 4) * 8,
              opacity: 0.85,
            }}
          />
        );
      })}
    </View>
  );
});

// ─── Cartel de zona ───────────────────────────────────────────────────────
function CartelZona({ indice, ancho }: { indice: number; ancho: number }) {
  // el cartel de la zona N va en el borde con la zona anterior (la zona 1 no lleva: es el inicio)
  const y = limiteZona(indice, ancho);
  return (
    <View style={[styles.cartelZonaWrap, { top: y - 27 }]} pointerEvents="none">
      <View style={styles.cartelZona}>
        <Text style={styles.cartelZonaNumero}>ZONA {indice + 1}</Text>
        <Text style={styles.cartelZonaNombre}>{ZONAS_JARDIN[indice].nombre}</Text>
      </View>
    </View>
  );
}

// ─── Nodo de nivel ────────────────────────────────────────────────────────
const NodoNivel = memo(function NodoNivel({
  numero,
  estado,
  estrellas,
  ancho,
  onPress,
}: {
  numero: number;
  estado: EstadoNivel;
  estrellas: number;
  ancho: number;
  onPress: (n: number) => void;
}) {
  const { x, y } = posicion(numero, ancho);
  const esJefe = esNivelJefeJardin(numero);
  const tam = esJefe ? TAM_NODO + 14 : TAM_NODO;

  // El nivel actual NO se anima todo el tiempo (cansa y distrae): el globo "¡Jugá!"
  // flota suavemente 3 veces al entrar al mapa y después queda quieto. Si el celular
  // tiene activado "reducir movimiento", no se anima nada.
  const flote = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (estado !== 'actual') return;
    let cancelado = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reducir) => {
        if (cancelado || reducir) return;
        Animated.sequence(
          Array.from({ length: 3 }, () =>
            Animated.sequence([
              Animated.timing(flote, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
              Animated.timing(flote, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ]),
          ),
        ).start();
      });
    return () => {
      cancelado = true;
      flote.stopAnimation();
    };
  }, [estado, flote]);

  const paleta: Record<EstadoNivel, { claro: string; oscuro: string; base: string }> = {
    bloqueado: { claro: '#CFD8DC', oscuro: '#90A4AE', base: '#607D8B' },
    actual: { claro: '#FFB74D', oscuro: '#FB8C00', base: '#B85F00' },
    completado: { claro: '#81C784', oscuro: '#2E9B3E', base: '#1B6B2A' },
  };
  const c = esJefe && estado !== 'bloqueado' ? { claro: '#F48FB1', oscuro: '#D81B60', base: '#8E0F40' } : paleta[estado];

  return (
    <View style={[styles.nodoPosicion, { left: x - tam / 2, top: y - tam / 2, width: tam }]}>
      {estado === 'actual' && (
        <View
          pointerEvents="none"
          style={[styles.aro, { width: tam + 22, height: tam + 22, borderRadius: (tam + 22) / 2, left: -11, top: -11 }]}
        />
      )}

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(numero)}
        accessibilityRole="button"
        accessibilityLabel={
          estado === 'bloqueado'
            ? `Nivel ${numero}, bloqueado. Completá el nivel ${numero - 1} primero.`
            : estado === 'completado'
              ? `Nivel ${numero}, completado con ${estrellas} de 3 estrellas`
              : `Nivel ${numero}, es tu nivel actual. Tocá para jugar.`
        }
        style={{ width: tam, height: tam + 8 }}
      >
        {/* base oscura: da el efecto de botón en relieve */}
        <View style={[styles.nodoBase, { width: tam, height: tam, borderRadius: tam / 2, backgroundColor: c.base }]} />
        <LinearGradient
          colors={[c.claro, c.oscuro]}
          style={[styles.nodoFrente, { width: tam, height: tam, borderRadius: tam / 2, borderColor: 'rgba(255,255,255,0.9)' }]}
        >
          <View style={styles.brillo} />
          {estado === 'bloqueado' ? (
            <Ionicons name="lock-closed" size={tam * 0.4} color="#ECEFF1" />
          ) : (
            <Text style={[styles.nodoNumero, esJefe && { fontSize: 30 }]}>{numero}</Text>
          )}
          {esJefe && estado !== 'bloqueado' && <Ionicons name="trophy" size={16} color="#FFF8E1" style={styles.coronaJefe} />}
        </LinearGradient>
      </TouchableOpacity>

      {/* estrellas debajo, la del medio un poco más abajo que las de los costados */}
      {estado === 'completado' && (
        <View style={styles.estrellasFila} pointerEvents="none">
          {[1, 2, 3].map((n) => (
            <Ionicons
              key={n}
              name={n <= estrellas ? 'star' : 'star-outline'}
              size={n === 2 ? 26 : 22}
              color={n <= estrellas ? '#FFC107' : '#B0BEC5'}
              style={[styles.estrella, n === 2 && { marginTop: 8 }]}
            />
          ))}
        </View>
      )}

      {/* globo sobre el nivel actual */}
      {estado === 'actual' && (
        <Animated.View
          style={[styles.globoWrap, { transform: [{ translateY: flote.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }]}
          pointerEvents="none"
        >
          <View style={styles.globo}>
            <Text style={styles.globoTexto}>¡Jugá!</Text>
          </View>
          <View style={styles.globoPunta} />
        </Animated.View>
      )}
    </View>
  );
});

// ─── Pantalla ─────────────────────────────────────────────────────────────
export default function JardinNivelesScreen() {
  const router = useRouter();
  const { width: ancho, height: altoPantalla } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const yaPosicionado = useRef(false);

  const [progreso, setProgreso] = useState<ProgresoNivelJardin[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [nivelFicha, setNivelFicha] = useState<number | null>(null);

  const cargar = useCallback(() => {
    obtenerProgresoNivelesJardin()
      .then(setProgreso)
      .catch(() => setProgreso((prev) => prev ?? []))
      .finally(() => setCargando(false));
  }, []);

  // Al volver de jugar un nivel, refresca el progreso para desbloquear el siguiente.
  useFocusEffect(cargar);

  const progresoPorNivel = useMemo(() => new Map((progreso ?? []).map((p) => [p.nivel, p])), [progreso]);
  const mayorCompletado = useMemo(() => Math.max(0, ...(progreso ?? []).map((p) => p.nivel)), [progreso]);
  const nivelActual = Math.min(TOTAL_NIVELES_JARDIN, mayorCompletado + 1);
  const terminoTodo = mayorCompletado >= TOTAL_NIVELES_JARDIN;
  const totalEstrellas = useMemo(() => (progreso ?? []).reduce((s, p) => s + p.estrellas, 0), [progreso]);

  const estadoDe = useCallback(
    (n: number): EstadoNivel => (progresoPorNivel.has(n) ? 'completado' : n === mayorCompletado + 1 ? 'actual' : 'bloqueado'),
    [progresoPorNivel, mayorCompletado],
  );

  const irAlNivelActual = useCallback(
    (animado: boolean) => {
      const y = posicion(terminoTodo ? TOTAL_NIVELES_JARDIN : nivelActual, ancho).y;
      scrollRef.current?.scrollTo({ y: Math.max(0, y - altoPantalla * 0.5), animated: animado });
    },
    [ancho, altoPantalla, nivelActual, terminoTodo],
  );

  // La primera vez que hay datos, el mapa arranca centrado en el nivel actual (no en el 1).
  useEffect(() => {
    if (cargando || yaPosicionado.current) return;
    yaPosicionado.current = true;
    const t = setTimeout(() => irAlNivelActual(false), 50);
    return () => clearTimeout(t);
  }, [cargando, irAlNivelActual]);

  const abrirFicha = useCallback((n: number) => setNivelFicha(n), []);
  const jugar = (n: number) => {
    setNivelFicha(null);
    router.push(`/mas/juegos/jardin?nivel=${n}` as never);
  };

  const fichaNivel = nivelFicha != null ? obtenerNivelJardin(nivelFicha) : undefined;
  const fichaBloqueada = nivelFicha != null && estadoDe(nivelFicha) === 'bloqueado';
  const fichaProgreso = nivelFicha != null ? progresoPorNivel.get(nivelFicha) : undefined;
  const umbrales = fichaNivel ? umbralesEstrellasJardin(fichaNivel.movimientos) : null;

  return (
    <View style={styles.container}>
      <AppHeader title="Jardín ElderTech" showBack />

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <View style={styles.mapa}>
          <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ height: ALTO_TOTAL }}>
            <View style={{ width: ancho, height: ALTO_TOTAL }}>
              <Fondo ancho={ancho} />
              <Camino ancho={ancho} hasta={Math.min(TOTAL_NIVELES_JARDIN, mayorCompletado + 1)} />
              {ZONAS_JARDIN.slice(1).map((_, i) => (
                <CartelZona key={i + 1} indice={i + 1} ancho={ancho} />
              ))}
              {NIVELES_JARDIN.map((n) => (
                <NodoNivel
                  key={n.numero}
                  numero={n.numero}
                  estado={estadoDe(n.numero)}
                  estrellas={progresoPorNivel.get(n.numero)?.estrellas ?? 0}
                  ancho={ancho}
                  onPress={abrirFicha}
                />
              ))}
              {terminoTodo && (
                <View style={[styles.cartelFinal, { top: 40 }]}>
                  <Ionicons name="trophy" size={28} color="#F9A825" />
                  <Text style={styles.cartelFinalTexto}>¡Completaste los 60 niveles!</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Cinta fija: estrellas ganadas + accesos rápidos */}
          <View style={styles.cintaEstrellas} pointerEvents="none">
            <Ionicons name="star" size={20} color="#FFC107" />
            <Text style={styles.cintaTexto}>
              {totalEstrellas} / {TOTAL_NIVELES_JARDIN * 3}
            </Text>
          </View>

          <View style={styles.barraInferior}>
            <TouchableOpacity
              style={styles.botonLibre}
              onPress={() => router.push('/mas/juegos/jardin' as never)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Jugar en modo libre, sin niveles"
            >
              <Ionicons name="infinite" size={22} color={Colors.primary} />
              <Text style={styles.botonLibreTexto}>Modo libre</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.botonActual}
              onPress={() => irAlNivelActual(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Ir a mi nivel actual"
            >
              <Ionicons name="locate" size={22} color="#FFFFFF" />
              <Text style={styles.botonActualTexto}>Mi nivel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Ficha del nivel */}
      <Modal visible={nivelFicha != null} transparent animationType="fade" onRequestClose={() => setNivelFicha(null)}>
        <Pressable style={styles.modalFondo} onPress={() => setNivelFicha(null)}>
          <Pressable style={styles.ficha} onPress={() => undefined}>
            {fichaNivel && umbrales && (
              <>
                <View style={[styles.fichaCabecera, { backgroundColor: esNivelJefeJardin(fichaNivel.numero) ? '#D81B60' : '#2E9B3E' }]}>
                  <Text style={styles.fichaTitulo}>Nivel {fichaNivel.numero}</Text>
                  {esNivelJefeJardin(fichaNivel.numero) && <Text style={styles.fichaJefe}>¡Nivel desafío!</Text>}
                </View>

                {fichaBloqueada ? (
                  <View style={styles.fichaCuerpo}>
                    <Ionicons name="lock-closed" size={44} color="#90A4AE" />
                    <Text style={styles.fichaTextoGrande}>Este nivel está bloqueado</Text>
                    <Text style={styles.fichaTexto}>Completá el nivel {fichaNivel.numero - 1} para poder jugarlo.</Text>
                  </View>
                ) : (
                  <View style={styles.fichaCuerpo}>
                    <Text style={styles.fichaTextoGrande}>
                      Llegá a <Text style={styles.fichaResaltado}>{fichaNivel.objetivoPuntos}</Text> puntos
                    </Text>
                    <Text style={styles.fichaTexto}>
                      con <Text style={styles.fichaResaltado}>{fichaNivel.movimientos}</Text> movimientos
                    </Text>

                    <View style={styles.fichaEstrellas}>
                      {[
                        { n: 3, texto: `${umbrales.tres} movimientos o menos` },
                        { n: 2, texto: `${umbrales.dos} movimientos o menos` },
                        { n: 1, texto: `Hasta ${umbrales.uno} movimientos` },
                      ].map((f) => (
                        <View key={f.n} style={styles.fichaFilaEstrella}>
                          <View style={styles.fichaEstrellasIcono}>
                            {[1, 2, 3].map((e) => (
                              <Ionicons key={e} name="star" size={20} color={e <= f.n ? '#FFC107' : '#CFD8DC'} />
                            ))}
                          </View>
                          <Text style={styles.fichaTextoEstrella}>{f.texto}</Text>
                        </View>
                      ))}
                    </View>

                    {fichaProgreso && (
                      <Text style={styles.fichaMejor}>
                        Tu mejor intento: {fichaProgreso.estrellas} de 3 estrellas ({fichaProgreso.movimientosUsados} movimientos)
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.fichaBotones}>
                  <TouchableOpacity style={styles.fichaCerrar} onPress={() => setNivelFicha(null)} accessibilityRole="button">
                    <Text style={styles.fichaCerrarTexto}>{fichaBloqueada ? 'Entendido' : 'Cerrar'}</Text>
                  </TouchableOpacity>
                  {!fichaBloqueada && (
                    <TouchableOpacity
                      style={styles.fichaJugar}
                      onPress={() => jugar(fichaNivel.numero)}
                      accessibilityRole="button"
                      accessibilityLabel={`Jugar el nivel ${fichaNivel.numero}`}
                    >
                      <Ionicons name="play" size={22} color="#FFFFFF" />
                      <Text style={styles.fichaJugarTexto}>{fichaProgreso ? 'Jugar de nuevo' : 'Jugar'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#BDE8FF' },
  mapa: { flex: 1 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  // nodo
  nodoPosicion: { position: 'absolute', alignItems: 'center' },
  aro: { position: 'absolute', borderWidth: 4, borderColor: '#FFB300', backgroundColor: 'rgba(255,193,7,0.22)' },
  nodoBase: {
    position: 'absolute',
    top: 8,
    left: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  nodoFrente: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, overflow: 'hidden' },
  brillo: {
    position: 'absolute',
    top: 5,
    left: 11,
    width: 26,
    height: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.45)',
    transform: [{ rotate: '-18deg' }],
  },
  nodoNumero: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  coronaJefe: { position: 'absolute', bottom: 7 },
  estrellasFila: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginTop: 2 },
  estrella: { marginHorizontal: -1 },

  globoWrap: { position: 'absolute', top: -46, alignItems: 'center' },
  globo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: '#FB8C00',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  globoTexto: { color: '#B85F00', fontSize: 17, fontWeight: '800' },
  globoPunta: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FB8C00',
    marginTop: -1,
  },

  // carteles
  cartelZonaWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  cartelZona: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  cartelZonaNumero: { fontSize: 14, fontWeight: '800', color: '#607D8B', letterSpacing: 1.5 },
  cartelZonaNombre: { fontSize: 20, fontWeight: '800', color: '#2E5E2A' },
  cartelFinal: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    elevation: 4,
  },
  cartelFinalTexto: { fontSize: 18, fontWeight: '800', color: '#B26A00' },

  // cinta y barra inferior
  cintaEstrellas: {
    position: 'absolute',
    top: 10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cintaTexto: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  barraInferior: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  botonLibre: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 27,
    borderWidth: 2,
    borderColor: Colors.primary,
    elevation: 5,
  },
  botonLibreTexto: { color: Colors.primary, fontSize: 17, fontWeight: '800' },
  botonActual: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FB8C00',
    borderRadius: 27,
    elevation: 5,
  },
  botonActualTexto: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },

  // ficha de nivel
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  ficha: { width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden' },
  fichaCabecera: { paddingVertical: 16, alignItems: 'center' },
  fichaTitulo: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  fichaJefe: { color: '#FFF8E1', fontSize: 17, fontWeight: '700', marginTop: 2 },
  fichaCuerpo: { padding: 20, alignItems: 'center', gap: 6 },
  fichaTextoGrande: { fontSize: 22, fontWeight: '800', color: '#263238', textAlign: 'center' },
  fichaTexto: { fontSize: 18, color: '#455A64', textAlign: 'center', lineHeight: 26 },
  fichaResaltado: { color: '#E65100', fontWeight: '800' },
  fichaEstrellas: { alignSelf: 'stretch', marginTop: 14, gap: 8 },
  fichaFilaEstrella: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F7F8',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  fichaEstrellasIcono: { flexDirection: 'row', width: 66 },
  fichaTextoEstrella: { flex: 1, fontSize: 17, color: '#37474F', fontWeight: '600' },
  fichaMejor: { marginTop: 10, fontSize: 17, color: '#2E7D32', fontWeight: '700', textAlign: 'center' },
  fichaBotones: { flexDirection: 'row', gap: 12, padding: 16, paddingTop: 4 },
  fichaCerrar: {
    flex: 1,
    minHeight: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#90A4AE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fichaCerrarTexto: { fontSize: 18, fontWeight: '700', color: '#455A64' },
  fichaJugar: {
    flex: 1.4,
    minHeight: 54,
    borderRadius: 27,
    backgroundColor: '#2E9B3E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fichaJugarTexto: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
});
