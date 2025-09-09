/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // add more vars as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
