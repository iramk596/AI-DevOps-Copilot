import {
  FaServer,
  FaExclamationTriangle,
  FaChartLine,
  FaRobot,
} from "react-icons/fa";

import { NavLink } from "react-router-dom";

function Sidebar() {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 p-3 rounded-lg transition ${
      isActive
        ? "bg-cyan-600 text-white"
        : "text-gray-300 hover:bg-gray-800 hover:text-cyan-400"
    }`;

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 min-h-screen p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-10">
        AI Copilot
      </h1>

      <div className="space-y-3">

        <NavLink to="/dashboard" className={linkClass}>
          <FaChartLine />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/incidents" className={linkClass}>
          <FaExclamationTriangle />
          <span>Incidents</span>
        </NavLink>

        <NavLink to="/cluster" className={linkClass}>
          <FaServer />
          <span>Cluster</span>
        </NavLink>

        <NavLink to="/insights" className={linkClass}>
          <FaRobot />
          <span>AI Insights</span>
        </NavLink>

      </div>
    </div>
  );
}

export default Sidebar;