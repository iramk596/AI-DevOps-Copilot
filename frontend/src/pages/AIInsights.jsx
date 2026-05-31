import { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import { createWebsocket } from '../services/ws'
import StatusCard from '../components/StatusCard'
import LoadingSpinner from '../components/LoadingSpinner'
import ConnectionStatus from '../components/ConnectionStatus'

function mapCommand(status, namespace, pod) {
  if (!status || !pod || !namespace) return 'kubectl get pods -A'
  if (status === 'CrashLoopBackOff') return `kubectl logs -n ${namespace} ${pod} --follow`
  if (status === 'ImagePullBackOff') return `kubectl describe pod -n ${namespace} ${pod}`
  if (status === 'OOMKilled') return `kubectl describe pod -n ${namespace} ${pod} | grep -i oom`
  return `kubectl logs -n ${namespace} ${pod}`
}

function AIInsights() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState('connecting')

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/analyze')
      setIssues(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Failed to load AI insights', error)
      setIssues([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIssues()

    const ws = createWebsocket((msg) => {
      if (msg.type === 'cluster_update' && Array.isArray(msg.incidents)) {
        setIssues(msg.incidents.slice().reverse())
      }
    }, (status) => setConnectionStatus(status))

    return () => ws.close()
  }, [fetchIssues])

  const primaryIssue = issues[0] || {}
  const rootCause = primaryIssue.possible_reason || 'Awaiting AI root cause analysis.'
  const suggestedFix = primaryIssue.suggestion || 'Review the latest incident logs for remediation.'
  const command = mapCommand(primaryIssue.status, primaryIssue.namespace, primaryIssue.pod)

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="p-8 overflow-y-auto min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold text-cyan-400">AI Operations Center</h1>
          <p className="text-slate-400 mt-2">AI-driven remediation, root cause summaries, and command recommendations.</p>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatus status={connectionStatus} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
        <StatusCard title="Active Incidents" value={issues.length} color="text-cyan-400" />
        <StatusCard title="AI Insights" value={issues.length ? 'Live' : 'Pending'} color="text-emerald-400" />
        <StatusCard title="Recommendations" value={issues.length ? 'Generated' : 'Waiting'} color="text-yellow-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-cyan-300 mb-4">Root Cause Analysis</h2>
          <p className="text-slate-300 leading-7">{rootCause}</p>
        </div>

        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-cyan-300 mb-4">Suggested Fix</h2>
          <p className="text-slate-300 leading-7">{suggestedFix}</p>
          <div className="mt-6 rounded-3xl bg-slate-950 p-4 text-sm text-emerald-300">
            <p className="font-semibold text-white">Recommended Command</p>
            <pre className="mt-2 whitespace-pre-wrap">{command}</pre>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {issues.length === 0 ? (
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 text-slate-400">
            No AI insights available yet. The system is waiting for live incident data.
          </div>
        ) : (
          issues.map((issue, index) => (
            <div key={`${issue.namespace}-${issue.pod}-${index}`} className="rounded-3xl border border-gray-800 bg-slate-900 p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">{issue.pod || 'Unknown pod'}</h3>
                  <p className="text-slate-400">{issue.namespace || 'default'} • {issue.status || 'Unknown'}</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 ring-1 ring-cyan-500/20">
                  {mapCommand(issue.status, issue.namespace, issue.pod)}
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-gray-800 bg-slate-950 p-4">
                  <p className="text-sm text-cyan-400">AI Summary</p>
                  <p className="mt-2 text-slate-300 text-sm">{issue.ai_analysis || 'No summary available.'}</p>
                </div>
                <div className="rounded-3xl border border-gray-800 bg-slate-950 p-4">
                  <p className="text-sm text-cyan-400">Suggested Remediation</p>
                  <p className="mt-2 text-slate-300 text-sm">{issue.suggestion || 'Review the latest crash logs and retry deployment.'}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default AIInsights
