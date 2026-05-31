import { NavLink } from 'react-router-dom'
import {
  FaServer,
  FaExclamationTriangle,
  FaChartLine,
  FaRobot
} from 'react-icons/fa'

const navItems = [
  { label: 'Dashboard', path: '/', icon: FaChartLine },
  { label: 'Incidents', path: '/incidents', icon: FaExclamationTriangle },
  { label: 'Cluster', path: '/cluster', icon: FaServer },
  { label: 'AI Insights', path: '/ai-insights', icon: FaRobot },
]

function Sidebar() {

  return (

    <div className="w-64 bg-gray-900 border-r border-gray-800 min-h-screen p-6">

      <h1 className="text-3xl font-bold text-cyan-400 mb-10">
        AI Copilot
      </h1>

      <div className="space-y-4">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 shadow-sm ring-1 ring-cyan-400/30'
                  : 'text-gray-300 hover:text-cyan-400 hover:bg-white/5'
              }`
            }
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

    </div>

  )

}

export default Sidebar