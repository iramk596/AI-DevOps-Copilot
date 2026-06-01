import ReactMarkdown from 'react-markdown'

function AiMarkdownViewer({ content }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-sm">
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => <h1 className="text-2xl font-semibold text-white" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-semibold text-white" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-semibold text-white" {...props} />,
          p: ({ node, ...props }) => <p className="text-slate-300 leading-7" {...props} />,
          ul: ({ node, ...props }) => <ul className="ml-5 list-disc space-y-2 text-slate-300" {...props} />,
          li: ({ node, ...props }) => <li className="text-slate-300 leading-7" {...props} />,
          code: ({ inline, className, children, ...props }) => {
            return inline ? (
              <code className="rounded bg-slate-900 px-1.5 py-0.5 text-cyan-300" {...props}>
                {children}
              </code>
            ) : (
              <pre className="rounded-3xl bg-[#020617] p-4 text-sm text-slate-200 overflow-x-auto" {...props}>
                <code>{children}</code>
              </pre>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default AiMarkdownViewer
