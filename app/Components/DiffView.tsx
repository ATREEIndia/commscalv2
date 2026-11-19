'use client'
import { diffLines } from 'diff'

interface Props {
  before: string
  after: string
  label?: string
}

export default function DiffView({ before, after, label = 'Body copy diff' }: Props) {
  const changes = diffLines(before || '', after || '')

  return (
    <div className="font-mono text-xs rounded-lg overflow-hidden border border-gray-200">
      <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200 text-gray-400 text-[10px] font-sans tracking-wide uppercase">
        {label}
      </div>
      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        {changes.map((change, i) => {
          // Split into individual lines; strip trailing empty string from split('\n')
          const lines = change.value.split('\n')
          if (lines[lines.length - 1] === '') lines.pop()
          return lines.map((line, j) => (
            <div
              key={`${i}-${j}`}
              className={`flex items-start px-3 py-px ${
                change.added
                  ? 'bg-green-50'
                  : change.removed
                  ? 'bg-red-50'
                  : 'bg-white'
              }`}
            >
              <span
                className={`w-4 select-none flex-shrink-0 ${
                  change.added
                    ? 'text-green-500'
                    : change.removed
                    ? 'text-red-400'
                    : 'text-gray-200'
                }`}
              >
                {change.added ? '+' : change.removed ? '-' : ' '}
              </span>
              <span
                className={`whitespace-pre-wrap break-all leading-5 ${
                  change.added
                    ? 'text-green-800'
                    : change.removed
                    ? 'text-red-700 line-through'
                    : 'text-gray-600'
                }`}
              >
                {line || ' '}
              </span>
            </div>
          ))
        })}
      </div>
    </div>
  )
}
