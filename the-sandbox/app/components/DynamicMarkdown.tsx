'use client'

import dynamic from 'next/dynamic'
import type { Options } from 'react-markdown'

function MarkdownSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-4 bg-gray-100 rounded w-3/4" />
      <div className="h-4 bg-gray-100 rounded w-full" />
      <div className="h-4 bg-gray-100 rounded w-1/2" />
    </div>
  )
}

const DynamicMarkdown = dynamic(
  () =>
    Promise.all([
      import('react-markdown'),
      import('remark-gfm'),
    ]).then(([markdownMod, gfmMod]) => {
      const ReactMarkdown = markdownMod.default
      const remarkGfm = gfmMod.default
      return {
        default: function Markdown(props: Options) {
          const plugins = props.remarkPlugins
            ? [remarkGfm, ...props.remarkPlugins]
            : [remarkGfm]
          return <ReactMarkdown {...props} remarkPlugins={plugins} />
        },
      }
    }),
  { ssr: false, loading: () => <MarkdownSkeleton /> },
)

export default DynamicMarkdown
