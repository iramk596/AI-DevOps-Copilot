import { Clipboard, Check } from 'lucide-react'
import { useState } from 'react'

function KubectlCommandCard({ command, label }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch (error) {
      console.error('Clipboard copy failed', error)
    }
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4 shadow-sm transition-all duration-300 hover:border-cyan-500/30">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-slate-400">{label}</p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 transition hover:border-cyan-500"
        >
          {copied ? <Check size={14} /> : <Clipboard size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-3xl border border-slate-800 bg-[#020617] p-4 text-sm font-mono text-slate-200">{command}</pre>
    </div>
  )
}

export default KubectlCommandCard
