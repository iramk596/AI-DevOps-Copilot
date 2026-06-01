function AiConfidenceMeter({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}%</p>
        </div>
        <div className="rounded-full bg-slate-950 px-4 py-2 text-sm text-slate-300">AI confidence</div>
      </div>
      <div className="mt-5 overflow-hidden rounded-full bg-slate-950 h-3">
        <div className="h-3 rounded-full bg-cyan-400 transition-all duration-700" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>Production-grade prediction</span>
        <span>{value}%</span>
      </div>
    </div>
  )
}

export default AiConfidenceMeter
