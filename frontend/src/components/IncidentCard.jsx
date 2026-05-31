import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Terminal,
  BrainCircuit,
} from "lucide-react"

import ActionButtons from "./ActionButtons"

function IncidentCard({ issue }) {
  const [highlight, setHighlight] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setHighlight(true)

    const timeout = setTimeout(() => {
      setHighlight(false)
    }, 1200)

    return () => clearTimeout(timeout)
  }, [issue])

  const severity = useMemo(() => {
    const status = issue.status?.toLowerCase() || ""

    if (status.includes("crash")) return "Critical"
    if (status.includes("error")) return "Error"
    if (status.includes("fail")) return "Failed"

    return "Warning"
  }, [issue])

  const severityClasses =
    severity === "Critical"
      ? "bg-red-500/15 text-red-300 ring-red-500/40"
      : severity === "Error"
      ? "bg-orange-500/15 text-orange-300 ring-orange-500/40"
      : severity === "Failed"
      ? "bg-rose-500/15 text-rose-300 ring-rose-500/40"
      : "bg-yellow-500/15 text-yellow-300 ring-yellow-500/40"

  const aiAnalysis =
    issue.ai_analysis ||
    issue.aiAnalysis ||
    issue.analysis ||
    "Waiting for AI remediation engine...\nStreaming live cluster diagnostics..."

  const formattedTime = issue.timestamp
    ? new Date(issue.timestamp * 1000).toLocaleTimeString()
    : new Date().toLocaleTimeString()

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-[#09111f] p-6 shadow-2xl transition-all duration-500 ${
        highlight
          ? "border-cyan-400 shadow-cyan-500/20"
          : "border-red-500/40"
      }`}
    >
      {/* animated glow */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-gradient-to-r from-cyan-500 via-transparent to-red-500" />

      {/* header */}
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-400" size={28} />

            <div>
              <h2 className="text-3xl font-bold text-red-400">
                Incident Detected
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Live issue from Kubernetes cluster.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ${severityClasses}`}
            >
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-current"></span>

              {issue.status || "Unknown"}
            </div>

            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${severityClasses}`}
            >
              {severity}
            </div>
          </div>
        </div>

        {/* right panel */}
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="rounded-full bg-slate-950 px-4 py-2 text-xs text-slate-300 ring-1 ring-slate-800">
            Detected at {formattedTime}
          </div>

          <button
            type="button"
            onClick={() => {
              if (issue.namespace && issue.pod) {
                window.dispatchEvent(
                  new CustomEvent("logs:view", {
                    detail: {
                      namespace: issue.namespace,
                      pod: issue.pod,
                    },
                  })
                )
              }
            }}
            className="rounded-full bg-cyan-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
          >
            Quick View Logs
          </button>
        </div>
      </div>

      {/* info grid */}
      <div className="relative z-10 mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-[#050b16] p-5">
          <p className="text-sm font-semibold text-cyan-400">Pod</p>

          <p className="mt-2 break-all text-lg text-white">
            {issue.pod || "unknown"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#050b16] p-5">
          <p className="text-sm font-semibold text-cyan-400">Namespace</p>

          <p className="mt-2 text-lg text-white">
            {issue.namespace || "default"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#050b16] p-5 md:col-span-2">
          <p className="text-sm font-semibold text-cyan-400">
            Root Cause Analysis
          </p>

          <p className="mt-3 leading-7 text-slate-300">
            {issue.possible_reason ||
              issue.reason ||
              "Unable to determine issue"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#050b16] p-5 md:col-span-2">
          <p className="text-sm font-semibold text-cyan-400">
            Suggested Remediation
          </p>

          <p className="mt-3 leading-7 text-slate-300">
            {issue.suggestion ||
              "Review pod configuration, logs, and Kubernetes events."}
          </p>
        </div>
      </div>

      {/* AI analysis */}
      <div className="relative z-10 mt-6 rounded-2xl border border-cyan-500/20 bg-black/80 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrainCircuit className="text-cyan-400" size={24} />

            <div>
              <h3 className="text-lg font-bold text-cyan-300">
                AI Analysis Engine
              </h3>

              <p className="text-xs text-slate-500">
                Live remediation insights
              </p>
            </div>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 transition hover:border-cyan-400"
          >
            {expanded ? (
              <>
                Collapse <ChevronUp size={16} />
              </>
            ) : (
              <>
                Expand <ChevronDown size={16} />
              </>
            )}
          </button>
        </div>

        <div
          className={`overflow-hidden transition-all duration-500 ${
            expanded ? "max-h-[700px]" : "max-h-44"
          }`}
        >
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-black p-4 font-mono text-sm leading-7 text-green-300">
            {aiAnalysis}
          </pre>
        </div>
      </div>

      {/* terminal logs */}
      <div className="relative z-10 mt-6 rounded-2xl border border-slate-800 bg-[#02050a]">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <div className="flex items-center gap-2">
            <Terminal className="text-cyan-400" size={18} />

            <span className="text-sm font-semibold text-slate-300">
              Live Incident Terminal
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-green-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400"></span>
            STREAMING
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto p-4 font-mono text-xs text-green-400">
          <p>{`> kubectl logs -n ${issue.namespace || "default"} ${
            issue.pod || "unknown"
          } --follow`}</p>

          <p className="mt-2 text-slate-500">
            Waiting for live Kubernetes logs...
          </p>
        </div>
      </div>

      {/* actions */}
      <div className="relative z-10 mt-6">
        <ActionButtons issue={issue} />
      </div>
    </div>
  )
}

export default IncidentCard