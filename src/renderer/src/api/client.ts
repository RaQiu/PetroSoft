import axios from 'axios'

// Default port for development; overridden at runtime in production
let baseURL = 'http://localhost:20022/api'

const apiClient = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Initialize the API client with the backend port from Electron main process.
 * Called once at app startup. In dev mode, falls back to the default port.
 */
export async function initApiClient(): Promise<void> {
  try {
    const port = await (window as any).api.getBackendPort()
    if (port && port !== 20022) {
      baseURL = `http://localhost:${port}/api`
      apiClient.defaults.baseURL = baseURL
      console.log(`[api] Using backend port: ${port}`)
    }
  }
  catch {
    // In dev mode or if IPC not available, keep default port
    console.log('[api] Using default backend port: 20022')
  }
}

export default apiClient
