/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_API_URL: string
  readonly VITE_PRODUCT_API_URL: string
  readonly VITE_TRANSACTION_API_URL: string
  readonly VITE_WALLET_API_URL: string
  readonly VITE_NOTIFY_WS_URL: string
  readonly VITE_DEV_AUTH_PROXY: string
  readonly VITE_DEV_WS_PROXY: string
  readonly VITE_ALLOWED_HOSTS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
