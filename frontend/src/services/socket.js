import { createWebsocket } from "./ws"

let connection = null
let statusListeners = []
let eventListeners = {}

const socket = {
  connect() {
    if (connection) return

    connection = createWebsocket(
      (message) => {
        const event = message?.type

        if (event && eventListeners[event]) {
          eventListeners[event].forEach((cb) => cb(message))
        }

        if (eventListeners["message"]) {
          eventListeners["message"].forEach((cb) => cb(message))
        }
      },
      (status) => {
        statusListeners.forEach((cb) => cb(status))
      }
    )
  },

  disconnect() {
    if (connection) {
      connection.close()
      connection = null
    }
  },

  on(event, callback) {
    if (!eventListeners[event]) {
      eventListeners[event] = []
    }

    eventListeners[event].push(callback)

    return () => {
      eventListeners[event] =
        eventListeners[event].filter((cb) => cb !== callback)
    }
  },

  onStatus(callback) {
    statusListeners.push(callback)

    return () => {
      statusListeners =
        statusListeners.filter((cb) => cb !== callback)
    }
  },
}

export default socket