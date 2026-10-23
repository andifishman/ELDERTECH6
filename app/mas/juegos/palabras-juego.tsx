// Juego "Palabras" — rueda de letras + crucigrama (estilo Wordscapes), pensado para adultos mayores:
//   · Se arma la palabra DESLIZANDO el dedo por las letras; al soltar, se prueba sola (no hay botón "Probar").
//     Mientras se desliza, la palabra se va escribiendo arriba. Volver hacia atrás por una letra la quita.
//   · Sin tiempo, sin vidas, sin penalidad: una palabra que no existe solo se sacude y se borra.
//   · Pistas: cada nivel completado da 3; una pista revela una letra de una palabra que falta.
//   · Todo responde AL INSTANTE: pistas y avance se muestran de inmediato y se sincronizan de fondo.
//   · Los acentos no cuentan (se escribe CANCION, no CANCIÓN).
import { FondoPalabras } from '@/components/palabras/FondoPalabras';
import { Confeti } from '@/components/palabras/Confeti';
import { mundoDeNivel } from '@/constants/mundosPalabras';
import { useSonidoJuegos } from '@/context/SonidoJuegosContext';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useTutorial } from '@/hooks/useTutorial';
import { completarNivelPalabras, obtenerProgresoPalabras, usarPistaPalabras } from '@/services/juegosService';
import { ajustarPistas, encolarSincronizacion, guardarProgresoPalabras, leerProgresoPalabras, marcarNivelCompletado } from '@/utils/palabrasEstado';
import { celdasDe, letrasPorCelda, obtenerNivelPalabras, PISTAS_POR_NIVEL, TOTAL_NIVELES_PALABRAS } from '@/utils/palabrasNiveles';
import { hablar } from '@/utils/tts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Paleta fija del juego (la del fondo cambia por mundo; esto se mantiene para que sea siempre legible) ───
const AMARILLO = '#FFC531';
const AMARILLO_OSCURO = '#E8A200';
const TINTA = '#2B3A55';
const MARRON = '#3A2A00';

const TAM_LETRA = 70; // diámetro del círculo de una letra elegida
const RADIO_ACIERTO = 40; // qué tan cerca del centro de una letra tiene que pasar el dedo

type TipoPildora = 'armando' | 'ok' | 'extra' | 'error' | 'info';
interface Pildora {
  texto: string;
  tipo: TipoPildora;
}
interface Punto {
  x: number;
  y: number;
}

function mezclar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// ─── Celda de la grilla: aparece con un "pop" escalonado ───
function CeldaGrilla({ letra, visible, porPista, tam, retraso, x, y }: { letra: string; visible: boolean; porPista: boolean; tam: number; retraso: number; x: number; y: number }) {
  const pop = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const anillo = useRef(new Animated.Value(0)).current;
  const eraVisible = useRef(visible);

  useEffect(() => {
    if (visible && !eraVisible.current) {
      pop.setValue(0);
      Animated.sequence([
        Animated.delay(retraso),
        Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
      ]).start();
      if (porPista) {
        anillo.setValue(0);
        Animated.timing(anillo, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      }
    }
    eraVisible.current = visible;
  }, [visible, porPista, retraso, pop, anillo]);

  const escalaCelda = pop.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.22, 1] });
  const lado = tam - 5;

  return (
    <View style={{ position: 'absolute', left: x, top: y, width: tam, height: tam, alignItems: 'center', justifyContent: 'center' }}>
      {porPista && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: lado,
            height: lado,
            borderRadius: 10,
            borderWidth: 3,
            borderColor: '#FFFFFF',
            opacity: anillo.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
            transform: [{ scale: anillo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
          }}
        />
      )}
      <Animated.View
        style={[
          styles.celda,
          { width: lado, height: lado, transform: [{ scale: escalaCelda }] },
          visible && (porPista ? styles.celdaPista : styles.celdaVisible),
        ]}
      >
        <Animated.Text
          style={[styles.celdaLetra, { fontSize: Math.round(tam * 0.56), opacity: pop, transform: [{ scale: pop }] }]}
          allowFontScaling={false}
        >
          {visible ? letra : ''}
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

export default function PalabrasJuegoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { nivel: nivelParam } = useLocalSearchParams<{ nivel?: string }>();
  const numeroNivel = Math.min(Math.max(parseInt(nivelParam ?? '1', 10) || 1, 1), TOTAL_NIVELES_PALABRAS);
  const nivel = useMemo(() => obtenerNivelPalabras(numeroNivel), [numeroNivel]);
  const mundo = useMemo(() => mundoDeNivel(numeroNivel), [numeroNivel]);

  const { showTutorial, dismissTutorial, reopenTutorial } = useTutorial('palabras');
  const { sonidoActivado } = useSonidoJuegos();
  const { reproducir } = useGameSounds();

  const [orden, setOrden] = useState<number[]>(() => (nivel ? nivel.letras.map((_, i) => i) : []));
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [dedo, setDedo] = useState<Punto | null>(null);
  const [encontradas, setEncontradas] = useState<Set<string>>(new Set());
  const [extrasHalladas, setExtrasHalladas] = useState<Set<string>>(new Set());
  const [reveladas, setReveladas] = useState<Set<string>>(new Set());
  const [retrasos, setRetrasos] = useState<Record<string, number>>({});
  const [pistas, setPistas] = useState<number | null>(() => leerProgresoPalabras()?.pistas ?? null);
  const [pildora, setPildora] = useState<Pildora | null>(null);
  const [terminado, setTerminado] = useState(false);
  const [premio, setPremio] = useState(0);
  const [errorGuardado, setErrorGuardado] = useState(false);

  // Refs: el PanResponder se crea una sola vez, así que lee siempre lo último desde acá.
  const seleccionRef = useRef<number[]>([]);
  const ordenRef = useRef<number[]>(orden);
  const centrosRef = useRef<Punto[]>([]);
  const origenRef = useRef<Punto>({ x: 0, y: 0 });
  const agregadosRef = useRef(0);
  const terminadoRef = useRef(false);
  const nivelRef = useRef(nivel);
  const yaCompletadoRef = useRef(false);
  const guardadoRef = useRef(false);
  const pistasUsadasRef = useRef(0);
  const pistasEnVueloRef = useRef(0);
  const intentarRef = useRef<() => void>(() => {});
  const pildoraTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reproducirRef = useRef(reproducir);
  reproducirRef.current = reproducir;
  const sonidoRef = useRef(sonidoActivado);
  sonidoRef.current = sonidoActivado;

  // Animaciones
  const pEscala = useRef(new Animated.Value(1)).current;
  const pSube = useRef(new Animated.Value(0)).current;
  const pOpacidad = useRef(new Animated.Value(1)).current;
  const pSacude = useRef(new Animated.Value(0)).current;
  const ruedaEscala = useRef(new Animated.Value(1)).current;
  const botonPistaEscala = useRef(new Animated.Value(1)).current;
  const grillaEntrada = useRef(new Animated.Value(0)).current;
  const modalEscala = useRef(new Animated.Value(0)).current;

  // Saldo de pistas: se muestra al instante con lo que ya se sabe y se refresca desde el servidor.
  useEffect(() => {
    let vivo = true;
    obtenerProgresoPalabras()
      .then((p) => {
        guardarProgresoPalabras(p);
        yaCompletadoRef.current = p.nivelesCompletados.includes(numeroNivel);
        if (vivo) setPistas(p.pistas);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [numeroNivel]);

  // Cambio de nivel (o primer render): se reinicia todo.
  useEffect(() => {
    nivelRef.current = nivel;
    if (!nivel) return;
    const inicial = nivel.letras.map((_, i) => i);
    ordenRef.current = inicial;
    setOrden(inicial);
    seleccionRef.current = [];
    setSeleccion([]);
    setDedo(null);
    setEncontradas(new Set());
    setExtrasHalladas(new Set());
    setReveladas(new Set());
    setRetrasos({});
    setPildora(null);
    setTerminado(false);
    terminadoRef.current = false;
    setErrorGuardado(false);
    setPremio(0);
    guardadoRef.current = false;
    pistasUsadasRef.current = 0;
    yaCompletadoRef.current = !!leerProgresoPalabras()?.nivelesCompletados.includes(numeroNivel);
    grillaEntrada.setValue(0);
    Animated.spring(grillaEntrada, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }).start();
  }, [nivel, numeroNivel, grillaEntrada]);

  useEffect(() => () => {
    if (pildoraTimer.current) clearTimeout(pildoraTimer.current);
  }, []);

  const letrasGrilla = useMemo(() => (nivel ? letrasPorCelda(nivel) : new Map<string, string>()), [nivel]);

  const celdasVisibles = useMemo(() => {
    const visibles = new Set<string>(reveladas);
    if (nivel) for (const p of nivel.palabras) if (encontradas.has(p.palabra)) celdasDe(p).forEach((c) => visibles.add(c));
    return visibles;
  }, [nivel, encontradas, reveladas]);

  // Una palabra cuenta como hecha si la encontraron, o si ya se ven todas sus letras (por cruces y pistas).
  const palabrasHechas = useMemo(() => {
    const hechas = new Set<string>();
    if (!nivel) return hechas;
    for (const p of nivel.palabras) {
      if (encontradas.has(p.palabra) || celdasDe(p).every((c) => celdasVisibles.has(c))) hechas.add(p.palabra);
    }
    return hechas;
  }, [nivel, encontradas, celdasVisibles]);

  const palabrasHechasRef = useRef(palabrasHechas);
  palabrasHechasRef.current = palabrasHechas;
  const extrasRef = useRef(extrasHalladas);
  extrasRef.current = extrasHalladas;

  const completo = !!nivel && palabrasHechas.size === nivel.palabras.length;

  // ─── Píldora amarilla sobre la rueda: muestra la palabra que se está armando y los avisos ───
  const mostrarPildora = useCallback(
    (nueva: Pildora, duracion = 0) => {
      if (pildoraTimer.current) clearTimeout(pildoraTimer.current);
      setPildora(nueva);
      pSube.setValue(0);
      pOpacidad.setValue(1);
      pSacude.setValue(0);

      if (nueva.tipo === 'armando') {
        pEscala.setValue(0.9);
        Animated.spring(pEscala, { toValue: 1, friction: 6, tension: 220, useNativeDriver: true }).start();
        return;
      }
      if (nueva.tipo === 'ok' || nueva.tipo === 'extra') {
        pEscala.setValue(1);
        Animated.sequence([
          Animated.spring(pEscala, { toValue: 1.3, friction: 5, tension: 260, useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(pSube, { toValue: -90, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            Animated.timing(pOpacidad, { toValue: 0, duration: 380, useNativeDriver: true }),
            Animated.timing(pEscala, { toValue: 0.7, duration: 380, useNativeDriver: true }),
          ]),
        ]).start();
      } else if (nueva.tipo === 'error') {
        pEscala.setValue(1);
        Animated.sequence([-14, 14, -10, 10, -5, 0].map((v) => Animated.timing(pSacude, { toValue: v, duration: 55, useNativeDriver: true }))).start();
      } else {
        pEscala.setValue(1);
      }
      if (duracion > 0) pildoraTimer.current = setTimeout(() => setPildora(null), duracion);
    },
    [pEscala, pSube, pOpacidad, pSacude],
  );

  // ─── Guardado del avance (de fondo: el festejo no espera al servidor) ───
  const guardarNivel = useCallback(() => {
    setErrorGuardado(false);
    const usadas = pistasUsadasRef.current;
    encolarSincronizacion(() => completarNivelPalabras(numeroNivel, usadas))
      .then((r) => {
        guardarProgresoPalabras({ nivelesCompletados: r.nivelesCompletados, pistas: r.pistas });
        setPistas(r.pistas);
      })
      .catch(() => setErrorGuardado(true));
  }, [numeroNivel]);

  useEffect(() => {
    if (!completo || guardadoRef.current) return;
    guardadoRef.current = true;
    terminadoRef.current = true;
    const esNuevo = !yaCompletadoRef.current;
    // Premio inmediato (optimista): se ve al toque; el servidor confirma después.
    if (esNuevo) {
      const nuevoSaldo = ajustarPistas(PISTAS_POR_NIVEL);
      setPistas(nuevoSaldo);
      setPremio(PISTAS_POR_NIVEL);
    }
    marcarNivelCompletado(numeroNivel);
    yaCompletadoRef.current = true;
    if (sonidoRef.current) reproducirRef.current('puntaje_alto');
    // Pequeña pausa para que se vea terminar la última palabra en la grilla antes del festejo.
    const t = setTimeout(() => {
      setTerminado(true);
      modalEscala.setValue(0);
      Animated.spring(modalEscala, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
    }, 650);
    guardarNivel();
    return () => clearTimeout(t);
  }, [completo, guardarNivel, numeroNivel, modalEscala]);

  // ─── Lo que pasa al soltar el dedo ───
  const intentar = useCallback(() => {
    const n = nivelRef.current;
    const sel = seleccionRef.current;
    if (!n || terminadoRef.current) return;
    const palabra = sel.map((i) => n.letras[ordenRef.current[i]]).join('');
    const deslizo = agregadosRef.current >= 2;

    seleccionRef.current = [];
    setSeleccion([]);
    setDedo(null);
    if (!deslizo || !palabra) {
      // un toque suelto: no hace nada, solo se limpia
      if (pildoraTimer.current) clearTimeout(pildoraTimer.current);
      setPildora(null);
      return;
    }

    if (palabra.length < 3) {
      mostrarPildora({ texto: 'Muy corta, probá con 3 letras o más', tipo: 'info' }, 1800);
      return;
    }
    const enGrilla = n.palabras.find((p) => p.palabra === palabra);
    if (enGrilla) {
      if (palabrasHechasRef.current.has(palabra)) {
        mostrarPildora({ texto: 'Esa ya la tenés', tipo: 'info' }, 1500);
        return;
      }
      const demoras: Record<string, number> = {};
      celdasDe(enGrilla).forEach((c, i) => {
        demoras[c] = 180 + i * 90;
      });
      setRetrasos((r) => ({ ...r, ...demoras }));
      setEncontradas((e) => new Set(e).add(palabra));
      mostrarPildora({ texto: palabra, tipo: 'ok' });
      if (sonidoRef.current) reproducirRef.current('combinacion');
    } else if (n.extras.has(palabra)) {
      if (extrasRef.current.has(palabra)) {
        mostrarPildora({ texto: 'Esa ya la encontraste', tipo: 'info' }, 1500);
        return;
      }
      setExtrasHalladas((e) => new Set(e).add(palabra));
      mostrarPildora({ texto: `¡Palabra extra! ${palabra}`, tipo: 'extra' });
      if (sonidoRef.current) reproducirRef.current('linea_completa');
    } else {
      mostrarPildora({ texto: palabra, tipo: 'error' }, 900);
    }
  }, [mostrarPildora]);
  intentarRef.current = intentar;

  // ─── Deslizar el dedo por la rueda ───
  const procesarPunto = useCallback(
    (x: number, y: number) => {
      if (terminadoRef.current) return;
      const centros = centrosRef.current;
      const sel = seleccionRef.current;
      if (sel.length > 0) setDedo({ x, y });

      const acierto = centros.findIndex((c) => Math.hypot(c.x - x, c.y - y) <= RADIO_ACIERTO);
      if (acierto < 0) return;

      // Volver hacia atrás por la letra anterior la quita.
      if (sel.length >= 2 && acierto === sel[sel.length - 2]) {
        const nueva = sel.slice(0, -1);
        seleccionRef.current = nueva;
        setSeleccion(nueva);
        mostrarPildora({ texto: nueva.map((i) => nivelRef.current?.letras[ordenRef.current[i]] ?? '').join(''), tipo: 'armando' });
        return;
      }
      if (sel.includes(acierto)) return;

      const nueva = [...sel, acierto];
      seleccionRef.current = nueva;
      agregadosRef.current += 1;
      setSeleccion(nueva);
      setDedo({ x, y });
      setPildora({ texto: nueva.map((i) => nivelRef.current?.letras[ordenRef.current[i]] ?? '').join(''), tipo: 'armando' });
      if (pildoraTimer.current) clearTimeout(pildoraTimer.current);
      pEscala.setValue(1.12);
      Animated.spring(pEscala, { toValue: 1, friction: 6, tension: 300, useNativeDriver: true }).start();
      pSube.setValue(0);
      pOpacidad.setValue(1);
      pSacude.setValue(0);
      if (sonidoRef.current) reproducirRef.current('colocar');
    },
    [mostrarPildora, pEscala, pSube, pOpacidad, pSacude],
  );

  const procesarRef = useRef(procesarPunto);
  procesarRef.current = procesarPunto;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const ev = e.nativeEvent;
        origenRef.current = { x: ev.pageX - ev.locationX, y: ev.pageY - ev.locationY };
        agregadosRef.current = 0;
        procesarRef.current(ev.locationX, ev.locationY);
      },
      onPanResponderMove: (e) => {
        const ev = e.nativeEvent;
        procesarRef.current(ev.pageX - origenRef.current.x, ev.pageY - origenRef.current.y);
      },
      onPanResponderRelease: () => {
        // un instante para que React termine de aplicar la última letra
        setTimeout(() => intentarRef.current(), 20);
      },
      onPanResponderTerminate: () => {
        seleccionRef.current = [];
        setSeleccion([]);
        setDedo(null);
        setPildora(null);
      },
    }),
  ).current;

  // ─── Pista: se muestra al instante con animación; el servidor se entera de fondo ───
  const usarPista = () => {
    if (!nivel || terminadoRef.current) return;
    if (pistas !== null && pistas <= 0) {
      mostrarPildora({ texto: `Sin pistas. Ganás ${PISTAS_POR_NIVEL} al completar un nivel`, tipo: 'info' }, 2800);
      return;
    }
    const candidatas: string[] = [];
    for (const p of nivel.palabras) {
      if (palabrasHechas.has(p.palabra)) continue;
      for (const celda of celdasDe(p)) if (!celdasVisibles.has(celda)) candidatas.push(celda);
    }
    if (!candidatas.length) return;
    const elegida = candidatas[Math.floor(Math.random() * candidatas.length)];

    pistasUsadasRef.current += 1;
    setPistas(ajustarPistas(-1));
    setRetrasos((r) => ({ ...r, [elegida]: 120 }));
    setReveladas((rev) => new Set(rev).add(elegida));
    if (sonidoRef.current) reproducirRef.current('combinacion');
    botonPistaEscala.setValue(1);
    Animated.sequence([
      Animated.timing(botonPistaEscala, { toValue: 1.3, duration: 110, useNativeDriver: true }),
      Animated.spring(botonPistaEscala, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();

    // Sincronización de fondo: solo si el servidor dice que no había saldo se corrige el contador.
    pistasEnVueloRef.current += 1;
    encolarSincronizacion(() => usarPistaPalabras())
      .then((r) => {
        pistasEnVueloRef.current -= 1;
        // solo se toma el número del servidor cuando ya no quedan pedidos en camino (evita que el contador "parpadee")
        if (pistasEnVueloRef.current === 0) {
          guardarProgresoPalabras({ nivelesCompletados: leerProgresoPalabras()?.nivelesCompletados ?? [], pistas: r.pistas });
          setPistas(r.pistas);
        }
      })
      .catch(() => {
        pistasEnVueloRef.current -= 1;
      });
  };

  const mezclarRueda = () => {
    const nuevo = mezclar(ordenRef.current);
    ordenRef.current = nuevo;
    setOrden(nuevo);
    seleccionRef.current = [];
    setSeleccion([]);
    ruedaEscala.setValue(0.82);
    Animated.spring(ruedaEscala, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
  };

  const volver = () => router.replace('/mas/juegos/palabras' as never);
  const irAlSiguiente = () => {
    if (numeroNivel >= TOTAL_NIVELES_PALABRAS) volver();
    else router.replace({ pathname: '/mas/juegos/palabras-juego', params: { nivel: String(numeroNivel + 1) } } as never);
  };

  if (!nivel) {
    return (
      <View style={styles.container}>
        <FondoPalabras mundo={mundo} />
        <TouchableOpacity style={[styles.volver, { marginTop: insets.top + 8, marginLeft: 12 }]} onPress={volver} accessibilityRole="button" accessibilityLabel="Volver">
          <Text style={styles.volverTexto}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.vacio}>No se encontró este nivel.</Text>
      </View>
    );
  }

  // ─── Medidas ───
  const ALTO_BARRA = 88;
  const ALTO_PILDORA = 76;
  const RESERVA_CONTADOR = 30; // lugar propio para "X / Y palabras", así no se pisa con la grilla
  const diametro = Math.round(Math.min(width - 24, 340, (height - insets.top - insets.bottom - ALTO_BARRA - ALTO_PILDORA) * 0.52));
  const radioRueda = diametro / 2 - TAM_LETRA / 2 - 14;
  const altoGrilla = Math.max(height - insets.top - insets.bottom - ALTO_BARRA - ALTO_PILDORA - diametro - 28, 150);
  const celda = Math.max(30, Math.min(56, Math.floor((width - 40) / nivel.ancho), Math.floor((altoGrilla - RESERVA_CONTADOR) / nivel.alto)));
  const anchoGrilla = celda * nivel.ancho;
  const altoGrillaReal = celda * nivel.alto;

  const centros: Punto[] = orden.map((_, posicion) => {
    const angulo = (posicion / orden.length) * Math.PI * 2 - Math.PI / 2;
    return { x: diametro / 2 + radioRueda * Math.cos(angulo), y: diametro / 2 + radioRueda * Math.sin(angulo) };
  });
  centrosRef.current = centros;

  const trazo = (a: Punto, b: Punto, clave: string) => {
    const largo = Math.hypot(b.x - a.x, b.y - a.y);
    const angulo = Math.atan2(b.y - a.y, b.x - a.x);
    return (
      <View
        key={clave}
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: (a.x + b.x) / 2 - largo / 2,
          top: (a.y + b.y) / 2 - 8,
          width: largo,
          height: 16,
          borderRadius: 8,
          backgroundColor: AMARILLO,
          transform: [{ rotate: `${angulo}rad` }],
        }}
      />
    );
  };

  const sinSeleccion: ViewStyle | null = Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none' } as unknown as ViewStyle) : null;
  const colorPildora =
    pildora?.tipo === 'error' ? '#E53935' : pildora?.tipo === 'extra' ? '#29B6F6' : pildora?.tipo === 'info' ? 'rgba(20,30,60,0.78)' : AMARILLO;
  const textoPildora = pildora?.tipo === 'armando' || pildora?.tipo === 'ok' || !pildora ? MARRON : '#FFFFFF';
  const esMensajeLargo = !!pildora && pildora.texto.length > 12 && pildora.tipo !== 'armando' && pildora.tipo !== 'ok';

  return (
    <View style={styles.container}>
      <FondoPalabras mundo={mundo} />

      {/* Barra superior */}
      <View style={[styles.barra, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={styles.volver} onPress={volver} accessibilityRole="button" accessibilityLabel="Volver a los niveles">
          <Text style={styles.volverTexto}>‹</Text>
        </TouchableOpacity>
        <View style={styles.tituloCaja}>
          <Text style={styles.tituloNivel} allowFontScaling={false}>Nivel {numeroNivel}</Text>
          <Text style={styles.tituloMundo} allowFontScaling={false}>{mundo.emoji} {mundo.nombre}</Text>
        </View>
        <TouchableOpacity style={styles.volver} onPress={reopenTutorial} accessibilityRole="button" accessibilityLabel="¿Cómo se juega?">
          <Text style={styles.ayudaTexto}>?</Text>
        </TouchableOpacity>
      </View>

      {/* Grilla */}
      <View style={[styles.zonaGrilla, { height: altoGrilla, paddingBottom: RESERVA_CONTADOR }]}>
        <Animated.View
          style={{
            width: anchoGrilla,
            height: altoGrillaReal,
            opacity: grillaEntrada,
            transform: [{ scale: grillaEntrada.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
          }}
        >
          {Array.from(letrasGrilla.entries()).map(([clave, letra]) => {
            const [f, c] = clave.split(',').map(Number);
            const visible = celdasVisibles.has(clave);
            const porPista = reveladas.has(clave) && !encontradas.has(nivel.palabras.find((p) => celdasDe(p).includes(clave))?.palabra ?? '');
            return (
              <CeldaGrilla key={clave} letra={letra} visible={visible} porPista={porPista} tam={celda} retraso={retrasos[clave] ?? 0} x={c * celda} y={f * celda} />
            );
          })}
        </Animated.View>
        <Text style={styles.contador} allowFontScaling={false}>
          {palabrasHechas.size} / {nivel.palabras.length} palabras{extrasHalladas.size > 0 ? `  ·  ${extrasHalladas.size} extra` : ''}
        </Text>
      </View>

      {/* Píldora con la palabra que se va armando */}
      <View style={[styles.zonaPildora, { height: ALTO_PILDORA }]} pointerEvents="none">
        {pildora ? (
          <Animated.View
            style={[
              styles.pildora,
              { backgroundColor: colorPildora },
              { opacity: pOpacidad, transform: [{ translateY: pSube }, { translateX: pSacude }, { scale: pEscala }] },
            ]}
          >
            <Text
              style={[styles.pildoraTexto, { color: textoPildora, fontSize: esMensajeLargo ? 20 : 34, letterSpacing: esMensajeLargo ? 0 : 5 }]}
              allowFontScaling={false}
              accessibilityLiveRegion="polite"
            >
              {pildora.texto}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      {/* Rueda */}
      <View style={{ alignItems: 'center', paddingBottom: insets.bottom + 10 }}>
        <Animated.View style={{ transform: [{ scale: ruedaEscala }] }}>
          <View
            style={[styles.rueda, { width: diametro, height: diametro, borderRadius: diametro / 2 }, sinSeleccion]}
            {...pan.panHandlers}
            accessibilityLabel="Rueda de letras. Deslizá el dedo por las letras para armar una palabra"
          >
            {/* trazo entre las letras elegidas */}
            {seleccion.slice(1).map((pos, i) => trazo(centros[seleccion[i]], centros[pos], `t${i}`))}
            {seleccion.length > 0 && dedo ? trazo(centros[seleccion[seleccion.length - 1]], dedo, 'dedo') : null}

            {orden.map((indiceLetra, posicion) => {
              const elegida = seleccion.includes(posicion);
              const c = centros[posicion];
              return (
                <View key={`${indiceLetra}-${posicion}`} pointerEvents="none" style={[styles.letraBase, { left: c.x - TAM_LETRA / 2, top: c.y - TAM_LETRA / 2 }, elegida && styles.letraElegida]}>
                  <Text style={[styles.letraTexto, elegida && styles.letraTextoElegida]} allowFontScaling={false}>
                    {nivel.letras[indiceLetra]}
                  </Text>
                </View>
              );
            })}

            {/* Mezclar, en el centro */}
            <TouchableOpacity style={styles.mezclar} onPress={mezclarRueda} accessibilityRole="button" accessibilityLabel="Mezclar las letras">
              <Text style={styles.mezclarTexto}>🔀</Text>
            </TouchableOpacity>
          </View>

          {/* Pista, en la esquina de la rueda */}
          <Animated.View style={[styles.pistaCaja, { transform: [{ scale: botonPistaEscala }] }]}>
            <TouchableOpacity
              style={styles.pista}
              onPress={usarPista}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Usar una pista. ${pistas === null ? '' : `Te quedan ${pistas}`}`}
            >
              <Text style={styles.pistaEmoji}>💡</Text>
            </TouchableOpacity>
            <View style={styles.pistaContador} pointerEvents="none">
              <Text style={styles.pistaContadorTexto} allowFontScaling={false}>{pistas ?? '·'}</Text>
            </View>
          </Animated.View>
        </Animated.View>
      </View>

      {/* Cómo se juega (la primera vez se muestra solo) */}
      <Modal visible={showTutorial} transparent animationType="fade">
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <Text style={styles.modalTitulo}>¿Cómo se juega?</Text>
            <Text style={styles.modalTexto}>
              1. Apoyá el dedo en una letra y <Text style={styles.negrita}>deslizalo</Text> por las demás, sin levantarlo.{'\n\n'}
              2. Al soltar, la palabra se prueba sola. Si está en el tablero, aparece escrita.{'\n\n'}
              3. Si te trabás, tocá la <Text style={styles.negrita}>lamparita 💡</Text>: te muestro una letra. Ganás {PISTAS_POR_NIVEL} pistas cada vez que completás un nivel.{'\n\n'}
              No hay tiempo ni se pierden vidas. ¡Jugá con calma!
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={dismissTutorial} accessibilityRole="button">
              <Text style={styles.modalBtnTexto}>¡Entendido!</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalEscuchar}
              onPress={() =>
                void hablar(
                  `Apoyá el dedo en una letra y deslizalo por las demás, sin levantarlo. Al soltar, la palabra se prueba sola. Si te trabás, tocá la lamparita y te muestro una letra. Ganás ${PISTAS_POR_NIVEL} pistas cada vez que completás un nivel. No hay tiempo ni se pierden vidas.`,
                )
              }
              accessibilityRole="button"
            >
              <Text style={styles.modalEscucharTexto}>Escuchar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Nivel completado */}
      <Modal visible={terminado} transparent animationType="fade">
        <View style={styles.modalFondo}>
          <Confeti />
          <Animated.View style={[styles.modalCaja, { transform: [{ scale: modalEscala }] }]}>
            <Text style={styles.festejo}>🎉</Text>
            <Text style={styles.modalTitulo}>¡Nivel {numeroNivel} completado!</Text>
            {premio > 0 ? <Text style={styles.premio}>💡 Ganaste {premio} pistas</Text> : null}
            {errorGuardado ? (
              <TouchableOpacity style={styles.modalReintentar} onPress={guardarNivel} accessibilityRole="button">
                <Text style={styles.modalReintentarTexto}>No se guardó tu avance. Tocá para reintentar</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.modalBtn} onPress={irAlSiguiente} accessibilityRole="button">
              <Text style={styles.modalBtnTexto}>{numeroNivel >= TOTAL_NIVELES_PALABRAS ? 'Volver a los niveles' : 'Siguiente nivel ›'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSecundario} onPress={volver} accessibilityRole="button">
              <Text style={styles.modalSecundarioTexto}>Ver todos los niveles</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const sombra = { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 } as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B3C5D' },
  vacio: { fontSize: 22, textAlign: 'center', margin: 24, color: '#FFFFFF' },

  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 6 },
  volver: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  volverTexto: { fontSize: 52, lineHeight: 56, color: '#FFFFFF', fontWeight: '700', marginTop: -6 },
  ayudaTexto: { fontSize: 36, color: '#FFFFFF', fontWeight: '800' },
  tituloCaja: { alignItems: 'center' },
  tituloNivel: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  tituloMundo: { fontSize: 22, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },

  zonaGrilla: { alignItems: 'center', justifyContent: 'center' },
  celda: { borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
  celdaVisible: { backgroundColor: AMARILLO, borderColor: AMARILLO_OSCURO },
  celdaPista: { backgroundColor: '#FFE08A', borderColor: '#FFFFFF' },
  celdaLetra: { fontWeight: '800', color: MARRON },
  contador: { position: 'absolute', bottom: -6, fontSize: 17, fontWeight: '700', color: 'rgba(255,255,255,0.95)', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },

  zonaPildora: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  pildora: { minHeight: 52, minWidth: 90, paddingHorizontal: 22, paddingVertical: 6, borderRadius: 26, alignItems: 'center', justifyContent: 'center', ...sombra },
  pildoraTexto: { fontWeight: '800', textAlign: 'center' },

  rueda: { backgroundColor: 'rgba(240,244,250,0.9)', ...sombra },
  letraBase: { position: 'absolute', width: TAM_LETRA, height: TAM_LETRA, borderRadius: TAM_LETRA / 2, alignItems: 'center', justifyContent: 'center' },
  letraElegida: { backgroundColor: AMARILLO, transform: [{ scale: 1.08 }], ...sombra },
  letraTexto: { fontSize: 44, fontWeight: '800', color: TINTA },
  letraTextoElegida: { color: '#FFFFFF', textShadowColor: 'rgba(120,80,0,0.55)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  mezclar: { position: 'absolute', alignSelf: 'center', top: '50%', left: '50%', marginLeft: -30, marginTop: -30, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(43,58,85,0.1)', alignItems: 'center', justifyContent: 'center' },
  mezclarTexto: { fontSize: 30, opacity: 0.7 },

  pistaCaja: { position: 'absolute', right: -4, top: -4 },
  pista: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: AMARILLO, alignItems: 'center', justifyContent: 'center', ...sombra },
  pistaEmoji: { fontSize: 32 },
  pistaContador: { position: 'absolute', right: -6, bottom: -6, minWidth: 28, height: 28, paddingHorizontal: 6, borderRadius: 14, backgroundColor: '#E53935', borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  pistaContadorTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCaja: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignSelf: 'stretch', maxWidth: 460, gap: 14 },
  modalTitulo: { fontSize: 26, fontWeight: '800', textAlign: 'center', color: '#1B1B2F' },
  modalTexto: { fontSize: 19, lineHeight: 28, color: '#1B1B2F' },
  negrita: { fontWeight: '800' },
  modalBtn: { minHeight: 60, borderRadius: 18, backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center' },
  modalBtnTexto: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  modalEscuchar: { minHeight: 52, borderRadius: 16, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  modalEscucharTexto: { fontSize: 18, fontWeight: '700', color: '#1B5E3B' },
  modalSecundario: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  modalSecundarioTexto: { fontSize: 18, fontWeight: '700', color: '#5E35B1' },
  modalReintentar: { minHeight: 52, borderRadius: 14, backgroundColor: '#FDECEA', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  modalReintentarTexto: { fontSize: 16, fontWeight: '700', color: '#B71C1C', textAlign: 'center' },
  festejo: { fontSize: 64, textAlign: 'center' },
  premio: { fontSize: 22, fontWeight: '800', textAlign: 'center', color: '#7A5B00' },
});
