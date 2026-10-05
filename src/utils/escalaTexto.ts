// Aplica el ajuste "Tamaño de texto" (Más → Accesibilidad) a TODO el texto de
// la app. React Native no tiene un tamaño de fuente global, y tocar cada
// <Text> de cada pantalla no escala; en cambio, una sola vez al arrancar se
// reemplazan `Text` y `TextInput` del módulo 'react-native' por versiones que
// leen la escala elegida (contexto de accesibilidad) y multiplican cada
// fontSize/lineHeight explícito. Como leen el contexto, al cambiar el ajuste
// todo el texto visible se actualiza al instante, sin reiniciar la app.
//
// Un <Text allowFontScaling={false}> queda afuera a propósito (se usa en
// números/horas de ancho fijo — ver agenda). Un <Text> anidado sin fontSize
// propio hereda el tamaño ya escalado del padre.
//
// Nota: en React Native 0.81 `Text` es un componente de función común (no un
// forwardRef), así que no se puede envolver su `render` — por eso se redefine
// la propiedad en el módulo (los `import { Text } from 'react-native'` la leen
// en cada uso, así que toman la versión nueva).
import { createElement, useContext, type ComponentType, type ReactElement } from 'react';
import { Platform, StyleSheet, type StyleProp, type TextStyle, type TextProps, type TextInputProps } from 'react-native';
import { AccesibilidadContext } from '@/context/AccesibilidadContext';
import { instalarAjusteTextoWeb } from '@/utils/ajusteTextoWeb';

interface PropsConEstilo {
  style?: StyleProp<TextStyle>;
  allowFontScaling?: boolean;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
  dataSet?: Record<string, string | number | undefined>;
}

/** Props con fontSize/lineHeight multiplicados por `escala` (o las mismas props si no hay nada que escalar). */
function escalarProps<P extends PropsConEstilo>(props: P, escala: number): P {
  if (escala === 1 || props.allowFontScaling === false) return props;

  const plano = StyleSheet.flatten(props.style) ?? {};
  if (plano.fontSize == null) return props;

  const ajuste: TextStyle = { fontSize: plano.fontSize * escala };
  if (plano.lineHeight != null) ajuste.lineHeight = plano.lineHeight * escala;
  return { ...props, style: [props.style, ajuste] };
}

function crearEscalado<P extends PropsConEstilo>(Original: ComponentType<P>): ComponentType<P> {
  function Escalado(props: P) {
    const { escala } = useContext(AccesibilidadContext);
    return createElement(Original, escalarProps(props, escala));
  }
  Escalado.displayName = `Escalado(${Original.displayName ?? Original.name ?? 'Text'})`;
  return Escalado;
}

interface ForwardRefComponent {
  render: (props: PropsConEstilo, ref: unknown) => ReactElement | null;
}

/**
 * WEB: en react-native-web los exports de 'react-native' son de solo lectura (Object.defineProperty
 * lanza "Cannot redefine property: Text" y la app entera no arranca), así que no se pueden reemplazar
 * `Text`/`TextInput`. En cambio ambos son objetos `React.forwardRef` cuya función `render` sí se puede
 * envolver: React la llama en cada render, por lo que acá se puede leer el contexto con un hook.
 */
function escalarEnWeb(componente: unknown): void {
  const forwardRef = componente as ForwardRefComponent;
  const renderOriginal = forwardRef.render;
  forwardRef.render = (props, ref) => {
    const { escala } = useContext(AccesibilidadContext);
    const escaladas = escalarProps(props, escala);
    // adjustsFontSizeToFit no existe en react-native-web: se marca el elemento y lo resuelve utils/ajusteTextoWeb.ts
    const conAjuste = props.adjustsFontSizeToFit
      ? { ...escaladas, dataSet: { ...escaladas.dataSet, fit: props.minimumFontScale ?? 0.5 } }
      : escaladas;
    return renderOriginal(conAjuste, ref);
  };
}

let instalada = false;

/** Se llama una sola vez al arrancar la app (app/_layout.tsx). */
export function instalarEscalaTexto(): void {
  if (instalada) return;
  instalada = true;

  // require (no `import * as`): el interop de Babel copiaría el módulo a un objeto
  // nuevo y redefinir propiedades ahí no afectaría a los demás archivos.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactNative = require('react-native') as { Text: unknown; TextInput: unknown };
  const OriginalText = ReactNative.Text;
  const OriginalInput = ReactNative.TextInput;

  if (Platform.OS === 'web') {
    escalarEnWeb(OriginalText);
    escalarEnWeb(OriginalInput);
    instalarAjusteTextoWeb();
    return;
  }

  const TextoEscalado = crearEscalado(OriginalText as ComponentType<TextProps>);
  const InputEscalado = Object.assign(
    crearEscalado(OriginalInput as ComponentType<TextInputProps>),
    // Estáticos que algunas pantallas podrían usar (ej. TextInput.State)
    { State: (OriginalInput as { State?: unknown }).State },
  );

  Object.defineProperty(ReactNative, 'Text', { configurable: true, enumerable: true, get: () => TextoEscalado });
  Object.defineProperty(ReactNative, 'TextInput', { configurable: true, enumerable: true, get: () => InputEscalado });
}
