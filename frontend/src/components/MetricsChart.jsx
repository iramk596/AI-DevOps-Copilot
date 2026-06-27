import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function MetricsChart({ title, data, dataKey, color, livePoint }) {
  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-2xl font-bold text-cyan-300 mb-4">
        {title}
      </h2>

      {livePoint && (
        <div className="mb-3 text-sm text-gray-400">
          Live: {livePoint}
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid stroke="#333" strokeDasharray="3 3" />

          <XAxis
            dataKey="time"
            stroke="#ccc"
          />

          <YAxis
            stroke="#ccc"
          />

          <Tooltip />

          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MetricsChart;