'use client'

interface HumanEscalationFooterProps {
  message?: string
  ctaText?: string
  href?: string
}

export function HumanEscalationFooter({
  message = 'This audit is AI-assisted. Always verify with an academic advisor before making enrollment decisions.',
  ctaText = 'Contact the Registrar\'s Office',
  href = 'https://registrar.uky.edu',
}: HumanEscalationFooterProps) {
  return (
    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-start gap-2">
      <span className="flex-shrink-0 text-blue-500 mt-0.5">ⓘ</span>
      <span>
        {message}{' '}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline hover:text-blue-900"
        >
          {ctaText}
        </a>
      </span>
    </div>
  )
}
