import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

function MetricsChart({ title, data, dataKey, color, livePoint }) {
  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-cyan-300">{title}</h2>
        {livePoint && (
          <span className="text-sm text-gray-400">Live: {livePoint}</span>
        )}
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data || []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid stroke="#2f2f34" strokeDasharray="3 3" />
            <XAxis dataKey="time" stroke="#7dd3fc" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
            <YAxis stroke="#7dd3fc" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
            <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#334155' }} cursor={{ stroke: '#0f172a' }} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={false} animationDuration={300} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default MetricsChart