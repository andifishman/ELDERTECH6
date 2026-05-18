/**
 * DaySelector.tsx
 * ───────────────
 * Carrusel de días para la pantalla de Horarios.
 *
 * Muestra 5 días a la vez con flechas de navegación a los costados.
 * Al tocar una flecha se avanza/retrocede UN día y se cargan los horarios de ese día.
 * Si el usuario llega al borde de los días cargados, se llama a `onPedirMasDias`
 * para que la pantalla padre expanda la ventana de días disponibles.
 *
 * Diseño pensado para personas mayores:
 *  - Números grandes y legibles (22px)
 *  - Flechas amplias (44×64px) fáciles de tocar
 *  - Sin negritas — el color y el tamaño distinguen el día activo
 *  - El día de hoy tiene un borde rojo cuando no está seleccionado
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { getDiaLetra, esMismodia } from '@/utils/dateUtils';

interface DaySelectorProps {
  /** Lista completa de días disponibles para navegar */
  semana: Date[];
  /** Día actualmente seleccionado (resaltado en rojo) */
  diaSeleccionado: Date;
  /** Callback al seleccionar un día — actualiza los horarios mostrados */
  onSeleccionar: (dia: Date) => void;
  /** Callback cuando el usuario quiere ir más allá del límite de días cargados */
  onPedirMasDias: (direccion: 'atras' | 'adelante') => void;
}

/** Cantidad de días visibles simultáneamente en el carrusel */
const VISIBLE = 5;

export function DaySelector({ semana, diaSeleccionado, onSeleccionar, onPedirMasDias }: DaySelectorProps) {
  // Índice del primer día visible en la ventana del carrusel
  const [inicio, setInicio] = useState(0);

  /**
   * Al montar el componente o cuando cambia la lista de días,
   * posicionar la ventana para mostrar: ayer + hoy + 3 días siguientes.
   * Esto da contexto inmediato al usuario sin necesidad de navegar.
   */
  useEffect(() => {
    const hoy = new Date();
    const idxHoy = semana.findIndex((d) => esMismodia(d, hoy));
    const idxInicio = idxHoy > 0 ? idxHoy - 1 : 0;
    const maxInicio = Math.max(0, semana.length - VISIBLE);
    setInicio(Math.min(idxInicio, maxInicio));
  }, [semana]);

  /**
   * Cuando el día seleccionado cambia (por toque en un día o por flecha),
   * ajustar la ventana para que el día seleccionado siempre sea visible.
   */
  useEffect(() => {
    const idxSel = semana.findIndex((d) => esMismodia(d, diaSeleccionado));
    if (idxSel < 0) return;
    setInicio((prev) => {
      // Si el día quedó a la izquierda de la ventana, mover hacia atrás
      if (idxSel < prev) return Math.max(0, idxSel - 1);
      // Si el día quedó a la derecha de la ventana, mover hacia adelante
      if (idxSel >= prev + VISIBLE) return Math.min(semana.length - VISIBLE, idxSel - VISIBLE + 2);
      return prev;
    });
  }, [diaSeleccionado, semana]);

  // Posición del día seleccionado dentro de la lista completa
  const idxSeleccionado = semana.findIndex((d) => esMismodia(d, diaSeleccionado));

  // Determinar si se puede navegar en cada dirección
  const esElPrimero = idxSeleccionado <= 0;
  const esElUltimo = idxSeleccionado >= semana.length - 1;

  /** Navegar al día anterior. Si ya es el primero, pedir más días hacia atrás. */
  function irAtras() {
    if (esElPrimero) {
      onPedirMasDias('atras');
      return;
    }
    const nuevoDia = semana[idxSeleccionado - 1];
    onSeleccionar(nuevoDia);
    // Mover la ventana si el nuevo día quedó fuera del rango visible
    setInicio((prev) => {
      if (idxSeleccionado - 1 < prev) return Math.max(0, prev - 1);
      return prev;
    });
  }

  /** Navegar al día siguiente. Si ya es el último, pedir más días hacia adelante. */
  function irAdelante() {
    if (esElUltimo) {
      onPedirMasDias('adelante');
      return;
    }
    const nuevoDia = semana[idxSeleccionado + 1];
    onSeleccionar(nuevoDia);
    // Mover la ventana si el nuevo día quedó fuera del rango visible
    setInicio((prev) => {
      if (idxSeleccionado + 1 >= prev + VISIBLE) return Math.min(semana.length - VISIBLE, prev + 1);
      return prev;
    });
  }

  // Extraer solo los días que se muestran actualmente
  const diasVisibles = semana.slice(inicio, inicio + VISIBLE);

  return (
    <View style={styles.container}>
      {/* ── Flecha izquierda: ir al día anterior ── */}
      <TouchableOpacity
        style={styles.arrowBtn}
        onPress={irAtras}
        accessibilityLabel="Día anterior"
        accessibilityRole="button"
      >
        <Ionicons
          name="chevron-back"
          size={28}
          color={esElPrimero ? Colors.ui.disabled : Colors.brand.red}
        />
      </TouchableOpacity>

      {/* ── Días visibles en el carrusel ── */}
      <View style={styles.diasRow}>
        {diasVisibles.map((dia) => {
          const activo = esMismodia(dia, diaSeleccionado); // Día seleccionado actualmente
          const esHoy = esMismodia(dia, new Date());        // Día de hoy (fecha real)
          return (
            <TouchableOpacity
              key={dia.toISOString()}
              style={styles.dayItem}
              onPress={() => onSeleccionar(dia)}
              accessibilityLabel={`Día ${dia.getDate()}`}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
            >
              {/* Letra del día: L, M, M, J, V, S, D */}
              <Text style={[
                styles.letraDia,
                activo && styles.letraDiaActiva,
                esHoy && !activo && styles.letraDiaHoy,
              ]}>
                {getDiaLetra(dia)}
              </Text>

              {/* Número del día dentro de un círculo */}
              <View style={[
                styles.numeroBg,
                activo && styles.numeroBgActivo,   // Fondo rojo si está seleccionado
                esHoy && !activo && styles.numeroBgHoy, // Borde rojo si es hoy pero no está seleccionado
              ]}>
                <Text style={[styles.numeroDia, activo && styles.numeroDiaActivo]}>
                  {dia.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Flecha derecha: ir al día siguiente ── */}
      <TouchableOpacity
        style={styles.arrowBtn}
        onPress={irAdelante}
        accessibilityLabel="Día siguiente"
        accessibilityRole="button"
      >
        <Ionicons
          name="chevron-forward"
          size={28}
          color={esElUltimo ? Colors.ui.disabled : Colors.brand.red}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Contenedor principal del carrusel
  container: {
    backgroundColor: Colors.ui.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },

  // Botones de flecha — área táctil amplia para facilitar el toque
  arrowBtn: {
    width: 44,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Fila de días visibles
  diasRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  // Cada ítem de día (letra + número)
  dayItem: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },

  // Letra del día (L, M, M, J, V, S, D)
  letraDia: {
    fontSize: 17,
    fontWeight: Typography.weight.regular,
    color: Colors.text.secondary,
  },
  letraDiaActiva: {
    color: Colors.brand.red,
    fontWeight: Typography.weight.medium,
  },
  letraDiaHoy: {
    color: Colors.brand.red, // Hoy en rojo aunque no esté seleccionado
  },

  // Círculo detrás del número
  numeroBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroBgActivo: {
    backgroundColor: Colors.brand.red, // Relleno rojo = día seleccionado
  },
  numeroBgHoy: {
    borderWidth: 2,
    borderColor: Colors.brand.red, // Solo borde = hoy pero no seleccionado
  },

  // Número del día
  numeroDia: {
    fontSize: 22,
    fontWeight: Typography.weight.regular,
    color: Colors.text.primary,
  },
  numeroDiaActivo: {
    color: Colors.text.onDark, // Blanco sobre fondo rojo
    fontWeight: Typography.weight.medium,
  },
});
