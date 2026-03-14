export interface CompositeLogDebugEntry {
  channel: 'interaction' | 'grid' | 'selection'
  event: string
  payload: Record<string, unknown>
  timestamp: string
}

const COMPOSITE_LOG_DEBUG_EVENT = 'composite-log-debug'

function shouldLogToConsole() {
  try {
    const globalFlag = (window as Window & { __PETROSOFT_DEBUG_COMPOSITE_LOG__?: boolean }).__PETROSOFT_DEBUG_COMPOSITE_LOG__
    if (globalFlag) {
      return true
    }
    return window.localStorage.getItem('petrosoft:composite-log-debug') === '1'
  }
  catch {
    return false
  }
}

export function emitCompositeLogDebug(entry: Omit<CompositeLogDebugEntry, 'timestamp'>) {
  const detail: CompositeLogDebugEntry = {
    ...entry,
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  }
  if (shouldLogToConsole()) {
    console.debug(`[CompositeLog][${detail.channel}] ${detail.event}`, detail.payload)
  }
  window.dispatchEvent(new CustomEvent<CompositeLogDebugEntry>(COMPOSITE_LOG_DEBUG_EVENT, { detail }))
}

export function addCompositeLogDebugListener(listener: (entry: CompositeLogDebugEntry) => void) {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<CompositeLogDebugEntry>
    listener(customEvent.detail)
  }
  window.addEventListener(COMPOSITE_LOG_DEBUG_EVENT, handler as EventListener)
  return () => window.removeEventListener(COMPOSITE_LOG_DEBUG_EVENT, handler as EventListener)
}
