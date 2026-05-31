import { useEffect, useRef, useState } from 'react'
import { createLogsWebsocket } from '../services/ws'

function LiveLogsViewer({ namespace, pod, onClose }) {
  const [logs, setLogs] = useState('')
  const [status, setStatus] = useState('connecting')
  const containerRef = useRef(null)
  const wsRef = useRef(null)

  useEffect(() => {
    wsRef.current = createLogsWebsocket(namespace, pod, (data) => {
      setLogs((prev) => {
        if (!prev) {
          return data
        }
        return `${prev}${prev.endsWith('\n') ? '' : '\n'}${data}`
      })
    }, (s) => setStatus(s))

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [namespace, pod])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl rounded-3xl border border-cyan-800 bg-slate-950 shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-cyan-900 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-cyan-300">Live Logs</h3>
            <p className="text-sm text-slate-400">{pod} · {namespace}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-400"></span>
            <span className="text-sm text-slate-300">{status}</span>
            <button
              onClick={onClose}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition"
            >
              Close
            </button>
          </div>
        </div>

        <div ref={containerRef} className="h-[520px] overflow-y-auto rounded-b-3xl bg-black px-6 py-5 font-mono text-[0.9rem] leading-6 text-emerald-300 shadow-inner ring-1 ring-cyan-800">
          {logs ? (
            <pre className="whitespace-pre-wrap break-words">{logs}</pre>
          ) : (
            <div className="text-slate-500">Waiting for live pod logs...</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LiveLogsViewer