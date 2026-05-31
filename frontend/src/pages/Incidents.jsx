import { useEffect, useState, useCallback, useMemo } from 'react'
import api from '../services/api'
import { createWebsocket } from '../services/ws'
import StatusCard from '../components/StatusCard'
import LoadingSpinner from '../components/LoadingSpinner'
import ConnectionStatus from '../components/ConnectionStatus'

const severityMap = {
  CrashLoopBackOff: 'Critical',
  Error: 'Error',
  Failed: 'Failed',
  OOMKilled: 'Warning',
  ImagePullBackOff: 'Warning',
}

function getSeverity(status) {
  if (!status) return 'Unknown'
  return severityMap[status] || (status.toLowerCase().includes('error') ? 'Error' : 'Warning')
}

function Incidents() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [namespaceFilter, setNamespaceFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/analyze')
      setIssues(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Failed to load incidents', error)
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

  const namespaces = useMemo(() => {
    return [...new Set(issues.map((issue) => issue.namespace || 'default'))].sort()
  }, [issues])

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const namespaceMatch = namespaceFilter === 'all' || (issue.namespace || 'default') === namespaceFilter
      const severity = getSeverity(issue.status)
      const severityMatch = severityFilter === 'all' || severity === severityFilter
      const query = searchTerm.trim().toLowerCase()
      const searchMatch =
        !query ||
        `${issue.pod || ''} ${issue.namespace || ''} ${issue.status || ''} ${issue.possible_reason || ''}`
          .toLowerCase()
          .includes(query)
      return namespaceMatch && severityMatch && searchMatch
    })
  }, [issues, namespaceFilter, severityFilter, searchTerm])

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="p-8 overflow-y-auto min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold text-cyan-400">Incident Management Center</h1>
          <p className="text-slate-400 mt-2">Live incident history, severity tracking, and remediation search.</p>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatus status={connectionStatus} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <StatusCard title="Total Incidents" value={issues.length} color="text-cyan-400" />
        <StatusCard title="Critical Issues" value={issues.filter((i) => getSeverity(i.status) === 'Critical').length} color="text-red-400" />
        <StatusCard title="Active Namespaces" value={namespaces.length} color="text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="space-y-2">
          <label className="text-sm text-slate-400">Namespace filter</label>
          <select
            value={namespaceFilter}
            onChange={(e) => setNamespaceFilter(e.target.value)}
            className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-white"
          >
            <option value="all">All namespaces</option>
            {namespaces.map((namespace) => (
              <option key={namespace} value={namespace}>{namespace}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-400">Severity filter</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-white"
          >
            <option value="all">All severities</option>
            <option value="Critical">Critical</option>
            <option value="Error">Error</option>
            <option value="Failed">Failed</option>
            <option value="Warning">Warning</option>
          </select>
        </div>

        <div className="space-y-2 md:col-span-1">
          <label className="text-sm text-slate-400">Search incidents</label>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search pod, namespace, reason"
            className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-white"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 text-center text-slate-400">
            No incidents match the current filters.
          </div>
        ) : (
          filteredIssues.map((issue, index) => {
            const severity = getSeverity(issue.status)
            return (
              <div key={`${issue.namespace}-${issue.pod}-${index}`} className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">{severity}</p>
                    <h2 className="text-2xl font-semibold text-white">{issue.pod || 'unknown pod'}</h2>
                    <p className="text-sm text-slate-400">{issue.namespace || 'default'} • {issue.status || 'Unknown'}</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm text-slate-300 ring-1 ring-cyan-500/10">
                    {new Date(issue.timestamp || Date.now()).toLocaleString()}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-3xl border border-gray-800 bg-slate-950 p-4">
                    <p className="text-sm text-cyan-400">Reason</p>
                    <p className="mt-2 text-gray-300">{issue.possible_reason || 'Pending investigation'}</p>
                  </div>
                  <div className="rounded-3xl border border-gray-800 bg-slate-950 p-4">
                    <p className="text-sm text-cyan-400">Suggested Remediation</p>
                    <p className="mt-2 text-gray-300">{issue.suggestion || 'Review cluster logs and events.'}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-gray-800 bg-black p-4">
                  <p className="text-sm text-cyan-400 mb-2">AI Analysis</p>
                  <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap text-xs text-emerald-300">{issue.ai_analysis || 'AI analysis not available yet.'}</pre>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Incidents
