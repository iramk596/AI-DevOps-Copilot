import ActionButtons from "./ActionButtons"

function IncidentCard({ issue }) {

  return (

    <div className="bg-gray-900 border border-red-500 rounded-xl p-6 shadow-lg">

      <div className="flex items-center justify-between mb-4">

        <h2 className="text-2xl font-bold text-red-400">
          Incident Detected
        </h2>

        <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-semibold">
          {issue.status}
        </span>

      </div>

      <div className="space-y-4 text-sm">

        <div>

          <p className="text-cyan-400 font-semibold">
            Pod
          </p>

          <p className="text-gray-300">
            {issue.pod}
          </p>

        </div>

        <div>

          <p className="text-cyan-400 font-semibold">
            Namespace
          </p>

          <p className="text-gray-300">
            {issue.namespace}
          </p>

        </div>

        <div>

          <p className="text-cyan-400 font-semibold">
            Possible Reason
          </p>

          <p className="text-gray-300">
            {issue.possible_reason}
          </p>

        </div>

        <div>

          <p className="text-cyan-400 font-semibold">
            Suggested Remediation
          </p>

          <p className="text-gray-300">
            {issue.suggestion}
          </p>

        </div>

        <div>

          <p className="text-cyan-400 font-semibold mb-2">
            AI Analysis
          </p>

          <div className="bg-black rounded-lg p-4 border border-gray-800 max-h-96 overflow-y-auto">

            <pre className="text-green-400 whitespace-pre-wrap text-xs">
              {issue.ai_analysis}
            </pre>

          </div>

        </div>

      </div>

      <ActionButtons issue={issue} />

    </div>

  )

}

export default IncidentCard
