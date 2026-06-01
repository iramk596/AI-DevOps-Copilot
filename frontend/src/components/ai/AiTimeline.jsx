function AiTimeline({ events }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Incident Timeline</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Operational sequence</h3>
        </div>
      </div>

      <div className="space-y-6">
        {events.map((event) => (
          <div key={event.id} className="flex gap-4">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-sm font-bold text-cyan-300">
              {event.step}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between gap-4">
                <h4 className="text-lg font-semibold text-white">{event.title}</h4>
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{event.time}</span>
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-300">{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AiTimeline
