import { useEffect, useMemo, useRef, useState } from 'react'
import logSocket from '../services/logSocket'
import api from '../services/api'
import { Play, Pause, Square, Trash2, Download, Copy } from 'lucide-react'

function useDebounced(value, delay = 150) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

function coloredLine(line) {
  const l = (line.level || '').toUpperCase()
  let cls = 'text-slate-300'
  if (l === 'ERROR') cls = 'text-rose-400'
  else if (l === 'WARN') cls = 'text-amber-300'
  else if (l === 'INFO') cls = 'text-cyan-300'
  else if (l === 'DEBUG') cls = 'text-slate-400'
  return cls
}

function formatLogLine(line) {
  const message = line.message || ''
  const level = (line.level || 'default').toUpperCase()
  const timestamp = line.timestamp ? new Date(line.timestamp) : new Date()
  const time = isNaN(timestamp.getTime()) ? '--:--:--' : timestamp.toLocaleTimeString('en-US', { hour12: false })
  return `[${time}] [${level}] ${message}`
}

function getPodName(pod) {
  return pod?.name || pod?.pod || ''
}

function normalizePod(pod) {
  const namespace = pod?.namespace || pod?.ns || 'default'
  const name = getPodName(pod)

  return {
    ...pod,
    name,
    pod: pod?.pod || name,
    namespace,
  }
}

function normalizePodsResponse(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.pods)) return data.pods
  if (Array.isArray(data?.items)) return data.items
  if (data && typeof data === 'object') return [data]
  return []
}

function getStateBadge(state) {
  switch (state) {
    case 'CONNECTING':
      return 'bg-slate-900 text-slate-300'
    case 'CONNECTED':
      return 'bg-cyan-900 text-cyan-300'
    case 'STREAMING':
      return 'bg-emerald-900 text-emerald-300'
    case 'PAUSED':
      return 'bg-yellow-900 text-yellow-300'
    case 'RECONNECTING':
      return 'bg-yellow-900 text-yellow-300'
    case 'ERROR':
      return 'bg-rose-900 text-rose-300'
    default:
      return 'bg-slate-900 text-slate-300'
  }
}

export default function LiveLogsTerminal({ compact = false }) {
  const [pods, setPods] = useState([])
  const [selectedNamespace, setSelectedNamespace] = useState('default')
  const [selectedPod, setSelectedPod] = useState(null)
  const [status, setStatus] = useState('disconnected')
  const [streamState, setStreamState] = useState('DISCONNECTED')
  const [streaming, setStreaming] = useState(false)
  const [paused, setPaused] = useState(false)
  const [lines, setLines] = useState([])
  const [filterLevel, setFilterLevel] = useState('all')
  const [loadingPods, setLoadingPods] = useState(true)
  const containerRef = useRef(null)
  const autoScroll = useRef(true)
  const selectedPodRef = useRef(null)

  const debouncedAutoScroll = useDebounced(autoScroll.current, 100)

  const appendLine = (line) => {
    setLines((prev) => {
      const next = prev.concat(line)
      if (next.length > 1000) return next.slice(next.length - 1000)
      return next
    })
  }

  useEffect(() => {
    const unsubStatus = logSocket.onStatus((value) => {
      setStatus(value)
    })
    const unsubMessage = logSocket.onMessage((msg) => {
      if (msg.type === 'log') {
        appendLine(msg)
      } else if (msg.type === 'status' || msg.type === 'error') {
        appendLine({ message: `[${msg.type}] ${msg.message}`, level: msg.type === 'error' ? 'ERROR' : 'INFO', timestamp: new Date().toISOString() })
      }
    })

    fetchPods()

    return () => {
      unsubStatus && unsubStatus()
      unsubMessage && unsubMessage()
    }
  }, [])

  useEffect(() => {
    if (debouncedAutoScroll && containerRef.current && !paused) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [lines, debouncedAutoScroll, paused])

  const isFailingStatus = (statusValue) => {
    if (!statusValue) return false
    const normalized = statusValue.toLowerCase()
    return [
      'imagepullbackoff',
      'crashloopbackoff',
      'errimagepull',
      'failed',
      'pending',
      'error',
      'crashloop',
    ].some((failure) => normalized.includes(failure))
  }

  useEffect(() => {
    selectedPodRef.current = selectedPod
  }, [selectedPod])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchPods(true)
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!selectedPod) return

    if (streaming) {
      logSocket.changePod(getPodName(selectedPod), selectedPod.namespace)
      setPaused(false)
    }
  }, [selectedPod, streaming])

  useEffect(() => {
    const state = status === 'connecting'
      ? 'CONNECTING'
      : status === 'reconnecting'
      ? 'RECONNECTING'
      : status === 'connected'
      ? paused
        ? 'PAUSED'
        : streaming
          ? 'STREAMING'
          : 'CONNECTED'
      : status === 'error'
      ? 'ERROR'
      : 'DISCONNECTED'

    setStreamState(state)
  }, [status, streaming, paused])

  const fetchPods = async (preserveSelection = false) => {
    try {
      const res = await api.get('/pods')
      const items = normalizePodsResponse(res.data)
      const sorted = items.map(normalizePod).filter((item) => getPodName(item)).slice().sort((a, b) => {
        const aFail = isFailingStatus(a.status)
        const bFail = isFailingStatus(b.status)
        if (aFail !== bFail) return aFail ? -1 : 1
        const statusA = (a.status || '').toLowerCase()
        const statusB = (b.status || '').toLowerCase()
        const badA = statusA !== 'running'
        const badB = statusB !== 'running'
        if (badA !== badB) return badA ? -1 : 1
        return 0
      })
      setPods((prev) => {
        const next = sorted.filter((item, index, list) => {
          const key = `${item.namespace}/${getPodName(item)}`
          return list.findIndex((candidate) => `${candidate.namespace}/${getPodName(candidate)}` === key) === index
        })

        return next
      })
      setLoadingPods(false)

      const currentSelected = selectedPodRef.current
      if (preserveSelection && currentSelected) {
        const currentKey = `${currentSelected.namespace || 'default'}/${getPodName(currentSelected)}`
        const stillExists = sorted.find(
          (item) => `${item.namespace || 'default'}/${getPodName(item)}` === currentKey
        )

        if (stillExists) {
          setSelectedNamespace(stillExists.namespace || 'default')
          setSelectedPod(stillExists)
          return
        }

        if (sorted.length) {
          const first = sorted[0]
          setSelectedNamespace(first.namespace || 'default')
          setSelectedPod(first)
        } else {
          setSelectedPod(null)
        }
        return
      }

      if (!currentSelected && sorted.length) {
        const first = sorted[0]
        setSelectedNamespace(first.namespace || 'default')
        setSelectedPod(first)
      }
    } catch (e) {
      console.error('Failed to fetch pods', e)
      setLoadingPods(false)
    }
  }

  const startStream = (podName, ns) => {
    if (!podName) return
    setLines([])
    logSocket.startStream(podName, ns)
    setStreaming(true)
    setPaused(false)
  }

  const stopStream = () => {
    logSocket.stopStream()
    setStreaming(false)
    setPaused(false)
  }

  const pauseStream = () => {
    logSocket.pauseStream()
    setPaused(true)
  }

  const resumeStream = () => {
    logSocket.resumeStream()
    setPaused(false)
  }

  const clearLogs = () => setLines([])

  const download = () => {
    const blob = new Blob([lines.map(formatLogLine).join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${getPodName(selectedPod) || 'logs'}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.map(formatLogLine).join('\n'))
    } catch (e) {
      console.error('copy failed', e)
    }
  }

  const handleNamespaceChange = (value) => {
    setSelectedNamespace(value)
    const available = pods.filter((item) => (item.namespace || 'default') === value)
    if (available.length) {
      const selected = available.find((item) => item.status && item.status.toLowerCase() !== 'running') || available[0]
      setSelectedPod(selected)
    }
  }

  const handlePodChange = (value) => {
    if (!value) return
    const [namespace, podName] = value.split('/')
    const selected = pods.find((item) => getPodName(item) === podName && (item.namespace || 'default') === namespace)
    if (selected) {
      setSelectedNamespace(selected.namespace || 'default')
      setSelectedPod(selected)
    }
  }

  const filtered = lines.filter((l) => {
    if (filterLevel === 'all') return true
    const level = (l.level || '').toUpperCase()
    return level === filterLevel
  })

  const podOptions = useMemo(() => [
    ...new Set(pods.map((p) => p.namespace || 'default'))
  ], [pods])

  const filteredPods = useMemo(() => {
    const filtered = selectedNamespace
      ? pods.filter((item) => (item.namespace || 'default') === selectedNamespace)
      : pods
    return filtered
  }, [pods, selectedNamespace])

  const selectedPods = filteredPods
  const stateLabel = streamState === 'STREAMING'
    ? 'Streaming'
    : streamState === 'CONNECTED'
    ? 'Connected'
    : streamState === 'PAUSED'
    ? 'Streaming'
    : 'Disconnected'

  return (
    <div className={`rounded-2xl border border-cyan-600/10 bg-[#020617] shadow-sm ${compact ? 'p-3' : 'p-4'} flex flex-col`}>
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${streamState === 'STREAMING' ? 'bg-emerald-400 animate-pulse' : streamState === 'PAUSED' ? 'bg-yellow-400' : streamState === 'CONNECTED' ? 'bg-cyan-400' : streamState === 'CONNECTING' ? 'bg-slate-400' : streamState === 'RECONNECTING' ? 'bg-yellow-400' : 'bg-rose-400'}`}></div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <span className="font-semibold text-white">{getPodName(selectedPod) || 'No pod selected'}</span>
              <span>·</span>
              <span>{selectedPod?.namespace || selectedNamespace}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span className={`rounded-full px-3 py-1 ${getStateBadge(streamState)}`}>{stateLabel}</span>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-slate-300">Live terminal</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={clearLogs} className="rounded-full bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400 border border-slate-800 flex items-center gap-2"><Trash2 size={14}/> Clear</button>
          <button onClick={download} className="rounded-full bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400 border border-slate-800 flex items-center gap-2"><Download size={14}/> Download</button>
          <button onClick={copy} className="rounded-full bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400 border border-slate-800 flex items-center gap-2"><Copy size={14}/> Copy</button>
          {streaming ? (
            paused ? (
              <button onClick={resumeStream} className="rounded-full bg-cyan-600 px-3 py-2 text-sm text-white flex items-center gap-2"><Play size={14}/> Resume</button>
            ) : (
              <button onClick={pauseStream} className="rounded-full bg-slate-900 px-3 py-2 text-sm text-slate-300 border border-slate-800 flex items-center gap-2"><Pause size={14}/> Pause</button>
            )
          ) : (
            <button onClick={() => startStream(getPodName(selectedPod), selectedPod?.namespace || selectedNamespace)} className="rounded-full bg-cyan-600 px-3 py-2 text-sm text-white flex items-center gap-2"><Play size={14}/> Start</button>
          )}
          <button onClick={stopStream} className="rounded-full bg-rose-600 px-3 py-2 text-sm text-white flex items-center gap-2"><Square size={14}/> Stop</button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm min-w-[160px]" value={selectedNamespace} onChange={(e) => handleNamespaceChange(e.target.value)}>
          {podOptions.map((ns) => (
            <option key={ns} value={ns}>{ns}</option>
          ))}
        </select>

        <select className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm min-w-[200px]" value={selectedPod ? `${selectedPod.namespace}/${getPodName(selectedPod)}` : ''} onChange={(e) => handlePodChange(e.target.value)}>
          {selectedPods.map((item) => (
            <option key={`${item.namespace}/${getPodName(item)}`} value={`${item.namespace}/${getPodName(item)}`}>{getPodName(item)}</option>
          ))}
        </select>

        <select className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
          <option value="all">All</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
          <option value="DEBUG">DEBUG</option>
        </select>
      </div>

      <div className={`flex-1 overflow-hidden rounded-xl border border-slate-800 bg-black/60 ${compact ? 'min-h-[260px]' : 'min-h-[420px]'}`}>
        <div ref={containerRef} className="h-full overflow-y-auto px-3 py-4 font-mono text-sm leading-6 text-slate-300" onScroll={() => { if (containerRef.current) { autoScroll.current = (containerRef.current.scrollTop + containerRef.current.clientHeight) >= (containerRef.current.scrollHeight - 20) } }}>
          {(!lines.length && streaming) ? (
            <div className="flex h-full items-center justify-center text-slate-400">
              Waiting for live Kubernetes logs...
            </div>
          ) : (!lines.length ? (
            <div className="flex h-full items-center justify-center text-slate-500">
              {loadingPods ? 'Loading pods...' : 'No pod selected'}
            </div>
          ) : (
            filtered.map((l, idx) => {
              const cls = coloredLine(l)
              return (
                <div key={idx} className={`${cls} whitespace-pre-wrap py-0.5`}>{formatLogLine(l)}</div>
              )
            })
          ))}
        </div>
      </div>
    </div>
  )
}
