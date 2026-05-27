import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts"

function MetricsChart({ title, data, dataKey, color }) {

  return (

    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">

      <h2 className="text-2xl font-bold text-cyan-300 mb-6">
        {title}
      </h2>

      <ResponsiveContainer width="100%" height={300}>

        <LineChart data={data}>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#333"
          />

          <XAxis
            dataKey="time"
            stroke="#ccc"
          />

          <YAxis stroke="#ccc" />

          <Tooltip />

          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
          />

        </LineChart>

      </ResponsiveContainer>

    </div>

  )

}

export default MetricsChart