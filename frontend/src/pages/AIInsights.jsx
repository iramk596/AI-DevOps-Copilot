import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ClipboardCopy,
  ShieldAlert,
  TerminalSquare,
} from "lucide-react"

import socket from "../services/socket"

function AIInsights() {
  const [incidents, setIncidents] = useState([])
  const [connected, setConnected] = useState(false)
  const [copiedCommand, setCopiedCommand] = useState(null)

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

  const latestIncident =
    incidents.length > 0
      ? incidents[0]
      : {
          pod: "crash-app",
          namespace: "default",
          status: "CrashLoopBackOff",
          possible_reason:
            "Container repeatedly crashing during startup.",
          suggestion:
            "Check application logs and environment variables.",
          ai_analysis:
            "AI detected repeated container failures caused by invalid startup configuration.",
        }

  const commands = [
    `kubectl describe pod ${latestIncident.pod}`,
    `kubectl logs ${latestIncident.pod}`,
    `kubectl get pod ${latestIncident.pod} -o wide`,
    `kubectl delete pod ${latestIncident.pod}`,
  ]

  const severityTrend = [
    { label: "Critical", value: 4 },
    { label: "Warning", value: 2 },
    { label: "Healthy", value: 8 },
  ]

  const timeline = [
    "Incident detected",
    "AI analysis completed",
    "Root cause identified",
    "Remediation generated",
    "Awaiting operator action",
  ]

  const remediationConfidence = 92

  const aiMarkdownResponse = `
## Root Cause Analysis

The pod entered a **CrashLoopBackOff** state due to repeated container startup failures.

### Possible Causes
- Invalid environment variables
- Database connection failure
- Missing application dependency
- Startup configuration mismatch

### Recommended Steps
1. Inspect container logs
2. Verify deployment configuration
3. Check image environment variables
4. Restart deployment if needed

### Suggested Command
\`\`\`bash
kubectl describe pod ${latestIncident.pod}
\`\`\`
`

  const copyCommand = async (command) => {
    try {
      await navigator.clipboard.writeText(command)
      setCopiedCommand(command)

      setTimeout(() => {
        setCopiedCommand(null)
      }, 2000)
    } catch (err) {
      console.error(err)
    }
  }

  const connectionBadge = useMemo(() => {
    return connected
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : "bg-red-500/10 text-red-400 border-red-500/20"
  }, [connected])

  return (
    <div className="min-h-screen bg-[#020817] px-6 py-8 text-white">
      <div className="mx-auto max-w-[1700px]">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
              AI Operations Center
            </p>

            <h1 className="mt-3 text-5xl font-black tracking-tight text-white">
              AI Insights Engine
            </h1>

            <p className="mt-3 max-w-3xl text-slate-400">
              Real-time AI remediation, Kubernetes telemetry,
              operational runbooks, and incident intelligence.
            </p>
          </div>

          <div
            className={`flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-medium ${connectionBadge}`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {connected ? "WebSocket Connected" : "Disconnected"}
          </div>
        </div>

        {/* TOP GRID */}
        <div className="grid gap-6 xl:grid-cols-3">
          {/* INCIDENT CARD */}
          <section className="xl:col-span-2 rounded-3xl border border-red-500/20 bg-gradient-to-br from-slate-900 to-[#111827] p-6 shadow-2xl shadow-red-500/5">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <ShieldAlert className="text-red-400" size={32} />

                  <h2 className="text-4xl font-bold text-red-400">
                    Active Incident
                  </h2>
                </div>

                <p className="mt-3 text-slate-400">
                  AI detected a Kubernetes workload anomaly.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <span className="rounded-full bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 ring-1 ring-red-500/20">
                    {latestIncident.status}
                  </span>

                  <span className="rounded-full bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 ring-1 ring-cyan-500/20">
                    Pod: {latestIncident.pod}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
                <p className="text-sm uppercase tracking-wide text-emerald-300">
                  Confidence
                </p>

                <h2 className="mt-3 text-5xl font-black text-emerald-400">
                  {remediationConfidence}%
                </h2>
              </div>
            </div>

            {/* ROOT CAUSE */}
            <div className="mt-8 rounded-2xl border border-slate-800 bg-black/30 p-5">
              <div className="flex items-center gap-3">
                <BrainCircuit className="text-cyan-400" size={24} />

                <h3 className="text-2xl font-bold text-cyan-400">
                  AI Root Cause Analysis
                </h3>
              </div>

              <p className="mt-5 leading-8 text-slate-300">
                {latestIncident.ai_analysis}
              </p>
            </div>

            {/* SUGGESTED COMMANDS */}
            <div className="mt-8">
              <div className="mb-5 flex items-center gap-3">
                <TerminalSquare
                  className="text-cyan-400"
                  size={24}
                />

                <h3 className="text-2xl font-bold text-cyan-400">
                  Operational Runbook
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {commands.map((command, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <code className="text-sm text-cyan-300">
                        {command}
                      </code>

                      <button
                        onClick={() => copyCommand(command)}
                        className="rounded-lg border border-slate-700 p-2 transition hover:border-cyan-500 hover:text-cyan-300"
                      >
                        <ClipboardCopy size={16} />
                      </button>
                    </div>

                    {copiedCommand === command && (
                      <p className="mt-3 text-xs text-emerald-400">
                        Command copied successfully
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SIDEBAR */}
          <aside className="space-y-6">
            {/* TIMELINE */}
            <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6">
              <h2 className="text-2xl font-bold text-cyan-400">
                Incident Timeline
              </h2>

              <div className="mt-6 space-y-5">
                {timeline.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4"
                  >
                    <div className="mt-1 h-3 w-3 rounded-full bg-cyan-400" />

                    <div>
                      <p className="text-sm text-white">
                        {item}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* SEVERITY */}
            <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6">
              <h2 className="text-2xl font-bold text-cyan-400">
                Severity Trend
              </h2>

              <div className="mt-6 space-y-5">
                {severityTrend.map((item, index) => (
                  <div key={index}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-slate-300">
                        {item.label}
                      </span>

                      <span className="text-sm text-white">
                        {item.value}
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full ${
                          item.label === "Critical"
                            ? "bg-red-400"
                            : item.label === "Warning"
                              ? "bg-yellow-400"
                              : "bg-emerald-400"
                        }`}
                        style={{
                          width: `${item.value * 10}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* OLLAMA PANEL */}
            <section className="rounded-3xl border border-cyan-500/10 bg-cyan-500/5 p-6">
              <div className="flex items-center gap-3">
                <CheckCircle2
                  className="text-emerald-400"
                  size={24}
                />

                <h2 className="text-2xl font-bold text-cyan-400">
                  AI Engine
                </h2>
              </div>

              <p className="mt-5 leading-7 text-slate-300">
                AI remediation and operational analysis are
                currently generated using Ollama local inference.
              </p>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-black/30 p-4">
                <p className="text-sm text-slate-400">
                  Model:
                </p>

                <p className="mt-2 font-semibold text-emerald-400">
                  llama3
                </p>
              </div>
            </section>
          </aside>
        </div>

        {/* AI RESPONSE */}
        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-950/90 p-6">
          <h2 className="text-3xl font-bold text-cyan-400">
            Generated AI Remediation
          </h2>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-black/30 p-6">
            <pre className="whitespace-pre-wrap text-sm leading-8 text-green-300">
              {aiMarkdownResponse}
            </pre>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AIInsights
