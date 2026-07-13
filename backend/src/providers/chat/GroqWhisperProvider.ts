import { ProviderFatalError, ProviderRateLimitedError, type IProvider } from '../../core/provider';

export interface TranscriptionInput {
  audioBuffer: Buffer;
  filename: string;
  mimeType: string;
}

export interface TranscriptionOutput {
  text: string;
}

const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

/** Antes esto se llamaba directo desde el cliente con la key expuesta — ahora vive solo acá. */
export class GroqWhisperProvider implements IProvider<TranscriptionInput, TranscriptionOutput> {
  readonly name = 'groq:whisper-large-v3-turbo';
  readonly tier = 1;

  constructor(private readonly apiKey: string) {}

  async call(input: TranscriptionInput): Promise<TranscriptionOutput> {
    const formData = new FormData();
    formData.append('file', new Blob([input.audioBuffer], { type: input.mimeType }), input.filename);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'es');
    formData.append('response_format', 'text');

    const res = await fetch(GROQ_WHISPER_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 401) throw new ProviderFatalError(this.name, `Groq key inválida o expirada: ${errText}`);
      if (res.status === 429 || res.status === 503) {
        throw new ProviderRateLimitedError(this.name, `Groq ${res.status}: ${errText}`);
      }
      throw new Error(`Whisper respondió ${res.status}: ${errText}`);
    }

    const text = (await res.text()).trim();
    if (!text) throw new Error('No se detectó voz en el audio.');
    return { text };
  }
}
