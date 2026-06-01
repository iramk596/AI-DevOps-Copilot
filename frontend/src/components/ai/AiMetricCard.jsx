function AiMetricCard({ icon, title, value, change, accentColor }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/40 hover:bg-slate-900 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className={`rounded-2xl border border-slate-800 p-3 text-2xl ${accentColor}`}>
          {icon}
        </div>
      </div>
      {change ? (
        <div className="mt-4 text-sm text-slate-400">
          <span className="font-semibold text-slate-200">{change}</span> from last cycle
        </div>
      ) : null}
    </div>
  )
}

export default AiMetricCard
