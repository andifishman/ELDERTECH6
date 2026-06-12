/**
 * CiudadFamiliarSelector
 * ──────────────────────
 * Selector de ciudades de familiares para el formulario de registro.
 *
 * Comportamiento:
 *  - Sin texto en el buscador: muestra las ciudades predeterminadas de Supabase
 *  - Con texto (≥ 2 caracteres): busca en Open-Meteo Geocoding y muestra resultados
 *  - Las ciudades predeterminadas se seleccionan por ID
 *  - Las ciudades buscadas se guardan como objetos con coordenadas
 *  - Un chip de resumen muestra las ciudades ya elegidas arriba del buscador
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buscarCiudades } from '@/services/climaService';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { CiudadFamiliar, CiudadCustom } from '@/types/auth.types';
import type { GeocodingResult } from '@/types/clima.types';

// ─── Flag helpers ─────────────────────────────────────────────────────────────

const FLAG: Record<string, string> = {
  AR: '🇦🇷',
  IL: '🇮🇱',
  US: '🇺🇸',
  ES: '🇪🇸',
  IT: '🇮🇹',
  FR: '🇫🇷',
  DE: '🇩🇪',
  BR: '🇧🇷',
  MX: '🇲🇽',
  GB: '🇬🇧',
  CL: '🇨🇱',
  UY: '🇺🇾',
  CO: '🇨🇴',
  PE: '🇵🇪',
  VE: '🇻🇪',
  PT: '🇵🇹',
  CA: '🇨🇦',
  AU: '🇦🇺',
  JP: '🇯🇵',
  CN: '🇨🇳',
  IN: '🇮🇳',
};

function getFlag(code: string): string {
  return FLAG[code?.toUpperCase()] ?? '🌍';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CiudadFamiliarSelectorProps {
  /** Ciudades predeterminadas cargadas desde Supabase */
  ciudades: CiudadFamiliar[];
  /** IDs de ciudades predeterminadas seleccionadas */
  selected: string[];
  onChange: (selected: string[]) => void;
  /** Ciudades buscadas libremente (Open-Meteo) */
  selectedCustom: CiudadCustom[];
  onChangeCustom: (custom: CiudadCustom[]) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function CiudadFamiliarSelector({
  ciudades,
  selected,
  onChange,
  selectedCustom,
  onChangeCustom,
}: CiudadFamiliarSelectorProps) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<GeocodingResult[]>([]);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determina si hay texto activo de búsqueda
  const modoSearch = query.trim().length >= 2;

  // ── Debounce de búsqueda Open-Meteo ──────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!modoSearch) {
      setResultados([]);
      setBuscando(false);
      return;
    }

    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await buscarCiudades(query.trim());
        setResultados(res);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // ── Toggle ciudades predeterminadas ──────────────────────────────────────
  function togglePredeterminada(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((i) => i !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  // ── Agregar ciudad buscada ────────────────────────────────────────────────
  function agregarCustom(geo: GeocodingResult) {
    // Evitar duplicados por coordenadas (tolerancia ~1km)
    const yaExiste = selectedCustom.some(
      (c) => Math.abs(c.lat - geo.latitude) < 0.01 && Math.abs(c.lon - geo.longitude) < 0.01,
    );
    if (yaExiste) {
      setQuery('');
      return;
    }

    // También verificar si coincide con una ciudad predeterminada (por nombre)
    const predExistente = ciudades.find(
      (c) => c.nombre.toLowerCase() === geo.name.toLowerCase(),
    );
    if (predExistente && !selected.includes(predExistente.id)) {
      onChange([...selected, predExistente.id]);
      setQuery('');
      return;
    }

    const nueva: CiudadCustom = {
      nombre: geo.name,
      pais_codigo: geo.country_code,
      lat: geo.latitude,
      lon: geo.longitude,
      timezone: geo.timezone,
    };
    onChangeCustom([...selectedCustom, nueva]);
    setQuery('');
  }

  // ── Quitar ciudad custom ──────────────────────────────────────────────────
  function quitarCustom(lat: number, lon: number) {
    onChangeCustom(
      selectedCustom.filter((c) => !(Math.abs(c.lat - lat) < 0.01 && Math.abs(c.lon - lon) < 0.01)),
    );
  }

  // ── Chips de ciudades seleccionadas ──────────────────────────────────────
  const chipsSeleccionadas = useMemo(() => {
    const pred = ciudades
      .filter((c) => selected.includes(c.id))
      .map((c) => ({ key: c.id, nombre: c.nombre, pais: c.pais_codigo, isPred: true as const }));
    const cust = selectedCustom.map((c) => ({
      key: `${c.lat}_${c.lon}`,
      nombre: c.nombre,
      pais: c.pais_codigo,
      isPred: false as const,
      lat: c.lat,
      lon: c.lon,
    }));
    return [...pred, ...cust];
  }, [ciudades, selected, selectedCustom]);

  // ── Lista a mostrar (predeterminadas filtradas o resultados de búsqueda) ──
  const listaVisible: Array<{ tipo: 'pred'; ciudad: CiudadFamiliar } | { tipo: 'geo'; geo: GeocodingResult }> =
    modoSearch
      ? resultados.map((g) => ({ tipo: 'geo', geo: g }))
      : ciudades.map((c) => ({ tipo: 'pred', ciudad: c }));

  return (
    <View>
      {/* ── Chips de ciudades ya seleccionadas ── */}
      {chipsSeleccionadas.length > 0 && (
        <View style={styles.chipsContainer}>
          {chipsSeleccionadas.map((chip) => (
            <View key={chip.key} style={styles.chip}>
              <Text style={styles.chipFlag}>{getFlag(chip.pais)}</Text>
              <Text style={styles.chipNombre}>{chip.nombre}</Text>
              <TouchableOpacity
                onPress={() => {
                  if (chip.isPred) {
                    onChange(selected.filter((i) => i !== chip.key));
                  } else {
                    quitarCustom((chip as any).lat, (chip as any).lon);
                  }
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityLabel={`Quitar ${chip.nombre}`}
              >
                <Ionicons name="close-circle" size={18} color={Colors.brand.greenDark} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* ── Buscador ── */}
      <View style={styles.searchContainer}>
        <Ionicons
          name={buscando ? 'hourglass-outline' : 'search'}
          size={20}
          color={Colors.text.hint}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar ciudad (ej: Madrid, París…)"
          placeholderTextColor={Colors.text.hint}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          accessibilityLabel="Buscar ciudad"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Limpiar búsqueda"
          >
            <Ionicons name="close-circle" size={20} color={Colors.text.hint} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Spinner / hint de búsqueda ── */}
      {modoSearch && buscando && (
        <View style={styles.searchStatus}>
          <ActivityIndicator size="small" color={Colors.brand.greenDark} />
          <Text style={styles.searchStatusText}>Buscando ciudades…</Text>
        </View>
      )}

      {/* ── Hint cuando hay texto pero aún no hay resultados y no está buscando ── */}
      {modoSearch && !buscando && resultados.length === 0 && (
        <View style={styles.searchStatus}>
          <Text style={styles.searchStatusText}>
            No se encontró "{query.trim()}"
          </Text>
        </View>
      )}

      {/* ── Etiqueta contextual ── */}
      {modoSearch && !buscando && resultados.length > 0 && (
        <Text style={styles.sectionHint}>Resultados de búsqueda</Text>
      )}

      {/* ── Lista ── */}
      <View style={styles.list}>
        {listaVisible.map((item, idx) => {
          if (item.tipo === 'pred') {
            const ciudad = item.ciudad;
            const isSelected = selected.includes(ciudad.id);
            return (
              <TouchableOpacity
                key={ciudad.id}
                onPress={() => togglePredeterminada(ciudad.id)}
                style={[styles.row, isSelected && styles.rowSelected]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={ciudad.nombre}
              >
                <Text style={styles.flag}>{getFlag(ciudad.pais_codigo)}</Text>
                <Text style={[styles.name, isSelected && styles.nameSelected]}>
                  {ciudad.nombre}
                </Text>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color={Colors.ui.surface} />
                  )}
                </View>
              </TouchableOpacity>
            );
          }

          // Resultado de Open-Meteo
          const geo = item.geo;
          const isCustomSelected = selectedCustom.some(
            (c) => Math.abs(c.lat - geo.latitude) < 0.01 && Math.abs(c.lon - geo.longitude) < 0.01,
          );
          const isPredMatch = ciudades.some(
            (c) => c.nombre.toLowerCase() === geo.name.toLowerCase(),
          );
          const predMatch = isPredMatch
            ? ciudades.find((c) => c.nombre.toLowerCase() === geo.name.toLowerCase())
            : null;
          const isAlreadySelected = isCustomSelected || (predMatch ? selected.includes(predMatch.id) : false);

          return (
            <TouchableOpacity
              key={`geo_${idx}`}
              onPress={() => !isAlreadySelected && agregarCustom(geo)}
              style={[styles.row, isAlreadySelected && styles.rowSelected]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isAlreadySelected }}
              accessibilityLabel={`${geo.name}${geo.admin1 ? `, ${geo.admin1}` : ''}, ${geo.country ?? geo.country_code}`}
            >
              <Text style={styles.flag}>{getFlag(geo.country_code)}</Text>
              <View style={styles.geoInfo}>
                <Text style={[styles.name, isAlreadySelected && styles.nameSelected]}>
                  {geo.name}
                </Text>
                {(geo.admin1 || geo.country) && (
                  <Text style={styles.geoDetalle}>
                    {[geo.admin1, geo.country].filter(Boolean).join(', ')}
                  </Text>
                )}
              </View>
              <View style={[styles.checkbox, isAlreadySelected && styles.checkboxSelected]}>
                {isAlreadySelected && (
                  <Ionicons name="checkmark" size={16} color={Colors.ui.surface} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Chips de ciudades seleccionadas
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    borderRadius: Spacing.radius.full,
    paddingVertical: 6,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.brand.greenDark,
  },
  chipFlag: {
    fontSize: Typography.size.md,
  },
  chipNombre: {
    fontSize: Typography.size.sm,
    color: Colors.brand.greenDark,
    fontWeight: Typography.weight.semibold,
  },

  // Buscador
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.md,
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    minHeight: Spacing.touch.min,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    paddingVertical: Spacing.md,
  },

  // Estado de búsqueda
  searchStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  searchStatusText: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },

  // Etiqueta de sección
  sectionHint: {
    fontSize: Typography.size.sm,
    color: Colors.text.hint,
    marginBottom: Spacing.sm,
    marginLeft: 2,
  },

  // Lista
  list: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.md,
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    gap: Spacing.md,
    minHeight: Spacing.touch.min,
  },
  rowSelected: {
    borderColor: Colors.brand.greenDark,
    backgroundColor: '#E8F5E9',
  },
  flag: {
    fontSize: Typography.size.xl,
  },
  name: {
    flex: 1,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.medium,
    color: Colors.text.primary,
  },
  nameSelected: {
    color: Colors.brand.greenDark,
    fontWeight: Typography.weight.semibold,
  },
  geoInfo: {
    flex: 1,
    gap: 2,
  },
  geoDetalle: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.brand.greenDark,
    borderColor: Colors.brand.greenDark,
  },
});
