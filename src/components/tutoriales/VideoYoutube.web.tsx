// Video de YouTube embebido — versión WEB: react-native-webview no existe en web, se usa un <iframe>.
// El origen real de la página (location.origin) es el que YouTube valida — no hace falta el truco del baseUrl.
import React from 'react';

interface Props {
  youtubeId: string;
  ancho: number;
  alto: number;
}

export function VideoYoutube({ youtubeId, ancho, alto }: Props) {
  const origen = encodeURIComponent(window.location.origin);
  return (
    <iframe
      title="Video del tutorial"
      src={`https://www.youtube.com/embed/${youtubeId}?playsinline=1&rel=0&origin=${origen}`}
      width={ancho}
      height={alto}
      style={{ border: 0, display: 'block' }}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
