/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL: string;
  // adicione aqui todas as suas variáveis de ambiente que você usa
  // exemplo:

  // ou deixe mais genérico se preferir:
  // [key: string]: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
