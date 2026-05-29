function ConnectionStatus({ status }) {
  let dotClass = 'bg-red-400'
  let text = status

  if (status === 'connected') {
    dotClass = 'bg-green-400'
    text = 'Connected'
  } else if (status === 'reconnecting') {
    dotClass = 'bg-yellow-400'
    text = 'Reconnecting...'
  } else if (status === 'error') {
    dotClass = 'bg-orange-400'
    text = 'Error'
  } else if (status === 'disconnected') {
    dotClass = 'bg-red-400'
    text = 'Disconnected'
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`h-3 w-3 rounded-full ${dotClass} ${status === 'connected' ? 'animate-pulse' : status === 'reconnecting' ? 'animate-bounce' : ''}`}></span>
      <span className="text-gray-300">{text}</span>
    </div>
  )
}

export default ConnectionStatus
