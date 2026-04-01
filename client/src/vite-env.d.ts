/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_DEFAULT_CLIENT_SLUG: string;
  readonly VITE_OAUTH_CLIENT_ID: string;
  readonly VITE_CLIENTS_JSON?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
