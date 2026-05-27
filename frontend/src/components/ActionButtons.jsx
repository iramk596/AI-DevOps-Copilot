import api from "../services/api"

import {
  FaRedo,
  FaTrash,
  FaTerminal
} from "react-icons/fa"

function ActionButtons({ podName, namespace }) {

  const restartPod = async () => {

    try {

      const response = await api.post(
        `/restart-pod/${namespace}/${podName}`
      )

      alert(response.data.message)

    } catch (error) {

      console.error(error)

      alert("Failed to restart pod")

    }

  }

  const deletePod = async () => {

    try {

      const response = await api.post(
        `/delete-pod/${namespace}/${podName}`
      )

      alert(response.data.message)

    } catch (error) {

      console.error(error)

      alert("Failed to delete pod")

    }

  }

  return (

    <div className="flex gap-4 mt-6">

      <button
        onClick={restartPod}
        className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-lg flex items-center gap-2"
      >
        <FaRedo />
        Restart Pod
      </button>

      <button
        onClick={deletePod}
        className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg flex items-center gap-2"
      >
        <FaTrash />
        Delete Pod
      </button>

      <button
        className="bg-cyan-500 hover:bg-cyan-600 px-4 py-2 rounded-lg flex items-center gap-2"
      >
        <FaTerminal />
        View Logs
      </button>

    </div>

  )

}

export default ActionButtons