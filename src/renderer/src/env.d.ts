/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, any>
  export default component
}

declare global {
  interface Window {
    api: {
      readImageAsDataUrl: (filePath: string) => Promise<string>
      [key: string]: any
    }
  }
}

export {}
