import { useEffect, useState } from "react"
import ActionButtons from "./ActionButtons"

function IncidentCard({ issue }) {
  const [highlight, setHighlight] = useState(false)

  useEffect(() => {
    setHighlight(true)
    const timeout = setTimeout(() => setHighlight(false), 800)
    return () => clearTimeout(timeout)
  }, [issue])

  const severity = issue.status?.toLowerCase().includes('crash')
    ? 'Critical'
    : issue.status?.toLowerCase().includes('error')
      ? 'Error'
      : issue.status?.toLowerCase().includes('fail')
        ? 'Failed'
        : 'Warning'

  const severityClasses = severity === 'Critical'
    ? 'bg-red-500/15 text-red-300 ring-red-500/40'
    : severity === 'Error'
      ? 'bg-orange-500/10 text-orange-300 ring-orange-500/30'
      : severity === 'Failed'
        ? 'bg-rose-500/10 text-rose-300 ring-rose-500/30'
        : 'bg-yellow-500/10 text-yellow-300 ring-yellow-500/30'

  return (
    <div className={`bg-gray-900 border rounded-xl p-6 shadow-lg transition-transform duration-300 ${highlight ? 'border-cyan-400 scale-[1.01]' : 'border-red-500'} `}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-red-400">Incident Detected</h2>
          <p className="text-sm text-slate-400 mt-1">Live issue from Kubernetes cluster.</p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ${severityClasses}`}>
            <span className="h-2.5 w-2.5 rounded-full bg-current/80"></span>
            {issue.status}
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${severityClasses}`}>
            {severity}
          </div>
          <button
            type="button"
            onClick={() => {
              if (issue.namespace && issue.pod) {
                window.dispatchEvent(new CustomEvent('logs:view', { detail: { namespace: issue.namespace, pod: issue.pod } }))
              }
            }}
            className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
          >
            Quick View Logs
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 text-sm text-gray-300">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-cyan-400 font-semibold">Pod</p>
          <p className="mt-2 text-white">{issue.pod || 'unknown'}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-cyan-400 font-semibold">Namespace</p>
          <p className="mt-2 text-white">{issue.namespace || 'default'}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 md:col-span-2">
          <p className="text-cyan-400 font-semibold">Reason</p>
          <p className="mt-2 text-gray-300">{issue.possible_reason || issue.reason || 'Unable to determine issue'}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 md:col-span-2">
          <p className="text-cyan-400 font-semibold">Remediation</p>
          <p className="mt-2 text-gray-300">{issue.suggestion || 'Review pod configuration and logs.'}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-black p-4 md:col-span-2">
          <p className="text-cyan-400 font-semibold mb-2">AI Analysis</p>
          <div className="max-h-60 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-xs text-green-300">{issue.ai_analysis || 'AI analysis pending...'}</pre>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ActionButtons issue={issue} />
      </div>
    </div>
  )
}

export default IncidentCard
