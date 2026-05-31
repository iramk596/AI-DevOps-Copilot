import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertTriangle,
  Cpu,
  Database,
  ServerCrash,
  ShieldCheck,
} from "lucide-react"

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

import IncidentCard from "../components/IncidentCard"
import LiveLogsViewer from "../components/LiveLogsViewer"

function Dashboard() {
  const [issues, setIssues] = useState([])
  const [connected, setConnected] = useState(false)

  const [clusterStats, setClusterStats] = useState({
    failed_pod_count: 0,
    running_pod_count: 0,
    cluster_health: "unknown",
  })

  const [cpuMetrics, setCpuMetrics] = useState([])
  const [memoryMetrics, setMemoryMetrics] = useState([])

  const [showLogs, setShowLogs] = useState(false)
  const [selectedPod, setSelectedPod] = useState(null)

  // Fake live metrics
  useEffect(() => {
    const interval = setInterval(() => {
      const randomCpu = Math.floor(Math.random() * 500) + 50
      const randomMemory = Math.floor(Math.random() * 2000) + 100

      setCpuMetrics((prev) => [
        ...prev.slice(-5),
        {
          time: new Date().toLocaleTimeString(),
          value: randomCpu,
        },
      ])

      setMemoryMetrics((prev) => [
        ...prev.slice(-5),
        {
          time: new Date().toLocaleTimeString(),
          value: randomMemory,
        },
      ])
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // WebSocket
  useEffect(() => {
    let socket

    try {
      socket = new WebSocket("ws://127.0.0.1:8000/ws")

      socket.onopen = () => {
        setConnected(true)
      }

      socket.onclose = () => {
        setConnected(false)
      }

      socket.onerror = () => {
        setConnected(false)
      }

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)

          setClusterStats({
            failed_pod_count: msg.failed_pod_count || 0,
            running_pod_count: msg.running_pod_count || 0,
            cluster_health: msg.cluster_health || "healthy",
          })

          if (Array.isArray(msg.incidents)) {
            setIssues((prevIssues) => {
              return msg.incidents.map((newIssue) => {
                const existing = prevIssues.find(
                  (oldIssue) =>
                    oldIssue.pod === newIssue.pod &&
                    oldIssue.namespace === newIssue.namespace
                )

                return {
                  ...existing,
                  ...newIssue,
                  ai_analysis:
                    newIssue.ai_analysis ||
                    existing?.ai_analysis ||
                    "AI analysis pending...",
                }
              })
            })
          }
        } catch (err) {
          console.error(err)
        }
      }
    } catch (err) {
      console.error(err)
    }

    return () => {
      if (socket) socket.close()
    }
  }, [])

  // Manual fetch fallback
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/analyze")
        const data = await res.json()

        if (Array.isArray(data)) {
          setIssues(data)
        }
      } catch (err) {
        console.error(err)
      }
    }

    fetchData()
  }, [])

  const failedPods = clusterStats.failed_pod_count
  const runningPods = clusterStats.running_pod_count

  const latestCpu = cpuMetrics[cpuMetrics.length - 1]?.value || 0
  const latestMemory = memoryMetrics[memoryMetrics.length - 1]?.value || 0

  const healthColor = useMemo(() => {
    return clusterStats.cluster_health === "healthy"
      ? "text-green-400"
      : "text-red-400"
  }, [clusterStats.cluster_health])

  return (
    <div className="min-h-screen bg-[#020617] p-8 text-white">
      {/* HEADER */}
      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-5xl font-bold text-cyan-400">
            Cluster Overview
          </h1>

          <p className="mt-2 text-slate-400">
            Live streaming Kubernetes health and AI telemetry.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm text-green-400">
            <span className="h-2 w-2 rounded-full bg-green-400"></span>
            {connected ? "Connected" : "Disconnected"}
          </div>

          <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300">
            Log Stream Healthy
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatusCard
          title="Cluster Status"
          value={clusterStats.cluster_health}
          icon={<ShieldCheck size={22} />}
          color={healthColor}
        />

        <StatusCard
          title="Failed Pods"
          value={failedPods}
          icon={<ServerCrash size={22} />}
          color="text-red-400"
        />

        <StatusCard
          title="Running Pods"
          value={runningPods}
          icon={<Activity size={22} />}
          color="text-cyan-400"
        />
      </div>

      {/* CHARTS */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <MetricChart
          title="CPU Usage"
          icon={<Cpu size={22} />}
          data={cpuMetrics}
          color="#22d3ee"
          latest={`${latestCpu} mcores`}
        />

        <MetricChart
          title="Memory Usage"
          icon={<Database size={22} />}
          data={memoryMetrics}
          color="#f472b6"
          latest={`${latestMemory} MB`}
        />
      </div>

      {/* INCIDENTS */}
      <div className="mt-8 space-y-8">
        {issues.length > 0 ? (
          issues.map((issue, index) => (
            <IncidentCard
              key={index}
              issue={issue}
              onOpenLogs={(pod) => {
                setSelectedPod(pod)
                setShowLogs(true)
              }}
            />
          ))
        ) : (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center">
            <AlertTriangle
              size={48}
              className="mx-auto mb-4 text-yellow-400"
            />

            <h2 className="text-2xl font-semibold text-white">
              No incidents detected
            </h2>

            <p className="mt-2 text-slate-400">
              Your cluster is currently stable.
            </p>
          </div>
        )}
      </div>

      {/* LOGS */}
      {showLogs && selectedPod && (
        <div className="mt-8">
          <LiveLogsViewer pod={selectedPod} />
        </div>
      )}
    </div>
  )
}

function StatusCard({ title, value, icon, color }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
      <div className="mb-4 flex items-center gap-3 text-cyan-400">
        {icon}
        <span className="text-lg font-semibold">{title}</span>
      </div>

      <h2 className={`text-5xl font-bold ${color}`}>
        {value}
      </h2>
    </div>
  )
}

function MetricChart({ title, icon, data, color, latest }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-cyan-400">
          {icon}
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>

        <span className="text-sm text-slate-400">
          Live: {latest}
        </span>
      </div>

      <div className="h-[260px] rounded-2xl border border-slate-800 bg-[#020617] p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e293b"
            />

            <XAxis
              dataKey="time"
              stroke="#64748b"
              tick={{ fontSize: 10 }}
            />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default Dashboard