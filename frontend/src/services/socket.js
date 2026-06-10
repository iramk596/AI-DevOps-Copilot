/**
 * WebSocket Singleton Service
 * 
 * Provides enterprise-grade websocket client with:
 * - Auto-reconnection with exponential backoff
 * - Heartbeat support
 * - Connection state management
 * - Message routing
 * - Memory leak prevention
 */

const WS_BASE =
  import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//127.0.0.1:8000`

const WS_CLUSTER_URL = `${WS_BASE}/ws/cluster`.replace(/\/$/, '')

let instance = null
let ws = null
let connectionStatus = 'disconnected'
let messageHandlers = new Map()
let statusHandlers = new Set()
let reconnectAttempt = 0
let reconnectTimeout = null
let heartbeatInterval = null
let closedByUser = false

const RECONNECT_CONFIG = {
  baseDelay: 1000,
  maxDelay: 30000,
  maxAttempts: Infinity,
}

/**
 * Broadcast connection status to all listeners
 */
function notifyStatusChange(newStatus) {
  connectionStatus = newStatus
  console.debug(`[WS] Status: ${newStatus}`)
  statusHandlers.forEach((handler) => {
    try {
      handler(newStatus)
    } catch (error) {
      console.error('[WS] Status handler error:', error)
    }
  })
}

/**
 * Route incoming message to registered handlers
 */
function handleMessage(data) {
  if (!data || typeof data !== 'object') {
    console.warn('[WS] Invalid message format:', data)
    return
  }

  const { type } = data

  if (type === 'heartbeat') {
    console.debug('[WS] Heartbeat received')
    return
  }

  console.debug('[WS] Message type:', type, 'clients:', messageHandlers.size)
  if (type === 'cluster_update') {
    console.log('Received cluster update')
  }
  if (type === 'incident') {
    console.log('Received incident')
  }

  // Notify all registered handlers for this message type
  if (messageHandlers.has(type)) {
    messageHandlers.get(type).forEach((handler) => {
      try {
        handler(data)
      } catch (error) {
        console.error(`[WS] Handler error for ${type}:`, error)
      }
    })
  }

  // Also notify generic handlers
  if (messageHandlers.has('*')) {
    messageHandlers.get('*').forEach((handler) => {
      try {
        handler(data)
      } catch (error) {
        console.error('[WS] Generic handler error:', error)
      }
    })
  }
}

/**
 * Schedule reconnection with exponential backoff
 */
function scheduleReconnect() {
  if (closedByUser) return

  reconnectAttempt = Math.min(reconnectAttempt + 1, 16)
  const delay = Math.min(
    RECONNECT_CONFIG.baseDelay * Math.pow(2, reconnectAttempt - 1),
    RECONNECT_CONFIG.maxDelay
  )

  console.warn(
    `[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempt})`
  )
  notifyStatusChange('reconnecting')

  reconnectTimeout = setTimeout(() => {
    connect()
  }, delay)
}

/**
 * Establish WebSocket connection
 */
function connect() {
  if (closedByUser) {
    console.log('[WS] Connection closed by user')
    return
  }

  if (connectionStatus === 'connecting') {
    console.debug('[WS] Already connecting')
    return
  }

  console.log('[WS] Connecting to:', WS_CLUSTER_URL)
  notifyStatusChange('connecting')

  try {
    ws = new WebSocket(WS_CLUSTER_URL)

    ws.onopen = () => {
      reconnectAttempt = 0
      console.log('WebSocket connected')
      notifyStatusChange('connected')
      setupHeartbeat()
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleMessage(data)
      } catch (error) {
        console.warn('[WS] Failed to parse message:', error, event.data)
      }
    }

    ws.onclose = (event) => {
      console.warn(
        `[WS] Closed (code: ${event.code}, reason: ${event.reason})`
      )
      clearHeartbeat()

      if (closedByUser) {
        notifyStatusChange('disconnected')
        return
      }

      notifyStatusChange('disconnected')
      scheduleReconnect()
    }

    ws.onerror = (error) => {
      console.error('[WS] Error:', error)
      notifyStatusChange('error')
      clearHeartbeat()
      try {
        ws.close()
      } catch (e) {
        // Already closed
      }
    }
  } catch (error) {
    console.error('[WS] Failed to create WebSocket:', error)
    notifyStatusChange('error')
    scheduleReconnect()
  }
}

/**
 * Setup heartbeat to keep connection alive
 */
function setupHeartbeat() {
  clearHeartbeat()
  // Send ping every 30 seconds
  heartbeatInterval = setInterval(() => {
    if (
      ws &&
      ws.readyState === WebSocket.OPEN &&
      connectionStatus === 'connected'
    ) {
      try {
        console.debug('[WS] Sending heartbeat')
        ws.send(JSON.stringify({ type: 'ping' }))
      } catch (error) {
        console.warn('[WS] Heartbeat send failed:', error)
      }
    }
  }, 30000)
}

/**
 * Clear heartbeat interval
 */
function clearHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
}

/**
 * Cleanup resources
 */
function cleanup() {
  clearHeartbeat()
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
  try {
    if (ws && ws.readyState !== WebSocket.CLOSED) {
      ws.close()
    }
  } catch (error) {
    console.debug('[WS] Error closing connection:', error)
  }
  ws = null
}

/**
 * WebSocket Singleton Instance
 */
const socketService = {
  /**
   * Initialize and connect the websocket
   */
  connect() {
    closedByUser = false
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      connect()
    }
  },

  /**
   * Gracefully disconnect
   */
  disconnect() {
    closedByUser = true
    cleanup()
    messageHandlers.clear()
    statusHandlers.clear()
  },

  /**
   * Subscribe to a message type
   * @param {string} messageType - 'cluster_update', 'incident', etc. or '*' for all
   * @param {function} handler - Callback function
   * @returns {function} Unsubscribe function
   */
  on(messageType, handler) {
    if (typeof handler !== 'function') {
      console.error('[WS] Handler must be a function')
      return () => {}
    }

    if (!messageHandlers.has(messageType)) {
      messageHandlers.set(messageType, new Set())
    }

    messageHandlers.get(messageType).add(handler)

    // Return unsubscribe function
    return () => {
      const handlers = messageHandlers.get(messageType)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          messageHandlers.delete(messageType)
        }
      }
    }
  },

  /**
   * Unsubscribe from a message type
   */
  off(messageType, handler) {
    if (!messageHandlers.has(messageType)) return
    messageHandlers.get(messageType).delete(handler)
    if (messageHandlers.get(messageType).size === 0) {
      messageHandlers.delete(messageType)
    }
  },

  /**
   * Subscribe to connection status changes
   * @param {function} handler - Callback function
   * @returns {function} Unsubscribe function
   */
  onStatus(handler) {
    if (typeof handler !== 'function') {
      console.error('[WS] Handler must be a function')
      return () => {}
    }

    statusHandlers.add(handler)

    // Immediately notify of current status
    handler(connectionStatus)

    // Return unsubscribe function
    return () => {
      statusHandlers.delete(handler)
    }
  },

  /**
   * Get current connection status
   */
  getStatus() {
    return connectionStatus
  },

  /**
   * Check if connected
   */
  isConnected() {
    return connectionStatus === 'connected'
  },

  /**
   * Get number of active listeners
   */
  getListenerCount() {
    return messageHandlers.size
  },
}

// Auto-connect on first access
connect()

// Handle page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    socketService.disconnect()
  })
}

export default socketService
