import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Search } from "lucide-react"

import IncidentCard from "../components/IncidentCard"
import socket from "../services/socket"

function Incidents() {
  const [incidents, setIncidents] = useState([])
  const [connected, setConnected] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Statuses")

  useEffect(() => {
    socket.connect()

    const unsubscribeStatus = socket.onStatus((status) => {
      setConnected(status === "connected")
    })

    const unsubscribeCluster = socket.on("cluster_update", (payload) => {
      if (payload?.data?.incidents) {
        setIncidents(payload.data.incidents)
      }
    })

    const unsubscribeIncident = socket.on("incident", (payload) => {
      if (payload?.data) {
        setIncidents((prev) => [payload.data, ...prev])
      }
    })

    return () => {
      unsubscribeStatus()
      unsubscribeCluster()
      unsubscribeIncident()
    }
  }, [])

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const query = search.toLowerCase()
      const matchesSearch =
        incident.pod?.toLowerCase().includes(query) ||
        incident.namespace?.toLowerCase().includes(query) ||
        incident.status?.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === "All Statuses" ||
        incident.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [incidents, search, statusFilter])

  return (
    <div className="min-h-screen bg-[#020817] px-6 py-8 text-white">
      <div className="mx-auto max-w-[1700px]">
        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-5xl font-black tracking-tight text-cyan-400">
              Incident Response
            </h1>
            <p className="mt-3 text-slate-400">
              Live Kubernetes incident intelligence and remediation cards.
            </p>
          </div>

          <div className={`flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-medium ${connected ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
            <span className="h-2 w-2 rounded-full bg-current" />
            {connected ? "WebSocket Connected" : "Disconnected"}
          </div>
        </div>

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search incidents..."
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-12 py-4 text-white outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-white outline-none"
          >
            <option>All Statuses</option>
            <option>Running</option>
            <option>CrashLoopBackOff</option>
            <option>Error</option>
          </select>
        </div>

        {filteredIncidents.length > 0 ? (
          <div className="grid gap-6">
            {filteredIncidents.map((incident, index) => (
              <IncidentCard key={`${incident.pod}-${index}`} issue={incident} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-10 text-center">
            <AlertTriangle size={40} className="mx-auto text-yellow-400" />
            <h2 className="mt-5 text-2xl font-semibold text-white">
              No incidents found
            </h2>
            <p className="mt-3 text-slate-400">
              Your Kubernetes cluster is currently stable.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Incidents