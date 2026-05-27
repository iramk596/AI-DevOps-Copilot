import {
  FaServer,
  FaExclamationTriangle,
  FaChartLine,
  FaRobot
} from "react-icons/fa"

function Sidebar() {

  return (

    <div className="w-64 bg-gray-900 border-r border-gray-800 min-h-screen p-6">

      <h1 className="text-3xl font-bold text-cyan-400 mb-10">
        AI Copilot
      </h1>

      <div className="space-y-6">

        <div className="flex items-center gap-3 text-gray-300 hover:text-cyan-400 cursor-pointer">
          <FaChartLine />
          <span>Dashboard</span>
        </div>

        <div className="flex items-center gap-3 text-gray-300 hover:text-cyan-400 cursor-pointer">
          <FaExclamationTriangle />
          <span>Incidents</span>
        </div>

        <div className="flex items-center gap-3 text-gray-300 hover:text-cyan-400 cursor-pointer">
          <FaServer />
          <span>Cluster</span>
        </div>

        <div className="flex items-center gap-3 text-gray-300 hover:text-cyan-400 cursor-pointer">
          <FaRobot />
          <span>AI Insights</span>
        </div>

      </div>

    </div>

  )

}

export default Sidebar