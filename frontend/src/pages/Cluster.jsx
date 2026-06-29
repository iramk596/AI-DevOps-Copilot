import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  Layers3,
  ShieldCheck,
  Search,
  RefreshCw,
} from "lucide-react"
import socket from "../services/socket"

function Cluster() {
  const [pods, setPods] = useState([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [clusterLogs, setClusterLogs] = useState([])
  const [connectionStatus, setConnectionStatus] = useState("disconnected")
  const [clusterMetrics, setClusterMetrics] = useState({
    running_pods: 0,
    failed_pods: 0,
    total_pods: 0,
    cpu_mcores: 0,
    memory_mb: 0,
    estimated: true,
  })

  // Subscribe to websocket updates
  useEffect(() => {
    // Track connection status
    const unsubscribeStatus = socket.onStatus((status) => {
      setConnectionStatus(status)
    })

    // Subscribe to cluster updates
    const unsubscribeClusterUpdate = socket.on("cluster_update", (msg) => {
      if (msg.data && msg.data.pods) {
        const formattedPods = msg.data.pods.map((pod) => ({
          pod: pod.name || "unknown-pod",
          namespace: pod.namespace || "default",
          status: pod.status || "Unknown",
          node: pod.node || "unknown",
          restarts: pod.restarts || 0,
        }))

        setPods(formattedPods)
        setClusterMetrics({
          running_pods: msg.data.metrics?.running_pods ?? msg.data.stats?.running ?? formattedPods.filter((pod) => pod.status === "Running").length,
          failed_pods: msg.data.metrics?.failed_pods ?? msg.data.stats?.failed ?? formattedPods.filter((pod) => pod.status !== "Running").length,
          total_pods: msg.data.metrics?.total_pods ?? msg.data.stats?.total ?? formattedPods.length,
          cpu_mcores: Number(msg.data.metrics?.cpu_mcores ?? 0),
          memory_mb: Number(msg.data.metrics?.memory_mb ?? 0),
          estimated: msg.data.metrics?.estimated ?? true,
        })

        // Add to cluster logs
        setClusterLogs((prev) => [
          {
            message: `Cluster update: ${formattedPods.length} pods`,
            time: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 4),
        ])
      }
    })

    // Cleanup on unmount
    return () => {
      unsubscribeStatus()
      unsubscribeClusterUpdate()
    }
  }, [])

  const stats = useMemo(() => {
    const totalPods = clusterMetrics.total_pods
    const runningPods = clusterMetrics.running_pods
    const failedPods = clusterMetrics.failed_pods

    const namespaces = [
      ...new Set(pods.map((pod) => pod.namespace)),
    ].length

    const cpuUsage = clusterMetrics.cpu_mcores
    const memoryUsage = clusterMetrics.memory_mb

    return {
      totalPods,
      runningPods,
      failedPods,
      namespaces,
      cpuUsage,
      memoryUsage,
      estimated: clusterMetrics.estimated,
    }
  }, [clusterMetrics, pods])

  const filteredPods = pods.filter((pod) => {
    const podName = pod.pod || pod.name || ""

    return (
      podName.toLowerCase().includes(search.toLowerCase()) &&
      (statusFilter === "All Statuses" ||
        pod.status === statusFilter)
    )
  })

  const statusIndicatorColor = useMemo(() => {
    if (connectionStatus === "connected") return "bg-emerald-400"
    if (connectionStatus === "reconnecting") return "bg-yellow-400"
    return "bg-red-400"
  }, [connectionStatus])

  const statusText = useMemo(() => {
    if (connectionStatus === "connected") return "Connected"
    if (connectionStatus === "reconnecting") return "Reconnecting..."
    return "Offline"
  }, [connectionStatus])

  return (
    <div className="min-h-screen bg-[#020617] px-8 py-6 text-white">
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-5xl font-bold text-cyan-400">
            Kubernetes Cluster
          </h1>

          <p className="mt-2 text-slate-400">
            Live pod telemetry, namespace analytics,
            and resource monitoring.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
            connectionStatus === "connected"
              ? "bg-emerald-500/10 text-emerald-400"
              : connectionStatus === "reconnecting"
              ? "bg-yellow-500/10 text-yellow-400"
              : "bg-red-500/10 text-red-400"
          }`}>
            <span className={`h-2 w-2 rounded-full ${statusIndicatorColor}`}></span>
            {statusText}
          </div>

          <div className="flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300">
            <RefreshCw size={14} className="animate-spin" />
            LIVE Â· Every 5s
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Pods"
          value={stats.totalPods}
          color="text-cyan-400"
        />

        <StatCard
          title="Running"
          value={stats.runningPods}
          color="text-emerald-400"
        />

        <StatCard
          title="Failed"
          value={stats.failedPods}
          color="text-red-400"
        />

        <StatCard
          title="Namespaces"
          value={stats.namespaces}
          color="text-green-400"
        />

        <StatCard
          title="CPU"
          value={`${stats.estimated ? "~" : ""}${stats.cpuUsage.toFixed(0)} m`}
          color="text-cyan-300"
        />

        <StatCard
          title="Memory"
          value={`${stats.estimated ? "~" : ""}${stats.memoryUsage.toFixed(0)} MB`}
          color="text-pink-300"
        />
      </div>

      {/* SUMMARY */}
      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        {/* Cluster Summary */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-6 flex items-center gap-3">
            <Activity className="text-cyan-400" />
            <h2 className="text-2xl font-bold text-cyan-400">
              Cluster Summary
            </h2>
          </div>

          <div className="space-y-6">
            <ProgressBar
              label="CPU Usage"
              value={stats.cpuUsage}
              max={500}
              color="bg-cyan-400"
              suffix={`${stats.estimated ? "~" : ""}${stats.cpuUsage.toFixed(0)} mcores`}
            />

            <ProgressBar
              label="Memory Usage"
              value={stats.memoryUsage}
              max={2000}
              color="bg-pink-400"
              suffix={`${stats.estimated ? "~" : ""}${stats.memoryUsage.toFixed(0)} MB`}
            />

            <div className="rounded-2xl bg-[#020617] p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">
                  Cluster Health
                </span>

                <span className={`font-bold ${
                  stats.failedPods === 0
                    ? "text-emerald-400"
                    : stats.failedPods > 3
                    ? "text-red-400"
                    : "text-yellow-400"
                }`}>
                  {stats.failedPods === 0
                    ? "Healthy"
                    : stats.failedPods > 3
                    ? "Degraded"
                    : "Warning"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Namespaces */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-6 flex items-center gap-3">
            <Layers3 className="text-cyan-400" />

            <h2 className="text-2xl font-bold text-cyan-400">
              Namespaces
            </h2>
          </div>

          <div className="space-y-4">
            {[...new Set(pods.map((p) => p.namespace))].map(
              (namespace, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-2xl bg-[#020617] p-4"
                >
                  <span className="font-medium text-white">
                    {namespace}
                  </span>

                  <span className="font-bold text-cyan-400">
                    {
                      pods.filter(
                        (p) => p.namespace === namespace
                      ).length
                    }{" "}
                    pods
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Activity */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-6 flex items-center gap-3">
            <ShieldCheck className="text-cyan-400" />

            <h2 className="text-2xl font-bold text-cyan-400">
              Cluster Activity
            </h2>
          </div>

          <div className="space-y-3">
            {clusterLogs.map((log, index) => (
              <div
                key={index}
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-emerald-300">
                    {log.message}
                  </p>

                  <span className="text-xs text-emerald-500">
                    {log.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="mt-8 flex flex-col gap-4 lg:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            size={18}
          />

          <input
            type="text"
            placeholder="Search pods..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-12 py-4 text-white outline-none transition focus:border-cyan-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none"
        >
          <option>All Statuses</option>
          <option>Running</option>
          <option>Failed</option>
          <option>CrashLoopBackOff</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-slate-800 bg-[#020617]">
              <tr>
                <th className="px-6 py-5 text-left text-sm font-semibold text-slate-400">
                  Pod
                </th>

                <th className="px-6 py-5 text-left text-sm font-semibold text-slate-400">
                  Namespace
                </th>

                <th className="px-6 py-5 text-left text-sm font-semibold text-slate-400">
                  Status
                </th>

                <th className="px-6 py-5 text-left text-sm font-semibold text-slate-400">
                  Node
                </th>

                <th className="px-6 py-5 text-left text-sm font-semibold text-slate-400">
                  Restarts
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {filteredPods.map((pod, index) => (
                <tr
                  key={index}
                  className="transition hover:bg-slate-900/40"
                >
                  <td className="px-6 py-5 font-medium text-white">
                    {pod.pod || pod.name || "unknown-pod"}
                  </td>

                  <td className="px-6 py-5 text-slate-300">
                    {pod.namespace || "default"}
                  </td>

                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                        pod.status === "Running"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : pod.status === "Failed"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-current"></span>

                      {pod.status || "Unknown"}
                    </span>
                  </td>

                  <td className="px-6 py-5 text-slate-300">
                    {pod.node || "unknown"}
                  </td>

                  <td className="px-6 py-5 font-semibold text-emerald-400">
                    {pod.restarts || 0}
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

function StatCard({ title, value, color }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <p className="text-sm text-slate-400">{title}</p>

      <h2 className={`mt-3 text-5xl font-bold ${color}`}>
        {value}
      </h2>
    </div>
  )
}

function ProgressBar({
  label,
  value,
  max,
  color,
  suffix,
}) {
  return (
    <div class="rounded-2xl bg-[#020617] p-4">
      <div class="mb-3 flex items-center justify-between">
        <span class="text-slate-400">{label}</span>
        <span class="font-semibold text-white">{suffix}</span>
      </div>
      <div class="h-3 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${color}`}
          style={{
            width: `${Math.min((value / max) * 100, 100)}%`,
          }}
        />
      </div>
    </div>
  )
}

export default Cluster
