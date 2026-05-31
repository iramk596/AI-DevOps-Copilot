import { useEffect, useState, useCallback, useMemo } from 'react'
import api from '../services/api'
import { createWebsocket } from '../services/ws'
import StatusCard from '../components/StatusCard'
import LoadingSpinner from '../components/LoadingSpinner'
import ConnectionStatus from '../components/ConnectionStatus'

function Cluster() {
  const [pods, setPods] = useState([])
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [cpuUsage, setCpuUsage] = useState(null)
  const [memoryUsage, setMemoryUsage] = useState(null)

  const fetchPods = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/pods')
      setPods(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Failed to load pods', error)
      setPods([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPods()

    const ws = createWebsocket((msg) => {
      if (msg.type === 'cluster_update') {
        if (msg.metrics) {
          setCpuUsage(msg.metrics.cpu_millicores ?? null)
          setMemoryUsage(msg.metrics.memory_bytes ? Math.round(msg.metrics.memory_bytes / (1024 * 1024)) : null)
        }
      }
    }, (status) => setConnectionStatus(status))

    return () => ws.close()
  }, [fetchPods])

  const runningPods = useMemo(() => pods.filter((pod) => pod.status === 'Running').length, [pods])
  const failedPods = useMemo(() => pods.filter((pod) => pod.status !== 'Running').length, [pods])
  const namespaces = useMemo(() => [...new Set(pods.map((pod) => pod.namespace || 'default'))].length, [pods])

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="p-8 overflow-y-auto min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold text-cyan-400">Kubernetes Cluster Monitoring</h1>
          <p className="text-slate-400 mt-2">Live pod status, namespace telemetry, and resource health.</p>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatus status={connectionStatus} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-10">
        <StatusCard title="Total Pods" value={pods.length} color="text-cyan-400" glow />
        <StatusCard title="Running" value={runningPods} color="text-green-400" glow />
        <StatusCard title="Failed" value={failedPods} color="text-red-400" glow />
        <StatusCard title="Namespaces" value={namespaces} color="text-emerald-400" glow />
        <StatusCard title="Nodes" value="N/A" color="text-yellow-400" glow />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-cyan-300 mb-4">Cluster Resource Summary</h2>
          <div className="space-y-4 text-gray-300">
            <div className="flex items-center justify-between rounded-3xl bg-slate-950 p-4">
              <span>CPU Usage</span>
              <span className="text-white">{cpuUsage !== null ? `${cpuUsage} mcores` : 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between rounded-3xl bg-slate-950 p-4">
              <span>Memory Usage</span>
              <span className="text-white">{memoryUsage !== null ? `${memoryUsage} MB` : 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between rounded-3xl bg-slate-950 p-4">
              <span>Namespaces</span>
              <span className="text-white">{namespaces}</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-cyan-300 mb-4">Node Health Snapshot</h2>
          <p className="text-slate-400 mb-4">Node-level details are available in the next phase. For now, monitor pod health and namespace distribution in real time.</p>
          <div className="rounded-3xl border border-gray-800 bg-slate-950 p-4 text-slate-300">
            Node data is currently not available through the cluster API.
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-cyan-300 mb-6">Pod Status Table</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto text-left text-sm text-gray-300">
            <thead>
              <tr className="border-b border-gray-800 text-slate-400">
                <th className="px-4 py-3">Pod</th>
                <th className="px-4 py-3">Namespace</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {pods.map((pod, index) => (
                <tr key={`${pod.namespace}-${pod.name}-${index}`} className="border-b border-gray-800 last:border-b-0 hover:bg-white/5">
                  <td className="px-4 py-4 text-white">{pod.name}</td>
                  <td className="px-4 py-4">{pod.namespace}</td>
                  <td className={`px-4 py-4 font-semibold ${pod.status === 'Running' ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {pod.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Cluster
