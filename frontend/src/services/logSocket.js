const WS_BASE = (import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//127.0.0.1:8000`).replace(/\/$/, '')
const WS_URL = `${WS_BASE}/ws/logs`

class LogSocket {
  constructor() {
    this.url = WS_URL
    this.ws = null
    this.listeners = new Set()
    this.statusListeners = new Set()
    this.queue = []
    this.reconnectDelay = 1000
    this.maxDelay = 30000
    this.status = 'disconnected'
    this.reconnectTimer = null
    this.shouldReconnect = true
    this._connect()
  }

  connect() {
    this.shouldReconnect = true
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return
    }
    this._connect()
  }

  _connect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this._emitStatus('connecting')
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.reconnectDelay = 1000
      this._emitStatus('connected')
      this._flushQueue()
    }

    this.ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)
        this.listeners.forEach((cb) => cb(data))
      } catch (e) {
        this.listeners.forEach((cb) => cb({ type: 'log', message: evt.data }))
      }
    }

    this.ws.onclose = () => {
      this._emitStatus('disconnected')
      if (!this.shouldReconnect) return
      this._scheduleReconnect()
    }

    this.ws.onerror = () => {
      this._emitStatus('error')
      try { this.ws.close() } catch (e) {}
    }
  }

  _flushQueue() {
    while (this.queue.length && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload = this.queue.shift()
      this.ws.send(payload)
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay)
      this._connect()
    }, this.reconnectDelay)
    this._emitStatus('reconnecting')
  }

  _emitStatus(s) {
    this.status = s
    this.statusListeners.forEach((cb) => cb(s))
  }

  onMessage(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb) }
  onStatus(cb) { this.statusListeners.add(cb); cb(this.status); return () => this.statusListeners.delete(cb) }

  send(obj) {
    try {
      const payload = JSON.stringify(obj)
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(payload)
      } else {
        this.queue.push(payload)
      }
    } catch (e) {
      console.error('WS send error', e)
    }
  }

  startStream(pod, namespace='default') {
    this.connect()
    this.send({ command: 'START_STREAM', pod, namespace })
  }

  stopStream() { this.connect(); this.send({ command: 'STOP_STREAM' }) }
  pauseStream() { this.connect(); this.send({ command: 'PAUSE_STREAM' }) }
  resumeStream() { this.connect(); this.send({ command: 'RESUME_STREAM' }) }
  changePod(pod, namespace='default') { this.connect(); this.send({ command: 'CHANGE_POD', pod, namespace }) }

  close() {
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    try { this.ws && this.ws.close() } catch (e) {}
  }
}

const singleton = new LogSocket()
export default singleton
