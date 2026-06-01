import { useEffect, useMemo, useState } from 'react'
import { Activity, Cpu, Layers3, Sparkles, Terminal, Wifi, ShieldCheck } from 'lucide-react'
import api from '../services/api'
import { createWebsocket } from '../services/ws'
import ConnectionStatus from '../components/ConnectionStatus'
import AiMetricCard from '../components/ai/AiMetricCard'
import AiIncidentCard from '../components/ai/AiIncidentCard'
import AiRecommendationPanel from '../components/ai/AiRecommendationPanel'
import KubectlCommandCard from '../components/ai/KubectlCommandCard'
import AiTimeline from '../components/ai/AiTimeline'
import AiTrendCharts from '../components/ai/AiTrendCharts'
import AiConfidenceMeter from '../components/ai/AiConfidenceMeter'
import AiMarkdownViewer from '../components/ai/AiMarkdownViewer'
import AiOllamaPanel from '../components/ai/AiOllamaPanel'
import LiveLogsTerminal from '../components/LiveLogsTerminal'

const initialIncidents = [
  {
    id: 'incident-1',
    pod: 'crash-app-7d9b5f7c8d',
    namespace: 'default',
    status: 'CrashLoopBackOff',
    rootCause: 'Container probe is failing intermittently due to a corrupt startup hook and insufficient liveness thresholds.',
    remediation: 'Increase readiness probe timeout, restart the failing pod, and validate container image compatibility.',
    confidence: 92,
    timestamp: Date.now() - 650000,
    details:
      'Ollama detected repeated pod restarts and a failed startup probe. The engine recommends validating the application startup path and checking network mounts before rollback.',
  },
  {
    id: 'incident-2',
    pod: 'payments-api-5f9d7c4f5',
    namespace: 'staging',
    status: 'Investigating',
    rootCause: 'Slow readiness responses are causing the deployment controller to mark new replicas as unhealthy.',
    remediation: 'Inspect service latency, verify resource limits, and consider a pod disruption budget for safe rollout.',
    confidence: 87,
    timestamp: Date.now() - 360000,
    details:
      'The AI engine is correlating latency spikes with readiness probe failures and suggests an immediate review of recent configuration changes in the service mesh.',
  },
  {
    id: 'incident-3',
    pod: 'db-migrate-1b2c3d4e5',
    namespace: 'database',
    status: 'Warning',
    rootCause: 'Memory pressure is high on the node, causing eviction events for stateful workloads.',
    remediation: 'Adjust pod memory requests, drain the node for maintenance, and prioritize critical stateful sets.',
    confidence: 79,
    timestamp: Date.now() - 120000,
    details:
      'Telemetry shows elevated RSS memory and repeated eviction warnings. AI suggests enforcing memory limits and validating node capacity before scaling out.',
  },
]

const initialRecommendations = [
  {
    id: 'rec-1',
    category: 'Deployment Stability',
    title: 'Stabilize CrashLoopBackOff pod rollout',
    type: 'Runtime fix',
    suggestion: 'Apply a rollout restart and add a temporary liveness delay to allow backend initialization to complete.',
    reason: 'The AI saw repeated container restarts and a failing startup probe, which indicates timing mismatches during initialization.',
    outcome: 'Expected pod recovery with fewer restarts and smoother cluster stabilization.',
    confidence: 89,
  },
  {
    id: 'rec-2',
    category: 'Resource Management',
    title: 'Prevent memory pressure on stateful workloads',
    type: 'Config update',
    suggestion: 'Raise memory requests for the database deployment and schedule a maintenance window for node draining.',
    reason: 'Memory eviction events are impacting critical stateful pods, suggesting the cluster is overcommitted in the current zone.',
    outcome: 'Reduced eviction frequency and improved pod uptime for database services.',
    confidence: 85,
  },
  {
    id: 'rec-3',
    category: 'Latency Optimization',
    title: 'Reduce readiness probe failures',
    type: 'Probe tuning',
    suggestion: 'Increase probe timeout and examine container startup duration for services experiencing intermittent failures.',
    reason: 'Readiness checks are failing before the application is fully available, causing churn during rolling updates.',
    outcome: 'Faster service readiness and less disruption during deployment rollouts.',
    confidence: 91,
  },
]

// generate kubectl commands dynamically from the incident data
function buildKubectlCommands(primary) {
  const ns = primary?.namespace || 'default'
  const pod = primary?.pod || 'crash-app-7d9b5f7c8d'
  const deployment = pod.split('-')[0] || pod

  return [
    { id: 'cmd-1', label: `Inspect ${pod}`, command: `kubectl describe pod ${pod} -n ${ns}` },
    { id: 'cmd-2', label: 'Stream failing logs', command: `kubectl logs -n ${ns} ${pod} --follow` },
    { id: 'cmd-3', label: 'View events', command: `kubectl get events -n ${ns} --sort-by=.metadata.creationTimestamp` },
    { id: 'cmd-4', label: `Restart deployment ${deployment}`, command: `kubectl rollout restart deployment ${deployment} -n ${ns}` },
  ]
}

const timelineEvents = [
  { id: 't-1', step: '01', title: 'Incident detected', time: '08:40', description: 'AI telemetry flagged an unstable pod and opened a remediation task.' },
  { id: 't-2', step: '02', title: 'AI analysis started', time: '08:42', description: 'Ollama engine began correlating pod logs, events, and probe data.' },
  { id: 't-3', step: '03', title: 'Root cause identified', time: '08:45', description: 'AI isolated a probe timeout issue and memory pressure signature.' },
  { id: 't-4', step: '04', title: 'Remediation generated', time: '08:46', description: 'Suggested fix actions were published for operator review.' },
  { id: 't-5', step: '05', title: 'Pod stabilized', time: '08:51', description: 'Expected recovery path issued; monitoring confirms pod health improved.' },
]

const severityTrend = [
  { name: '00:30', value: 4 },
  { name: '01:00', value: 6 },
  { name: '01:30', value: 8 },
  { name: '02:00', value: 6 },
  { name: '02:30', value: 7 },
  { name: '03:00', value: 5 },
]

const remediationSuccess = [
  { period: 'Live', percent: 92 },
  { period: '1h', percent: 85 },
  { period: '24h', percent: 88 },
  { period: '7d', percent: 91 },
]

const aiMarkdownResponse = `### Recommended remediation summary

- Increase the **readiness probe timeout** for the \`payments-api\` deployment.
- Apply the following command to inspect the pod logs:

\`\`\`
kubectl logs -n default crash-app-7d9b5f7c8d --follow
\`\`\`

### Why this fix?

1. The pod is failing startup checks before the app becomes fully available.
2. AI detected repeated \`CrashLoopBackOff\` events.

### Expected outcome

- Faster rollout completion
- Reduced probe failures
- Improved stability for production traffic
`

const modelMeta = {
  model: 'ollama-mistral-7b',
  latency: 184,
  duration: 3.8,
  source: 'Kubernetes event stream',
}

function AIInsights() {
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [incidents, setIncidents] = useState(initialIncidents)
  const [recommendations, setRecommendations] = useState(initialRecommendations)
  const [loading, setLoading] = useState(true)

  const avgConfidence = useMemo(() => {
    if (!incidents.length) return 0
    return Math.round(incidents.reduce((sum, item) => sum + (item.confidence || 0), 0) / incidents.length)
  }, [incidents])

  const incidentSeverityCount = useMemo(() => {
    return incidents.filter((item) => item.status?.toLowerCase().includes('crash')).length
  }, [incidents])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/analyze')
        if (Array.isArray(response.data) && response.data.length) {
          setIncidents(response.data.map((entry, index) => ({
            ...entry,
            id: entry.id || `remote-${index}`,
            rootCause: entry.possible_reason || entry.rootCause || '',
            remediation: entry.suggestion || entry.remediation || '',
            confidence: entry.confidence || 82,
            timestamp: entry.timestamp ? entry.timestamp * 1000 : Date.now(),
            details: entry.details || entry.ai_analysis || '',
          })))
        }
      } catch (error) {
        console.warn('AI Insights fetch fallback to local mock data', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    const ws = createWebsocket(
      (msg) => {
        if (Array.isArray(msg.incidents)) {
          setIncidents(msg.incidents.map((entry, index) => ({
            ...entry,
            id: entry.id || `ws-${index}`,
            rootCause: entry.possible_reason || entry.rootCause || '',
            remediation: entry.suggestion || entry.remediation || '',
            confidence: entry.confidence || 80,
            timestamp: entry.timestamp ? entry.timestamp * 1000 : Date.now(),
            details: entry.details || entry.ai_analysis || '',
          })))
        }
      },
      (status) => setConnectionStatus(status)
    )

    return () => {
      ws && ws.close()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] p-8 text-white">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 px-8 py-12 text-center shadow-xl">
            <p className="text-xl font-semibold text-cyan-300">Loading AI insights...</p>
            <p className="mt-2 text-slate-400">Connecting to Ollama and analyzing cluster telemetry.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020617] px-8 py-8 text-white">
      <div className="mb-10 grid gap-6 xl:grid-cols-[1.8fr_0.9fr]">
        <div className="space-y-6 rounded-[32px] border border-slate-800 bg-slate-950/80 p-8 shadow-xl shadow-cyan-500/5 backdrop-blur-xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/75">AI Operations Center</p>
              <h1 className="mt-3 text-4xl font-semibold text-white">AI-powered Kubernetes incident intelligence and remediation.</h1>
              <p className="mt-3 max-w-2xl text-slate-400">Centralized incident context, AI root cause analysis, suggested kubectl runbooks, and confidence-driven remediation summaries for enterprise operation teams.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/95 px-5 py-4 text-sm text-slate-300 shadow-sm">
                <span className="inline-flex items-center gap-2 font-semibold text-cyan-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" /> Live AI
                </span>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/95 px-5 py-4 text-sm text-slate-300 shadow-sm">
                <span className="inline-flex items-center gap-2 font-semibold text-emerald-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Telemetry active
                </span>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/95 px-5 py-4 text-sm text-slate-300 shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Wifi size={14} />
                  <ConnectionStatus status={connectionStatus} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AiMetricCard icon={<Activity size={24} />} title="Active AI Incidents" value={incidents.length} change="+18%" accentColor="text-cyan-400" />
            <AiMetricCard icon={<ShieldCheck size={24} />} title="Critical Severity" value={`${incidentSeverityCount}`} change="+7%" accentColor="text-red-400" />
            <AiMetricCard icon={<Sparkles size={24} />} title="AI Confidence Avg" value={`${avgConfidence}%`} change="Stable" accentColor="text-emerald-400" />
            <AiMetricCard icon={<Terminal size={24} />} title="Suggested Fixes Generated" value={initialRecommendations.length} change="Realtime" accentColor="text-yellow-300" />
            <AiMetricCard icon={<Layers3 size={24} />} title="Pods Under Analysis" value={12} change="+25%" accentColor="text-cyan-300" />
            <AiMetricCard icon={<Cpu size={24} />} title="AI Engine Status" value="Online" change="0.18s" accentColor="text-cyan-400" />
          </div>
        </div>

        <div className="space-y-6">
          <AiConfidenceMeter label="Inference confidence" value={avgConfidence || 82} />
          <AiOllamaPanel {...modelMeta} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Root Cause Analysis</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">Enterprise incident cards</h2>
              </div>
            </div>
            <div className="space-y-6">
              {incidents.map((incident) => (
                <AiIncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            {recommendations.map((item) => (
              <AiRecommendationPanel key={item.id} item={item} />
            ))}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Suggested Kubectl Commands</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">Operational runbook</h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {buildKubectlCommands(incidents[0]).map((item) => (
                <KubectlCommandCard key={item.id} label={item.label} command={item.command} />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <LiveLogsTerminal />
          <AiTimeline events={timelineEvents} />
          <AiTrendCharts trends={severityTrend} success={remediationSuccess} />
          <section className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-slate-400">AI response viewer</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">Generated remediation details</h2>
              </div>
            </div>
            <AiMarkdownViewer content={aiMarkdownResponse} />
          </section>
        </aside>
      </div>
    </div>
  )
}

export default AIInsights
