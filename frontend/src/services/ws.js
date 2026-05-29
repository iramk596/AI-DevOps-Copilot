const WS_URL = import.meta.env.VITE_WS_URL || (window.location.hostname === 'localhost' ? 'ws://127.0.0.1:8000/ws' : 'ws://localhost:8000/ws')

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
      onStatus && onStatus('connected')
    }

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)
        onMessage && onMessage(data)
      } catch (e) {
        // ignore non-json messages
      }
    }

    ws.onclose = () => {
      if (closedByUser) {
        onStatus && onStatus('disconnected')
        return
      }
      onStatus && onStatus('disconnected')
      scheduleReconnect()
    }

    ws.onerror = () => {
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
  const base = (import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000').replace(/\/$/, '')
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

    ws.onopen = () => { attempt = 0; onStatus && onStatus('connected') }
    ws.onmessage = (evt) => onMessage && onMessage(evt.data)
    ws.onclose = () => {
      if (closedByUser) { onStatus && onStatus('disconnected'); return }
      onStatus && onStatus('disconnected')
      scheduleReconnect()
    }
    ws.onerror = () => { onStatus && onStatus('error'); try { ws.close() } catch (e) {} }
  }

  connect()

  return {
    close: () => { closedByUser = true; ws && ws.close() },
  }
}
