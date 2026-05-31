import { useEffect, useState, useCallback, useRef } from 'react'

import api from '../services/api'
import { createWebsocket } from '../services/ws'

import ConnectionStatus from '../components/ConnectionStatus'
import LiveLogsViewer from '../components/LiveLogsViewer'
import StatusCard from '../components/StatusCard'
import IncidentCard from '../components/IncidentCard'
import LoadingSpinner from '../components/LoadingSpinner'
import MetricsChart from '../components/MetricsChart'

function Dashboard() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [failedCount, setFailedCount] = useState(0)
  const [runningCount, setRunningCount] = useState(0)
  const [clusterHealth, setClusterHealth] = useState('unknown')
  const [toast, setToast] = useState(null)
  const [logsTarget, setLogsTarget] = useState(null)
  const [cpuSeries, setCpuSeries] = useState([])
  const [memSeries, setMemSeries] = useState([])
  const [logHealth, setLogHealth] = useState('unknown')
  const [logHealthMessage, setLogHealthMessage] = useState('Checking backend log stream...')
  const toastTimer = useRef(null)

  const cpuData = [
    { time: "10:00", usage: 20 },
    { time: "10:05", usage: 35 },
    { time: "10:10", usage: 40 },
    { time: "10:15", usage: 60 },
    { time: "10:20", usage: 45 },
  ]

  const memoryData = [
    { time: "10:00", usage: 30 },
    { time: "10:05", usage: 50 },
    { time: "10:10", usage: 55 },
    { time: "10:15", usage: 70 },
    { time: "10:20", usage: 65 },
  ]

  const showToast = (message) => {
    setToast(message)
    if (toastTimer.current) {
      clearTimeout(toastTimer.current)
    }
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }

  const fetchLogHealth = useCallback(async () => {
    try {
      const response = await api.get('/logs/health')
      const status = response?.data?.status === 'healthy' ? 'healthy' : 'unhealthy'
      setLogHealth(status)
      setLogHealthMessage(response?.data?.message || 'Log streaming backend status updated')
    } catch (error) {
      setLogHealth('unhealthy')
      setLogHealthMessage('Log streaming backend unavailable')
    }
  }, [])

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true)
      const useMock = import.meta.env.VITE_USE_MOCK === 'true'
      const url = useMock ? "/analyze?mock=true" : "/analyze"
      const response = await api.get(url)

      if (Array.isArray(response.data)) {
        setIssues(response.data)
      } else {
        setIssues([])
      }
    } catch (error) {
      console.error("FETCH ERROR:", error)
      setIssues([])
      showToast("Unable to load initial cluster data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIssues()
    fetchLogHealth()

    const healthInterval = setInterval(fetchLogHealth, 30000)

    const ws = createWebsocket((msg) => {
      if (msg.type === 'cluster_update') {
        setFailedCount(msg.failed_pod_count ?? 0)
        setRunningCount(msg.running_pod_count ?? 0)
        setClusterHealth(msg.cluster_health ?? 'unknown')

        if (Array.isArray(msg.incidents)) {
          setIssues(msg.incidents.slice().reverse())
        }

        if ((msg.incident_count ?? 0) > 0) {
          showToast('New incident detected in the cluster')
        }

        if (msg.metrics) {
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          const cpuPoint = {
            time: timestamp,
            usage: Math.round(msg.metrics.cpu_millicores ?? msg.metrics.cpu_usage ?? 0),
          }
          const memPoint = {
            time: timestamp,
            usage: Math.round((msg.metrics.memory_bytes ?? msg.metrics.memory_usage ?? 0) / (1024 * 1024)),
          }

          setCpuSeries((series) => [...series, cpuPoint].slice(-10))
          setMemSeries((series) => [...series, memPoint].slice(-10))
        }
      }
    }, (status) => {
      setConnectionStatus(status)
    })

    const onLogsView = (e) => setLogsTarget(e.detail)
    window.addEventListener('logs:view', onLogsView)

    return () => {
      ws.close()
      window.removeEventListener('logs:view', onLogsView)
      clearInterval(healthInterval)
      if (toastTimer.current) {
        clearTimeout(toastTimer.current)
      }
    }
  }, [fetchIssues, fetchLogHealth])

  useEffect(() => {
    const onRefetch = () => fetchIssues()
    window.addEventListener('incident:refetch', onRefetch)
    return () => window.removeEventListener('incident:refetch', onRefetch)
  }, [fetchIssues])

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="flex bg-slate-950 min-h-screen text-white">
      <Sidebar />

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-cyan-400">Cluster Overview</h1>
            <p className="text-sm text-slate-400 mt-2">Live streaming cluster health and incident telemetry.</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <ConnectionStatus status={connectionStatus} />
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${logHealth === 'healthy' ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/30' : logHealth === 'unhealthy' ? 'bg-rose-500/10 text-rose-300 ring-rose-500/30' : 'bg-yellow-500/10 text-yellow-300 ring-yellow-300/30'}`} title={logHealthMessage}>
              <span className={`h-2.5 w-2.5 rounded-full ${logHealth === 'healthy' ? 'bg-emerald-300' : logHealth === 'unhealthy' ? 'bg-rose-300' : 'bg-yellow-300'}`}></span>
              Log Stream {logHealth === 'healthy' ? 'Healthy' : logHealth === 'unhealthy' ? 'Offline' : 'Checking'}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={() => {
              setIssues([
                {
                  pod: "demo-crash-app",
                  namespace: "default",
                  status: "CrashLoopBackOff",
                  phase: "Running",
                  possible_reason: "Application failed during startup",
                  suggestion: "Check startup configuration",
                  logs: "Application failed to start\n",
                  container: null,
                  timestamp: Date.now(),
                  ai_analysis: "Demo AI analysis: startup failure detected."
                }
              ])
              showToast('Demo incident added locally')
            }}
            className="bg-cyan-600 hover:bg-cyan-700 transition-all px-4 py-2 rounded-md text-white"
          >
            Show Demo Incident
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatusCard title="Cluster Status" value={clusterHealth} color={clusterHealth === 'healthy' ? 'text-green-400' : 'text-yellow-400'} />
          <StatusCard title="Failed Pods" value={failedCount} color="text-red-400" />
          <StatusCard title="Running Pods" value={runningCount} color="text-cyan-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <MetricsChart
            title="CPU Usage"
            data={cpuSeries.length ? cpuSeries : cpuData}
            dataKey="usage"
            color="#22d3ee"
            livePoint={cpuSeries.length ? `${cpuSeries[cpuSeries.length - 1].usage} mcores` : null}
          />
          <MetricsChart
            title="Memory Usage"
            data={memSeries.length ? memSeries : memoryData}
            dataKey="usage"
            color="#f87171"
            livePoint={memSeries.length ? `${memSeries[memSeries.length - 1].usage} MB` : null}
          />
        </div>

        <div className="space-y-6">
          {issues.length > 0 ? (
            issues.map((issue, index) => {
              const key = `${issue.namespace}-${issue.pod}-${issue.status}-${issue.timestamp ?? index}`
              return <IncidentCard key={key} issue={issue} />
            })
          ) : (
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              <h2 className="text-xl text-green-400 font-semibold">No Active Incidents</h2>
              <p className="text-gray-400 mt-2">Cluster is operating normally.</p>
            </div>
          )}
        </div>

        {toast && (
          <div className="fixed right-6 bottom-6 bg-cyan-700 text-white px-4 py-3 rounded shadow-lg border border-cyan-500">
            {toast}
          </div>
        )}

        {logsTarget && (
          <LiveLogsViewer namespace={logsTarget.namespace} pod={logsTarget.pod} onClose={() => setLogsTarget(null)} />
        )}
      </div>
    </div>
  )
}

export default Dashboard
