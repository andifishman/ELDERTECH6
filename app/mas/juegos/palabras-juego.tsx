// Juego "Palabras" — rueda de letras + crucigrama (estilo Wordscapes), pensado para adultos mayores:
//   · Se arma la palabra TOCANDO las letras una por una (sin arrastrar: arrastrar con precisión es difícil).
//   · Sin tiempo, sin vidas, sin penalidad: una palabra que no existe solo se borra con un aviso amable.
//   · Pistas: cada nivel completado da 3; una pista revela una letra de una palabra que falta.
//   · Los acentos no cuentan (se escribe CANCION, no CANCIÓN).
import AppHeader from '@/components/ui/AppHeader';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useSonidoJuegos } from '@/context/SonidoJuegosContext';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useTutorial } from '@/hooks/useTutorial';
import { completarNivelPalabras, obtenerProgresoPalabras, usarPistaPalabras } from '@/services/juegosService';
import { hablar } from '@/utils/tts';
import {
  celdasDe,
  letrasPorCelda,
  obtenerNivelPalabras,
  PISTAS_POR_NIVEL,
  TOTAL_NIVELES_PALABRAS,
} from '@/utils/palabrasNiveles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAM_LETRA_RUEDA = 64;

type Aviso = { texto: string; tipo: 'ok' | 'extra' | 'info' | 'error' } | null;

function mezclar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export default function PalabrasJuegoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { nivel: nivelParam } = useLocalSearchParams<{ nivel?: string }>();
  const numeroNivel = Math.min(Math.max(parseInt(nivelParam ?? '1', 10) || 1, 1), TOTAL_NIVELES_PALABRAS);
  const nivel = useMemo(() => obtenerNivelPalabras(numeroNivel), [numeroNivel]);

  const { showTutorial, dismissTutorial, reopenTutorial } = useTutorial('palabras');
  const { sonidoActivado } = useSonidoJuegos();
  const { reproducir } = useGameSounds();

  const [orden, setOrden] = useState<number[]>(() => (nivel ? nivel.letras.map((_, i) => i) : []));
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [encontradas, setEncontradas] = useState<Set<string>>(new Set());
  const [extrasHalladas, setExtrasHalladas] = useState<Set<string>>(new Set());
  const [reveladas, setReveladas] = useState<Set<string>>(new Set());
  const [pistas, setPistas] = useState<number | null>(null);
  const [pistasUsadasEnNivel, setPistasUsadasEnNivel] = useState(0);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [terminado, setTerminado] = useState(false);
  const [premio, setPremio] = useState<number>(0);
  const [errorGuardado, setErrorGuardado] = useState(false);
  const guardadoRef = useRef(false);
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Saldo de pistas del servidor.
  useEffect(() => {
    let vivo = true;
    obtenerProgresoPalabras()
      .then((p) => vivo && setPistas(p.pistas))
      .catch(() => vivo && setPistas(null));
    return () => {
      vivo = false;
    };
  }, []);

  // Al cambiar de nivel (siguiente nivel) se reinicia todo.
  useEffect(() => {
    if (!nivel) return;
    setOrden(nivel.letras.map((_, i) => i));
    setSeleccion([]);
    setEncontradas(new Set());
    setExtrasHalladas(new Set());
    setReveladas(new Set());
    setPistasUsadasEnNivel(0);
    setAviso(null);
    setTerminado(false);
    setErrorGuardado(false);
    guardadoRef.current = false;
  }, [nivel]);

  useEffect(() => () => {
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
  }, []);

  const letrasGrilla = useMemo(() => (nivel ? letrasPorCelda(nivel) : new Map<string, string>()), [nivel]);

  // Celdas visibles = palabras encontradas + letras reveladas con pistas.
  const celdasVisibles = useMemo(() => {
    const visibles = new Set<string>(reveladas);
    if (nivel) {
      for (const p of nivel.palabras) {
        if (encontradas.has(p.palabra)) celdasDe(p).forEach((c) => visibles.add(c));
      }
    }
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

  const completo = !!nivel && palabrasHechas.size === nivel.palabras.length;

  const mostrarAviso = useCallback((nuevo: Aviso, ms = 2200) => {
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    setAviso(nuevo);
    if (nuevo) avisoTimer.current = setTimeout(() => setAviso(null), ms);
  }, []);

  const guardarNivel = useCallback(async () => {
    setErrorGuardado(false);
    try {
      const r = await completarNivelPalabras(numeroNivel, pistasUsadasEnNivel);
      setPistas(r.pistas);
      setPremio(r.nuevo ? PISTAS_POR_NIVEL : 0);
    } catch {
      setErrorGuardado(true);
    }
  }, [numeroNivel, pistasUsadasEnNivel]);

  // Nivel completo: se guarda una sola vez y se muestra el festejo.
  useEffect(() => {
    if (!completo || guardadoRef.current) return;
    guardadoRef.current = true;
    setTerminado(true);
    if (sonidoActivado) void reproducir('puntaje_alto');
    void guardarNivel();
  }, [completo, guardarNivel, reproducir, sonidoActivado]);

  const palabraActual = seleccion.map((i) => nivel?.letras[orden[i]] ?? '').join('');

  const tocarLetra = (posicion: number) => {
    if (terminado || seleccion.includes(posicion)) return;
    setSeleccion((s) => [...s, posicion]);
    setAviso(null);
  };

  const borrar = () => {
    setSeleccion((s) => s.slice(0, -1));
    setAviso(null);
  };

  const mezclarRueda = () => {
    setOrden((o) => mezclar(o));
    setSeleccion([]);
  };

  const probar = () => {
    if (!nivel || terminado) return;
    const palabra = palabraActual;
    if (palabra.length < 3) {
      mostrarAviso({ texto: 'Tocá al menos 3 letras para armar una palabra', tipo: 'info' });
      return;
    }
    const enGrilla = nivel.palabras.find((p) => p.palabra === palabra);
    if (enGrilla) {
      if (palabrasHechas.has(palabra)) {
        mostrarAviso({ texto: 'Esa palabra ya la tenés', tipo: 'info' });
      } else {
        setEncontradas((e) => new Set(e).add(palabra));
        mostrarAviso({ texto: '¡Muy bien!', tipo: 'ok' });
        if (sonidoActivado) void reproducir('combinacion');
      }
    } else if (nivel.extras.has(palabra)) {
      if (extrasHalladas.has(palabra)) {
        mostrarAviso({ texto: 'Esa palabra ya la encontraste', tipo: 'info' });
      } else {
        setExtrasHalladas((e) => new Set(e).add(palabra));
        mostrarAviso({ texto: '¡Palabra extra! Muy bien', tipo: 'extra' });
        if (sonidoActivado) void reproducir('colocar');
      }
    } else {
      mostrarAviso({ texto: 'Esa palabra no está en este nivel. ¡Probá con otra!', tipo: 'error' });
    }
    setSeleccion([]);
  };

  const usarPista = async () => {
    if (!nivel || terminado) return;
    if (pistas !== null && pistas <= 0) {
      mostrarAviso({ texto: `No te quedan pistas. Ganás ${PISTAS_POR_NIVEL} al completar un nivel`, tipo: 'info' }, 3200);
      return;
    }
    // Se elige una letra de una palabra que todavía falta.
    const candidatas: string[] = [];
    for (const p of nivel.palabras) {
      if (palabrasHechas.has(p.palabra)) continue;
      for (const celda of celdasDe(p)) if (!celdasVisibles.has(celda)) candidatas.push(celda);
    }
    if (!candidatas.length) return;
    const elegida = candidatas[Math.floor(Math.random() * candidatas.length)];

    try {
      const r = await usarPistaPalabras();
      setPistas(r.pistas);
      setReveladas((rev) => new Set(rev).add(elegida));
      setPistasUsadasEnNivel((n) => n + 1);
      mostrarAviso({ texto: 'Te mostré una letra', tipo: 'info' });
    } catch (err) {
      const mensaje = err instanceof Error && err.message ? err.message : 'No se pudo usar la pista. Probá de nuevo';
      mostrarAviso({ texto: mensaje, tipo: 'error' }, 3200);
    }
  };

  const irAlSiguiente = () => {
    if (numeroNivel >= TOTAL_NIVELES_PALABRAS) {
      router.replace('/mas/juegos/palabras' as never);
    } else {
      router.replace({ pathname: '/mas/juegos/palabras-juego', params: { nivel: String(numeroNivel + 1) } } as never);
    }
  };

  if (!nivel) {
    return (
      <View style={styles.container}>
        <AppHeader title="Palabras" showBack />
        <Text style={styles.vacio}>No se encontró este nivel.</Text>
      </View>
    );
  }

  // ─── Medidas: la grilla se achica para que todo entre sin scroll en la mayoría de celulares ───
  const diametro = Math.min(width - 48, 290);
  const radio = diametro / 2 - TAM_LETRA_RUEDA / 2 - 6;
  const altoDisponibleGrilla = Math.max(height - 130 - 70 - 64 - diametro - 90 - insets.top - insets.bottom, 140);
  const celda = Math.max(30, Math.min(54, Math.floor((width - 40) / nivel.ancho), Math.floor(altoDisponibleGrilla / nivel.alto)));

  const textoAviso = aviso?.texto ?? null;

  return (
    <View style={styles.container}>
      <AppHeader title={`Palabras · Nivel ${numeroNivel}`} showBack />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>
        {/* Barra superior: pistas y ayuda */}
        <View style={styles.barra}>
          <TouchableOpacity
            style={styles.pistaBtn}
            onPress={usarPista}
            accessibilityLabel={`Usar una pista. Te quedan ${pistas ?? 'algunas'}`}
            accessibilityRole="button"
          >
            <Text style={styles.pistaTexto}>💡 Pista{pistas !== null ? ` (${pistas})` : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ayudaBtn} onPress={reopenTutorial} accessibilityLabel="¿Cómo se juega?" accessibilityRole="button">
            <Text style={styles.ayudaTexto}>❓ ¿Cómo se juega?</Text>
          </TouchableOpacity>
        </View>

        {/* Grilla estilo crucigrama */}
        <View style={[styles.grilla, { width: celda * nivel.ancho, height: celda * nivel.alto }]}>
          {Array.from(letrasGrilla.entries()).map(([clave, letra]) => {
            const [f, c] = clave.split(',').map(Number);
            const visible = celdasVisibles.has(clave);
            const porPista = reveladas.has(clave) && !nivel.palabras.some((p) => palabrasHechas.has(p.palabra) && celdasDe(p).includes(clave));
            return (
              <View
                key={clave}
                style={[
                  styles.celda,
                  { left: c * celda, top: f * celda, width: celda - 4, height: celda - 4 },
                  visible && styles.celdaVisible,
                  porPista && styles.celdaPista,
                ]}
              >
                {visible ? <Text style={[styles.celdaLetra, { fontSize: Math.round(celda * 0.55) }]}>{letra}</Text> : null}
              </View>
            );
          })}
        </View>

        {/* Aviso + palabra que se está armando */}
        <View style={styles.zonaPalabra}>
          {textoAviso ? (
            <Text
              style={[
                styles.aviso,
                aviso?.tipo === 'ok' && styles.avisoOk,
                aviso?.tipo === 'extra' && styles.avisoExtra,
                aviso?.tipo === 'error' && styles.avisoError,
              ]}
              accessibilityLiveRegion="polite"
            >
              {textoAviso}
            </Text>
          ) : (
            <Text style={styles.palabraActual} accessibilityLabel={palabraActual ? `Palabra: ${palabraActual}` : 'Todavía no tocaste letras'}>
              {palabraActual || 'Tocá las letras'}
            </Text>
          )}
        </View>

        {/* Rueda de letras */}
        <View style={[styles.rueda, { width: diametro, height: diametro, borderRadius: diametro / 2 }]}>
          {orden.map((indiceLetra, posicion) => {
            const angulo = (posicion / orden.length) * Math.PI * 2 - Math.PI / 2;
            const x = diametro / 2 + radio * Math.cos(angulo) - TAM_LETRA_RUEDA / 2;
            const y = diametro / 2 + radio * Math.sin(angulo) - TAM_LETRA_RUEDA / 2;
            const usada = seleccion.includes(posicion);
            const letra = nivel.letras[indiceLetra];
            return (
              <TouchableOpacity
                key={`${indiceLetra}-${posicion}`}
                style={[styles.letraRueda, { left: x, top: y }, usada && styles.letraRuedaUsada]}
                onPress={() => tocarLetra(posicion)}
                activeOpacity={0.7}
                accessibilityLabel={`Letra ${letra}${usada ? ', ya elegida' : ''}`}
                accessibilityRole="button"
              >
                <Text style={[styles.letraRuedaTexto, usada && styles.letraRuedaTextoUsada]}>{letra}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Acciones */}
        <View style={styles.acciones}>
          <TouchableOpacity style={[styles.accionBtn, styles.accionSecundaria]} onPress={borrar} accessibilityLabel="Borrar la última letra" accessibilityRole="button">
            <Text style={styles.accionSecundariaTexto}>⌫ Borrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.accionBtn, styles.accionPrincipal]} onPress={probar} accessibilityLabel="Probar esta palabra" accessibilityRole="button">
            <Text style={styles.accionPrincipalTexto}>✔ Probar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.accionBtn, styles.accionSecundaria]} onPress={mezclarRueda} accessibilityLabel="Mezclar las letras" accessibilityRole="button">
            <Text style={styles.accionSecundariaTexto}>🔀 Mezclar</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.progreso}>
          Palabras: {palabrasHechas.size} de {nivel.palabras.length}
          {extrasHalladas.size > 0 ? `  ·  Extras: ${extrasHalladas.size}` : ''}
        </Text>
      </ScrollView>

      {/* Cómo se juega (la primera vez se muestra solo) */}
      <Modal visible={showTutorial} transparent animationType="fade">
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <Text style={styles.modalTitulo}>¿Cómo se juega?</Text>
            <Text style={styles.modalTexto}>
              1. Tocá las letras del círculo, una por una, para armar una palabra.{'\n\n'}
              2. Apretá “Probar”. Si está en el tablero, se escribe sola.{'\n\n'}
              3. Si te trabás, tocá “Pista”: te muestro una letra. Ganás {PISTAS_POR_NIVEL} pistas cada vez que completás un nivel.{'\n\n'}
              No hay tiempo ni se pierden vidas. ¡Jugá con calma!
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={dismissTutorial} accessibilityRole="button">
              <Text style={styles.modalBtnTexto}>¡Entendido!</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalEscuchar}
              onPress={() =>
                void hablar(
                  `Tocá las letras del círculo, una por una, para armar una palabra. Después apretá Probar. Si te trabás, tocá Pista y te muestro una letra. Ganás ${PISTAS_POR_NIVEL} pistas cada vez que completás un nivel. No hay tiempo ni se pierden vidas.`,
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
          <View style={styles.modalCaja}>
            <Text style={styles.festejo}>🎉</Text>
            <Text style={styles.modalTitulo}>¡Nivel {numeroNivel} completado!</Text>
            {errorGuardado ? (
              <>
                <Text style={styles.modalTexto}>No pude guardar tu avance (revisá la conexión).</Text>
                <TouchableOpacity style={styles.modalBtn} onPress={() => void guardarNivel()} accessibilityRole="button">
                  <Text style={styles.modalBtnTexto}>Reintentar guardar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {premio > 0 ? <Text style={styles.premio}>💡 Ganaste {premio} pistas</Text> : null}
                <TouchableOpacity style={styles.modalBtn} onPress={irAlSiguiente} accessibilityRole="button">
                  <Text style={styles.modalBtnTexto}>{numeroNivel >= TOTAL_NIVELES_PALABRAS ? 'Volver a los niveles' : 'Siguiente nivel ›'}</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.modalSecundario} onPress={() => router.replace('/mas/juegos/palabras' as never)} accessibilityRole="button">
              <Text style={styles.modalSecundarioTexto}>Ver todos los niveles</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const PURPURA = '#5E35B1';
const PURPURA_CLARO = '#EDE7F6';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: Spacing.md },
  vacio: { fontSize: FontSizes.lg, textAlign: 'center', margin: Spacing.xl, color: Colors.textSecondary },

  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', gap: Spacing.sm },
  pistaBtn: {
    minHeight: 52,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: '#FFF3CD',
    borderWidth: 2,
    borderColor: '#F5B700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pistaTexto: { fontSize: FontSizes.md, fontWeight: '700', color: '#7A5B00' },
  ayudaBtn: { minHeight: 52, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.infoLight, alignItems: 'center', justifyContent: 'center' },
  ayudaTexto: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.info },

  grilla: { position: 'relative', marginVertical: Spacing.xs },
  celda: { position: 'absolute', margin: 2, borderRadius: 8, backgroundColor: PURPURA_CLARO, borderWidth: 2, borderColor: '#B39DDB', alignItems: 'center', justifyContent: 'center' },
  celdaVisible: { backgroundColor: '#FFFFFF', borderColor: PURPURA },
  celdaPista: { backgroundColor: '#FFF8E1', borderColor: '#F5B700' },
  celdaLetra: { fontWeight: '800', color: '#311B92' },

  zonaPalabra: { minHeight: 56, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  palabraActual: { fontSize: 34, fontWeight: '800', letterSpacing: 6, color: PURPURA },
  aviso: { fontSize: FontSizes.lg, fontWeight: '700', textAlign: 'center', color: Colors.textSecondary },
  avisoOk: { color: Colors.success },
  avisoExtra: { color: '#0277BD' },
  avisoError: { color: '#B71C1C' },

  rueda: { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#D1C4E9', elevation: 3, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  letraRueda: { position: 'absolute', width: TAM_LETRA_RUEDA, height: TAM_LETRA_RUEDA, borderRadius: TAM_LETRA_RUEDA / 2, backgroundColor: PURPURA_CLARO, borderWidth: 2, borderColor: PURPURA, alignItems: 'center', justifyContent: 'center' },
  letraRuedaUsada: { backgroundColor: PURPURA },
  letraRuedaTexto: { fontSize: 34, fontWeight: '800', color: '#311B92' },
  letraRuedaTextoUsada: { color: '#FFFFFF' },

  acciones: { flexDirection: 'row', gap: Spacing.sm, alignSelf: 'stretch' },
  accionBtn: { flex: 1, minHeight: 60, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  accionPrincipal: { flex: 1.3, backgroundColor: Colors.primary },
  accionPrincipalTexto: { fontSize: FontSizes.lg, fontWeight: '800', color: '#FFFFFF' },
  accionSecundaria: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#B39DDB' },
  accionSecundariaTexto: { fontSize: FontSizes.md, fontWeight: '700', color: PURPURA },
  progreso: { fontSize: FontSizes.md, color: Colors.textSecondary, fontWeight: '600' },

  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  modalCaja: { backgroundColor: '#FFFFFF', borderRadius: Radius.lg, padding: Spacing.xl, alignSelf: 'stretch', maxWidth: 460, gap: Spacing.md },
  modalTitulo: { fontSize: FontSizes.xl, fontWeight: '800', textAlign: 'center', color: Colors.textPrimary },
  modalTexto: { fontSize: FontSizes.md, lineHeight: 26, color: Colors.textPrimary },
  modalBtn: { minHeight: 56, borderRadius: Radius.lg, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  modalBtnTexto: { fontSize: FontSizes.lg, fontWeight: '800', color: '#FFFFFF' },
  modalEscuchar: { minHeight: 52, borderRadius: Radius.lg, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  modalEscucharTexto: { fontSize: FontSizes.md, fontWeight: '700', color: '#1B5E3B' },
  modalSecundario: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  modalSecundarioTexto: { fontSize: FontSizes.md, fontWeight: '700', color: PURPURA },
  festejo: { fontSize: 56, textAlign: 'center' },
  premio: { fontSize: FontSizes.lg, fontWeight: '700', textAlign: 'center', color: '#7A5B00' },
});
