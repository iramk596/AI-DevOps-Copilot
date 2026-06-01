import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

function AiTrendCharts({ trends, success }) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Severity Trend</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Incident distribution</h3>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
              <XAxis dataKey="name" stroke="#7dd3fc" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
              <Area type="monotone" dataKey="value" stroke="#22d3ee" fill="rgba(34, 211, 238, 0.16)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Success Rate</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Remediation outcomes</h3>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={success} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
              <XAxis dataKey="period" stroke="#7dd3fc" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
              <Bar dataKey="percent" fill="#2dd4bf" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default AiTrendCharts
