import { useEffect, useState, useRef } from 'react'
import { createLogsWebsocket } from '../services/ws'

function LogsViewer({ namespace, pod, onClose }) {
  const [status, setStatus] = useState('connecting')
  const [logs, setLogs] = useState('')
  const containerRef = useRef()
  const wsRef = useRef()

  useEffect(() => {
    wsRef.current = createLogsWebsocket(namespace, pod, (data) => {
      setLogs((prev) => prev === data ? prev : data)
    }, (s) => setStatus(s))

    return () => wsRef.current && wsRef.current.close()
  }, [namespace, pod])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-11/12 md:w-3/4 lg:w-2/3 bg-gray-900 rounded-lg border border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg text-cyan-400">Logs: {pod} ({namespace})</h3>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-300">{status}</div>
            <button onClick={onClose} className="bg-red-600 px-3 py-1 rounded-md">Close</button>
          </div>
        </div>

        <div ref={containerRef} className="bg-black text-green-400 p-4 rounded h-96 overflow-y-auto font-mono text-xs border border-gray-800">
          <pre className="whitespace-pre-wrap">{logs || 'Waiting for logs...'}</pre>
        </div>

      </div>
    </div>
  )
}

export default LogsViewer
