import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

const severityStyles = {
  Critical: 'border-red-500/40 bg-red-500/10 text-red-300',
  Warning: 'border-yellow-500/40 bg-yellow-500/10 text-amber-300',
  Healthy: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  Investigating: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
}

function AiIncidentCard({ incident }) {
  const [expanded, setExpanded] = useState(false)

  const severityLabel = useMemo(() => {
    const status = (incident.status || '').toLowerCase()

    if (
      status.includes('crash') ||
      status.includes('oom') ||
      status.includes('error') ||
      status.includes('imagepull') ||
      status.includes('backoff')
    )
      return 'Critical'
    if (status.includes('warn') || status.includes('pending')) return 'Warning'
    if (status.includes('investigat')) return 'Investigating'

    return 'Healthy'
  }, [incident.status])

  const severityClass = severityStyles[severityLabel] || severityStyles.Warning

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/95 shadow-sm transition-all duration-300 hover:border-cyan-500/30">
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Root Cause Analysis</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">{incident.pod || 'Unknown Pod'}</h3>
          <p className="mt-2 text-sm text-slate-300">{incident.namespace || 'default'} · {incident.status || 'Unknown status'}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${severityClass}`}>
            <span className="h-2.5 w-2.5 rounded-full bg-current animate-pulse"></span>
            {severityLabel}
          </span>

          <span className="rounded-full bg-slate-950 px-4 py-2 text-sm text-slate-300 ring-1 ring-slate-800">
            {incident.confidence || 0}% confidence
          </span>
        </div>
      </div>

      <div className="border-t border-slate-800 px-6 py-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-[#03101d] p-4">
            <p className="text-sm text-cyan-300 uppercase tracking-[0.2em]">Detected root cause</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{incident.rootCause || issue.possible_reason || issue.reason || issue.ai_analysis || issue.details || 'Awaiting AI root cause analysis.'}</p>
          </div>
          <div className="rounded-3xl bg-[#03101d] p-4">
            <p className="text-sm text-cyan-300 uppercase tracking-[0.2em]">Remediation summary</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">{incident.remediation || 'Validate deployment rollout, inspect image pull logs, and enforce proper resource limits.'}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-slate-400">Last updated {new Date(incident.timestamp).toLocaleString()}</div>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-cyan-200 transition hover:border-cyan-500"
          >
            {expanded ? 'Hide details' : 'Show details'}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <div className={`overflow-hidden transition-all duration-500 ${expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="mt-5 rounded-3xl bg-[#020916] p-5 text-sm leading-7 text-slate-300">
            <p className="mb-3 inline-flex items-center gap-2 text-cyan-300 font-semibold">
              <Sparkles size={18} /> AI panel insight
            </p>
            <p>{incident.details || 'The Ollama engine identified an unstable initialization sequence and suggests validating health probes along with restart policies.'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AiIncidentCard
