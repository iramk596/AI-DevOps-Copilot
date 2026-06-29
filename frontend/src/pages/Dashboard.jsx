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
import LiveLogsTerminal from "../components/LiveLogsTerminal"
import socket from "../services/socket"

const normalizeTimestampSeconds = (timestamp) => {
  if (timestamp === undefined || timestamp === null || timestamp === "") {
    return Math.floor(Date.now() / 1000)
  }

  if (typeof timestamp === "number" && Number.isFinite(timestamp)) {
    return timestamp > 1e12
      ? Math.floor(timestamp / 1000)
      : Math.floor(timestamp)
  }

  if (typeof timestamp === "string") {
    const numeric = Number(timestamp)
    if (Number.isFinite(numeric)) {
      return numeric > 1e12 ? Math.floor(numeric / 1000) : Math.floor(numeric)
    }

    const parsed = Date.parse(timestamp)
    if (!Number.isNaN(parsed)) {
      return Math.floor(parsed / 1000)
    }
  }

  return Math.floor(Date.now() / 1000)
}

const normalizeTimestampMs = (timestamp) => {
  if (timestamp === undefined || timestamp === null || timestamp === "") {
    return undefined
  }

  if (typeof timestamp === "number" && Number.isFinite(timestamp)) {
    return timestamp > 1e12 ? timestamp : timestamp * 1000
  }

  if (typeof timestamp === "string") {
    const numeric = Number(timestamp)
    if (Number.isFinite(numeric)) {
      return numeric > 1e12 ? numeric : numeric * 1000
    }

    const parsed = Date.parse(timestamp)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return undefined
}

const formatTimestamp = (timestamp) => {
  const ms = normalizeTimestampMs(timestamp)
  if (!Number.isFinite(ms)) {
    return "Just now"
  }

  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) {
    return "Just now"
  }

  return date.toLocaleString()
}

const createHistoryPoints = (history = []) => {
  if (!Array.isArray(history)) {
    return []
  }

  return history
    .map((item) => {
      if (!item) {
        return null
      }

      const value = Number(item.value ?? item.usage ?? item.cpu ?? item.memory)
      if (!Number.isFinite(value)) {
        return null
      }

      const rawTime = item.time ?? item.timestamp ?? item.ts
      const timestampMs = normalizeTimestampMs(rawTime)
      const time = new Date(timestampMs).toLocaleTimeString()

      return {
        time,
        value,
      }
    })
    .filter(Boolean)
    .slice(-20)
}

function Dashboard() {
  const [issues, setIssues] = useState([])
  const [connectionStatus, setConnectionStatus] = useState("disconnected")
  const [clusterStats, setClusterStats] = useState({
    running: 0,
    failed: 0,
    total: 0,
    cluster_health: "unknown",
  })
  const [cpuHistory, setCpuHistory] = useState([
    { time: new Date().toLocaleTimeString(), value: 0 },
  ])
  const [memoryHistory, setMemoryHistory] = useState([
    { time: new Date().toLocaleTimeString(), value: 0 },
  ])
  const [showLogs, setShowLogs] = useState(false)
  const [selectedPod, setSelectedPod] = useState(null)

  useEffect(() => {
    socket.connect()

    const unsubscribeStatus = socket.onStatus((status) => {
      setConnectionStatus(status)
    })

    const unsubscribeClusterUpdate = socket.on("cluster_update", (msg) => {
      const payload = msg?.data
      if (!payload) {
        return
      }

      setClusterStats({
        running: payload.stats?.running ?? 0,
        failed: payload.stats?.failed ?? 0,
        total: payload.stats?.total ?? 0,
        cluster_health: payload.stats?.cluster_health ?? "unknown",
      })

      const nextCpuHistory = createHistoryPoints(payload.cpu_history)
      const nextMemoryHistory = createHistoryPoints(payload.memory_history)

      if (nextCpuHistory.length > 0) {
        setCpuHistory(nextCpuHistory)
      }

      if (nextMemoryHistory.length > 0) {
        setMemoryHistory(nextMemoryHistory)
      }

      if (Array.isArray(payload.incidents)) {
        setIssues(payload.incidents)
      }
    })

    const unsubscribeIncident = socket.on("incident", (msg) => {
      if (!msg?.data) {
        return
      }

      setIssues((prev) => {
        const incident = msg.data
        const nextKey = `${incident.namespace}:${incident.pod}:${incident.status}`
        const remaining = prev.filter((item) => {
          const itemKey = `${item.namespace}:${item.pod}:${item.status}`
          return itemKey !== nextKey
        })

        return [incident, ...remaining]
      })
    })

    const handleLogsView = (event) => {
      const pod = event?.detail?.pod
      if (!pod) {
        return
      }

      setSelectedPod(pod)
      setShowLogs(true)
    }

    window.addEventListener("logs:view", handleLogsView)

    return () => {
      unsubscribeStatus()
      unsubscribeClusterUpdate()
      unsubscribeIncident()
      window.removeEventListener("logs:view", handleLogsView)
    }
  }, [])

  useEffect(() => {
    if (showLogs && selectedPod) {
      window.requestAnimationFrame(() => {
        document
          .getElementById("dashboard-log-panel")
          ?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    }
  }, [showLogs, selectedPod])

  const sanitizedIssues = useMemo(() => {
    if (!Array.isArray(issues)) {
      return []
    }

    return issues
      .filter(Boolean)
      .map((issue, index) => {
        const safeIssue = issue || {}
        const rawTimestamp =
          safeIssue.timestamp ?? safeIssue.time ?? safeIssue.ts
        const timestampSeconds = normalizeTimestampSeconds(rawTimestamp)
        const formattedTimestamp = formatTimestamp(rawTimestamp)

        return {
          ...safeIssue,
          pod: safeIssue.pod || safeIssue.name || `unknown-pod-${index + 1}`,
          namespace: safeIssue.namespace || safeIssue.ns || "default",
          status: safeIssue.status || "Unknown",
          timestamp: timestampSeconds,
          formattedTimestamp,
          possible_reason:
            safeIssue.possible_reason ||
            safeIssue.rootCause ||
            safeIssue.reason ||
            "Awaiting AI diagnosis from the remediation engine.",
          suggestion:
            safeIssue.suggestion ||
            safeIssue.remediation ||
            "Review pod logs, events, and deployment configuration.",
          ai_analysis:
            safeIssue.ai_analysis ||
            safeIssue.aiAnalysis ||
            safeIssue.analysis ||
            "AI analysis unavailable. Waiting for live cluster insights.",
        }
      })
  }, [issues])

  const hasIncidents = sanitizedIssues.length > 0

  const latestCpu = useMemo(
    () => cpuHistory[cpuHistory.length - 1]?.value ?? 0,
    [cpuHistory]
  )

  const latestMemory = useMemo(
    () => memoryHistory[memoryHistory.length - 1]?.value ?? 0,
    [memoryHistory]
  )

  const clusterHealthLabel = useMemo(() => {
    const rawHealth = String(clusterStats.cluster_health || "").toLowerCase()
    if (rawHealth === "healthy") return "Healthy"
    if (rawHealth === "warning" || rawHealth === "degraded") return "Degraded"
    if (rawHealth === "critical") return "Critical"
    return "Unknown"
  }, [clusterStats.cluster_health])

  const healthColor = useMemo(() => {
    if (clusterHealthLabel === "Healthy") return "text-green-400"
    if (clusterHealthLabel === "Degraded") return "text-yellow-400"
    if (clusterHealthLabel === "Critical") return "text-red-400"
    return "text-slate-400"
  }, [clusterHealthLabel])

  const statusIndicatorColor = useMemo(() => {
    if (connectionStatus === "connected") return "bg-green-400"
    if (connectionStatus === "reconnecting") return "bg-yellow-400"
    return "bg-red-400"
  }, [connectionStatus])

  const statusText = useMemo(() => {
    if (connectionStatus === "connected") return "Connected"
    if (connectionStatus === "reconnecting") return "Reconnecting..."
    if (connectionStatus === "connecting") return "Connecting..."
    return "Disconnected"
  }, [connectionStatus])

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
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
              connectionStatus === "connected"
                ? "bg-green-500/10 text-green-400"
                : connectionStatus === "reconnecting"
                ? "bg-yellow-500/10 text-yellow-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${statusIndicatorColor}`}></span>
            {statusText}
          </div>

          <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300">
            Streaming Active
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatusCard
          title="Cluster Status"
          value={clusterHealthLabel}
          icon={<ShieldCheck size={22} />}
          color={healthColor}
        />

        <StatusCard
          title="Failed Pods"
          value={clusterStats.failed}
          icon={<ServerCrash size={22} />}
          color="text-red-400"
        />

        <StatusCard
          title="Running Pods"
          value={clusterStats.running}
          icon={<Activity size={22} />}
          color="text-cyan-400"
        />
      </div>

      {/* CHARTS */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <MetricChart
          title="CPU Usage"
          icon={<Cpu size={22} />}
          data={cpuHistory}
          color="#22d3ee"
          latest={`${latestCpu.toFixed(1)} %`}
        />

        <MetricChart
          title="Memory Usage"
          icon={<Database size={22} />}
          data={memoryHistory}
          color="#f472b6"
          latest={`${latestMemory.toFixed(1)} %`}
        />
      </div>

      {/* INCIDENTS */}
      <div className="mt-8 space-y-8">
        {hasIncidents ? (
          sanitizedIssues.map((issue, index) => (
            <IncidentCard
              key={`${issue.pod}-${issue.timestamp}-${index}`}
              issue={issue}
              onOpenLogs={() => {
                setSelectedPod(issue.pod)
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

      {/* Compact terminal */}
      <div className="mt-8">
        <LiveLogsTerminal compact />
      </div>

      {/* LOGS */}
      {showLogs && selectedPod && (
        <div id="dashboard-log-panel" className="mt-8">
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

      <h2 className={`text-5xl font-bold ${color}`}>{value}</h2>
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

        <span className="text-sm text-slate-400">Live: {latest}</span>
      </div>

      <div className="h-[260px] rounded-2xl border border-slate-800 bg-[#020617] p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
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
