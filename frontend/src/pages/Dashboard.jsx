import { useEffect, useState } from "react"

import api from "../services/api"

import Sidebar from "../components/Sidebar"
import StatusCard from "../components/StatusCard"
import IncidentCard from "../components/IncidentCard"
import LoadingSpinner from "../components/LoadingSpinner"
import MetricsChart from "../components/MetricsChart"

function Dashboard() {

  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)

  const cpuData = [
    { time: "10:00", usage: 20 },
    { time: "10:05", usage: 35 },
    { time: "10:10", usage: 40 },
    { time: "10:15", usage: 60 },
    { time: "10:20", usage: 45 }
  ]

  const memoryData = [
    { time: "10:00", usage: 30 },
    { time: "10:05", usage: 50 },
    { time: "10:10", usage: 55 },
    { time: "10:15", usage: 70 },
    { time: "10:20", usage: 65 }
  ]

  useEffect(() => {

    fetchIssues()

    const interval = setInterval(() => {

      fetchIssues()

    }, 10000)

    return () => clearInterval(interval)

  }, [])

  const fetchIssues = async () => {

    try {

      const response = await api.get("/analyze")

      setIssues(response.data)

      setLoading(false)

    } catch (error) {

      console.error(error)

      setLoading(false)

    }

  }

  if (loading) {

    return <LoadingSpinner />

  }

  return (

    <div className="flex bg-gray-950 min-h-screen text-white">

      <Sidebar />

      <div className="flex-1 p-8">

        <h1 className="text-4xl font-bold text-cyan-400 mb-8">
          Cluster Overview
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

          <StatusCard
            title="Cluster Status"
            value={
              issues.length > 0
                ? "Degraded"
                : "Healthy"
            }
            color={
              issues.length > 0
                ? "text-yellow-400"
                : "text-green-400"
            }
          />

          <StatusCard
            title="Failed Pods"
            value={issues.length}
            color="text-red-400"
          />

          <StatusCard
            title="AI Incidents"
            value="Active"
            color="text-cyan-400"
          />

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

          <MetricsChart
            title="CPU Usage"
            data={cpuData}
            dataKey="usage"
            color="#22d3ee"
          />

          <MetricsChart
            title="Memory Usage"
            data={memoryData}
            dataKey="usage"
            color="#f87171"
          />

        </div>

        <div className="space-y-6">

          {issues.map((issue, index) => (

            <IncidentCard
              key={index}
              issue={issue}
            />

          ))}

        </div>

      </div>

    </div>

  )

}

export default Dashboard