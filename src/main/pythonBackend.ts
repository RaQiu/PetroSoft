import type { ChildProcess } from 'node:child_process'
import { execFile, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import net from 'node:net'
import { join } from 'node:path'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'

let serverProcess: ChildProcess | null = null
let backendPort = 20022

/** Get the port the backend is running on */
export function getBackendPort(): number {
  return backendPort
}

/** Find a free TCP port on localhost */
function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (addr && typeof addr === 'object') {
        const port = addr.port
        server.close(() => resolve(port))
      }
      else {
        server.close(() => reject(new Error('Failed to get port')))
      }
    })
  })
}

/**
 * Resolve the path to the Python backend executable.
 * - Development: spawn via Python interpreter
 * - Production: use the PyInstaller-built binary from extraResources
 */
function getServerCommand(): { exe: string, args: string[], cwd: string } {
  if (app.isPackaged) {
    const baseName = process.platform === 'win32'
      ? 'petrosoft-server.exe'
      : 'petrosoft-server'
    const serverDir = join(process.resourcesPath, 'petrosoft-server')
    const serverPath = join(serverDir, baseName)

    if (!existsSync(serverPath)) {
      throw new Error(`Server binary not found: ${serverPath}`)
    }
    return { exe: serverPath, args: [], cwd: serverDir }
  }
  else {
    // Development: run via Python
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
    const serverDir = join(app.getAppPath(), 'server')
    return {
      exe: pythonCmd,
      args: ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(backendPort)],
      cwd: serverDir,
    }
  }
}

/** Wait for the HTTP server to accept TCP connections */
function waitForServer(port: number, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()

    function tryConnect(): void {
      const socket = new net.Socket()
      socket.setTimeout(1000)

      socket.on('connect', () => {
        socket.destroy()
        resolve()
      })

      socket.on('error', () => {
        socket.destroy()
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Backend startup timed out after ${timeoutMs}ms`))
        }
        else {
          setTimeout(tryConnect, 200)
        }
      })

      socket.on('timeout', () => {
        socket.destroy()
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Backend startup timed out after ${timeoutMs}ms`))
        }
        else {
          setTimeout(tryConnect, 200)
        }
      })

      socket.connect(port, '127.0.0.1')
    }

    tryConnect()
  })
}

/** Start the Python backend server */
export async function startBackend(): Promise<void> {
  // Use dynamic port in production to avoid conflicts
  if (app.isPackaged) {
    backendPort = await findFreePort()
  }

  const { exe, args, cwd } = getServerCommand()

  const env: Record<string, string> = { ...process.env as Record<string, string> }
  env.PETROSOFT_PORT = String(backendPort)
  env.PETROSOFT_DEBUG = 'false'
  env.NO_PROXY = '127.0.0.1,localhost'
  env.no_proxy = '127.0.0.1,localhost'

  console.log(`[backend] Starting: ${exe} ${args.join(' ')}`)
  console.log(`[backend] Port: ${backendPort}, CWD: ${cwd}`)

  if (is.dev) {
    // In dev mode, use spawn for better stdio handling
    serverProcess = spawn(exe, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
  }
  else {
    serverProcess = execFile(exe, args, { cwd, env, windowsHide: true })
  }

  serverProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`[backend] ${data.toString().trim()}`)
  })
  serverProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`[backend] ${data.toString().trim()}`)
  })
  serverProcess.on('exit', (code) => {
    console.log(`[backend] Process exited with code ${code}`)
    serverProcess = null
  })
  serverProcess.on('error', (err) => {
    console.error(`[backend] Process error:`, err)
    serverProcess = null
  })

  await waitForServer(backendPort)
  console.log(`[backend] Server ready on port ${backendPort}`)
}

/** Stop the Python backend server */
export function stopBackend(): void {
  if (!serverProcess)
    return

  console.log('[backend] Shutting down server...')

  if (process.platform === 'win32') {
    // On Windows, terminate the entire process tree
    if (serverProcess.pid) {
      try {
        execFile('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t'])
      }
      catch { /* ignore */ }
    }
  }
  else {
    serverProcess.kill('SIGTERM')
    // Force kill after 3 seconds if still alive
    const proc = serverProcess
    setTimeout(() => {
      if (proc && !proc.killed) {
        proc.kill('SIGKILL')
      }
    }, 3000)
  }

  serverProcess = null
}
