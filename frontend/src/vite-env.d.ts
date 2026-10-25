/// <reference types="vite/client" />

interface ImportMetaEnv {
  // URL base da API. Em dev cai no localhost; na Vercel deve vir das
  // Environment Variables do projeto (ex.: https://laco-api.vercel.app/api).
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
