import { useState } from "react"
import api from "../services/api"

function ActionButtons({ issue }) {

  const [loadingRestart, setLoadingRestart] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)

  const restartPod = async () => {

    if (!issue?.namespace || !issue?.pod) {
      alert("Issue data missing: cannot restart pod")
      return
    }

    if (!confirm(`Restart pod ${issue.pod} in namespace ${issue.namespace}?`)) return

    setLoadingRestart(true)

    try {

      const res = await api.post(
        `/restart-pod/${issue.namespace}/${issue.pod}`
      )

      alert(res?.data?.message || "Pod restarted successfully")

      // trigger a refetch in dashboard without full reload
      window.dispatchEvent(new Event('incident:refetch'))

    } catch (error) {

      console.error(error)

      alert(error?.response?.data?.detail || "Failed to restart pod")

    } finally {

      setLoadingRestart(false)

    }

  }

  const deletePod = async () => {

    if (!issue?.namespace || !issue?.pod) {
      alert("Issue data missing: cannot delete pod")
      return
    }

    if (!confirm(`Delete pod ${issue.pod} in namespace ${issue.namespace}? This cannot be undone.`)) return

    setLoadingDelete(true)

    try {

      const res = await api.post(
        `/delete-pod/${issue.namespace}/${issue.pod}`
      )

      alert(res?.data?.message || "Pod deleted successfully")

      window.dispatchEvent(new Event('incident:refetch'))

    } catch (error) {

      console.error(error)

      alert(error?.response?.data?.detail || "Failed to delete pod")

    } finally {

      setLoadingDelete(false)

    }

  }

  const viewLogs = () => {
    if (!issue?.namespace || !issue?.pod) {
      alert('Issue data missing: cannot view logs')
      return
    }

    window.dispatchEvent(new CustomEvent('logs:view', { detail: { namespace: issue.namespace, pod: issue.pod } }))
  }

  const disabled = !issue?.namespace || !issue?.pod

  return (

    <div className="flex gap-4 mt-8">

      <button
        onClick={restartPod}
        disabled={disabled || loadingRestart}
        className={`bg-cyan-500 hover:bg-cyan-600 transition-all px-5 py-2 rounded-lg font-semibold flex items-center justify-center ${disabled || loadingRestart ? 'opacity-50 cursor-not-allowed hover:bg-cyan-500' : ''}`}
        aria-disabled={disabled || loadingRestart}
      >
        {loadingRestart ? 'Restarting...' : 'Restart Pod'}
      </button>

      <button
        onClick={deletePod}
        disabled={disabled || loadingDelete}
        className={`bg-red-500 hover:bg-red-600 transition-all px-5 py-2 rounded-lg font-semibold flex items-center justify-center ${disabled || loadingDelete ? 'opacity-50 cursor-not-allowed hover:bg-red-500' : ''}`}
        aria-disabled={disabled || loadingDelete}
      >
        {loadingDelete ? 'Deleting...' : 'Delete Pod'}
      </button>

      <button
        onClick={viewLogs}
        className={`bg-gray-800 hover:bg-gray-700 transition-all px-5 py-2 rounded-lg font-semibold flex items-center justify-center`}
      >
        View Logs
      </button>

    </div>

  )

}

export default ActionButtons
