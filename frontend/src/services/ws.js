const WS_BASE = (import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//127.0.0.1:8000`).replace(/\/$/, '')
const WS_URL = `${WS_BASE}/ws`

export function createWebsocket(onMessage, onStatus) {
  let ws
  let baseDelay = 1000
  let maxDelay = 30000
  let attempt = 0
  let closedByUser = false

  function scheduleReconnect() {
    attempt = Math.min(attempt + 1, 16)
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
    onStatus && onStatus('reconnecting')
    setTimeout(connect, delay)
  }

  function connect() {
    if (closedByUser) return
    ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      attempt = 0
      console.debug('[WS] connected', WS_URL)
      onStatus && onStatus('connected')
    }

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)
        console.debug('[WS] message', data)
        onMessage && onMessage(data)
      } catch (e) {
        console.warn('[WS] non-json message', evt.data)
      }
    }

    ws.onclose = (event) => {
      console.warn('[WS] closed', event.code, event.reason)
      if (closedByUser) {
        onStatus && onStatus('disconnected')
        return
      }
      onStatus && onStatus('disconnected')
      scheduleReconnect()
    }

    ws.onerror = (event) => {
      console.error('[WS] error', event)
      onStatus && onStatus('error')
      try { ws.close() } catch (e) {}
    }
  }

  connect()

  return {
    close: () => { closedByUser = true; ws && ws.close() },
  }
}

export function createLogsWebsocket(namespace, pod, onMessage, onStatus) {
  const base = (import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//127.0.0.1:8000`).replace(/\/$/, '')
  const url = `${base}/ws/logs/${namespace}/${pod}`
  let ws
  let baseDelay = 1000
  let maxDelay = 10000
  let attempt = 0
  let closedByUser = false

  function scheduleReconnect() {
    attempt = Math.min(attempt + 1, 10)
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
    onStatus && onStatus('reconnecting')
    setTimeout(connect, delay)
  }

  function connect() {
    if (closedByUser) return
    ws = new WebSocket(url)

    ws.onopen = () => {
      attempt = 0
      console.debug('[WS LOGS] connected', url)
      onStatus && onStatus('connected')
    }
    ws.onmessage = (evt) => {
      console.debug('[WS LOGS] message', evt.data)
      onMessage && onMessage(evt.data)
    }
    ws.onclose = (event) => {
      console.warn('[WS LOGS] closed', event.code, event.reason)
      if (closedByUser) { onStatus && onStatus('disconnected'); return }
      onStatus && onStatus('disconnected')
      scheduleReconnect()
    }
    ws.onerror = (event) => {
      console.error('[WS LOGS] error', event)
      onStatus && onStatus('error')
      try { ws.close() } catch (e) {}
    }
  }

  connect()

  return {
    close: () => { closedByUser = true; ws && ws.close() },
  }
}
