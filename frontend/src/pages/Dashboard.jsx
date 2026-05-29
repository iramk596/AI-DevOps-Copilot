import { useEffect, useState, useCallback } from "react"

import api from "../services/api"
import { createWebsocket } from "../services/ws"

import ConnectionStatus from "../components/ConnectionStatus"
import LogsViewer from "../components/LogsViewer"

import Sidebar from "../components/Sidebar"
import StatusCard from "../components/StatusCard"
import IncidentCard from "../components/IncidentCard"
import LoadingSpinner from "../components/LoadingSpinner"
import MetricsChart from "../components/MetricsChart"

function Dashboard() {

  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [failedCount, setFailedCount] = useState(0)
  const [runningCount, setRunningCount] = useState(0)
  const [clusterHealth, setClusterHealth] = useState('unknown')
  const [toast, setToast] = useState(null)
  const [logsTarget, setLogsTarget] = useState(null)
  const [cpuSeries, setCpuSeries] = useState([])
  const [memSeries, setMemSeries] = useState([])

  const cpuData = [
    { time: "10:00", usage: 20 },
    { time: "10:05", usage: 35 },
    { time: "10:10", usage: 40 },
    { time: "10:15", usage: 60 },
    { time: "10:20", usage: 45 }
  ]

  const memoryData = [
    { time: "10:00", usage: 30 },
    { time: "10:05", usage: 50 },
    { time: "10:10", usage: 55 },
    { time: "10:15", usage: 70 },
    { time: "10:20", usage: 65 }
  ]

  const fetchIssues = useCallback(async () => {

    try {

      setLoading(true)

      // Support dev-only mock mode via VITE_USE_MOCK
      const useMock = import.meta.env.VITE_USE_MOCK === 'true'
      const url = useMock ? "/analyze?mock=true" : "/analyze"

      const response = await api.get(url)

      console.log("API RESPONSE:", response.data)

      if (Array.isArray(response.data)) {

        setIssues(response.data)

      } else {

        setIssues([])

      }

    } catch (error) {

      console.error("FETCH ERROR:", error)

      setIssues([])

    } finally {

      setLoading(false)

    }

  }, [])

  useEffect(() => {

    fetchIssues()

    const interval = setInterval(fetchIssues, 10000)

    // Setup websocket for live updates
    const ws = createWebsocket((msg) => {
      if (msg.type === 'cluster_update') {
        setFailedCount(msg.failed_pod_count || 0)
        setRunningCount(msg.running_pod_count || 0)
        setClusterHealth(msg.cluster_health || 'unknown')
        if (Array.isArray(msg.incidents)) {
          // show latest first
          setIssues(msg.incidents.slice().reverse())
        }

        if ((msg.incident_count || 0) > 0) {
          setToast('New Kubernetes incident detected')
          setTimeout(() => setToast(null), 4000)
        }

        // handle metrics if present
        if (msg.metrics) {
          const t = new Date().toLocaleTimeString()
          const cpuPoint = { time: t, usage: Math.round(msg.metrics.cpu_millicores) }
          const memPoint = { time: t, usage: Math.round(msg.metrics.memory_bytes / (1024 * 1024)) } // MB

          setCpuSeries((s) => {
            const arr = s.concat([cpuPoint]).slice(-30)
            return arr
          })

          setMemSeries((s) => {
            const arr = s.concat([memPoint]).slice(-30)
            return arr
          })
        }
      }
    }, (status) => {
      setConnectionStatus(status)
    })

    // listen for logs:view events
    const onLogsView = (e) => setLogsTarget(e.detail)
    window.addEventListener('logs:view', onLogsView)

    return () => { clearInterval(interval); ws.close(); window.removeEventListener('logs:view', onLogsView) }

  }, [fetchIssues])

  // Listen for manual refetch events (e.g. after restart/delete)
  useEffect(() => {
    const onRefetch = () => {
      fetchIssues()
    }

    window.addEventListener('incident:refetch', onRefetch)

    return () => window.removeEventListener('incident:refetch', onRefetch)
  }, [fetchIssues])

  if (loading) {

    return <LoadingSpinner />

  }

  return (

    <div className="flex bg-gray-950 min-h-screen text-white">

      <Sidebar />

      <div className="flex-1 p-8 overflow-y-auto">

        <h1 className="text-4xl font-bold text-cyan-400 mb-8">
          Cluster Overview
        </h1>

        <div className="mb-4">
          <button
            onClick={() => {
              // inject a demo incident for testing restart/delete buttons
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
                  timestamp: null,
                  ai_analysis: "Demo AI analysis: startup failure detected."
                }
              ])
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md mr-2"
          >
            Show Demo Incident
          </button>
          <div className="mt-2 float-right">
            <ConnectionStatus status={connectionStatus} />
          </div>
        </div>

        {/* STATUS CARDS */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

          <StatusCard title="Cluster Status" value={clusterHealth} color={clusterHealth === 'healthy' ? 'text-green-400' : 'text-yellow-400'} />

          <StatusCard title="Failed Pods" value={failedCount} color="text-red-400" />

          <StatusCard title="Running Pods" value={runningCount} color="text-cyan-400" />

        </div>

        {/* METRICS */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

          <MetricsChart
            title="CPU Usage"
            data={cpuSeries.length ? cpuSeries : cpuData}
            dataKey="usage"
            color="#22d3ee"
            livePoint={cpuSeries.length ? `${cpuSeries[cpuSeries.length-1].usage} mcores` : null}
          />

          <MetricsChart
            title="Memory Usage"
            data={memSeries.length ? memSeries : memoryData}
            dataKey="usage"
            color="#f87171"
            livePoint={memSeries.length ? `${memSeries[memSeries.length-1].usage} MB` : null}
          />

        </div>

        {/* INCIDENTS */}

        <div className="space-y-6">

          {issues.length > 0 ? (
            issues.map((issue, index) => (
              <IncidentCard key={index} issue={issue} />
            ))
          ) : (
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              <h2 className="text-xl text-green-400 font-semibold">No Active Incidents</h2>
              <p className="text-gray-400 mt-2">Cluster is operating normally.</p>
            </div>
          )}

        </div>

        {toast && (
          <div className="fixed right-6 bottom-6 bg-cyan-700 text-white px-4 py-3 rounded shadow-lg">
            {toast}
          </div>
        )}

        {logsTarget && (
          <LogsViewer namespace={logsTarget.namespace} pod={logsTarget.pod} onClose={() => setLogsTarget(null)} />
        )}

      </div>

    </div>

  )

}

export default Dashboard
