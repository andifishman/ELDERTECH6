// Video de YouTube embebido — versión NATIVA (react-native-webview).
// En web Metro usa VideoYoutube.web.tsx (un <iframe> directo).
import React from 'react';
import { WebView } from 'react-native-webview';

interface Props {
  youtubeId: string;
  ancho: number;
  alto: number;
}

// Navegar el WebView DIRECTO a la URL de youtube.com/embed/... da "Error 153"
// (YouTube rechaza el origen/referrer de esa navegación de nivel superior).
// Envolver el iframe en una página HTML propia (`source.html` en vez de
// `source.uri`) no alcanza solo: YouTube exige que el origen sea válido,
// y sin `baseUrl` la página queda en el origen "null"/about:blank, que
// YouTube también rechaza. Hace falta un `baseUrl` (WebView) que combine
// con el parámetro `origin` del iframe — ver issue #3889 de
// react-native-webview, confirmado por varios devs.
const ORIGEN_EMBED = 'https://eldertech.app';

function htmlEmbedYoutube(youtubeId: string): string {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#000;overflow:hidden;">
<iframe src="https://www.youtube.com/embed/${youtubeId}?playsinline=1&origin=${ORIGEN_EMBED}" width="100%" height="100%" frameborder="0" referrerpolicy="strict-origin-when-cross-origin"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen
  style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>
</body></html>`;
}

export function VideoYoutube({ youtubeId, ancho, alto }: Props) {
  return (
    <WebView
      style={{ width: ancho, height: alto }}
      source={{ html: htmlEmbedYoutube(youtubeId), baseUrl: ORIGEN_EMBED }}
      allowsFullscreenVideo
      allowsInlineMediaPlayback
      javaScriptEnabled
      domStorageEnabled
      mediaPlaybackRequiresUserAction={false}
      originWhitelist={['*']}
    />
  );
}
