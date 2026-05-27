import ActionButtons from "./ActionButtons"

function IncidentCard({ issue }) {

  return (

    <div className="bg-gray-900 p-6 rounded-2xl shadow-lg border border-gray-800">

      <h2 className="text-2xl font-bold text-cyan-400 mb-4">
        Incident Analysis
      </h2>

      <div className="bg-black rounded-xl p-4 overflow-auto">

        <pre className="text-green-400 whitespace-pre-wrap text-sm">

{`Pod: ${issue.pod}

Namespace: ${issue.namespace}

Status: ${issue.status}

Root Cause:
${issue.possible_reason}

Severity:
High

Remediation:
${issue.suggestion}

AI Analysis:
${issue.ai_analysis}
`}

        </pre>

      </div>

      <ActionButtons
        podName={issue.pod}
        namespace={issue.namespace}
      />

    </div>

  )

}

export default IncidentCard