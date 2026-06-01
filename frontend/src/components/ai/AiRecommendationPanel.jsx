import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

function AiRecommendationPanel({ item }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/95 shadow-sm transition-all duration-300 hover:border-cyan-500/30">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-slate-400">{item.category}</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{item.title}</h3>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300 transition hover:border-cyan-400"
          >
            {expanded ? 'Collapse' : 'Expand'}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <div className="rounded-3xl bg-[#020617] p-5">
          <p className="text-sm font-semibold text-slate-100">Suggested fix</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">{item.suggestion}</p>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
          <span>Confidence {item.confidence}%</span>
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-300 ring-1 ring-slate-800">{item.type}</span>
        </div>

        <div className={`overflow-hidden transition-all duration-500 ${expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-[#03101d] p-4">
              <p className="font-semibold text-slate-100">Why AI recommended it</p>
              <p className="mt-2">{item.reason}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#03101d] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Expected outcome</p>
              <p className="mt-2 text-sm text-emerald-300">{item.outcome}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AiRecommendationPanel
