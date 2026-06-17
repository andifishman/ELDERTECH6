/// <reference types="vite/client" />

// Tipado de las variables de entorno del backoffice
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ORG_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
