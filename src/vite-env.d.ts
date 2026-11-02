/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_QUOTE_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
