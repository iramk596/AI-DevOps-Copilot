function StatusCard({ title, value, color }) {

  return (

    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-cyan-500 transition-all duration-300">

      <h2 className="text-xl font-semibold mb-2 text-gray-300">
        {title}
      </h2>

      <p className={`${color} text-2xl font-bold`}>
        {value}
      </p>

    </div>

  )

}

export default StatusCard
