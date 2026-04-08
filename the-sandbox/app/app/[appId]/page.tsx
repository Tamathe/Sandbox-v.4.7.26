import { notFound } from 'next/navigation'
import { prisma } from '../../lib/prisma'

export const dynamic = 'force-dynamic'

export default async function PublicAppPage({
  params,
}: {
  params: Promise<{ appId: string }>
}) {
  const { appId } = await params

  const app = await prisma.playgroundApp.findUnique({
    where: { id: appId },
    select: { title: true, htmlContent: true, publishedAt: true },
  })

  if (!app || !app.publishedAt || !app.htmlContent) {
    notFound()
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between bg-[#0033A0] px-4 py-2">
        <span className="text-sm font-semibold text-white">{app.title}</span>
        <span className="text-xs text-blue-200">Built with University of Kentucky · CATS-AI</span>
      </div>
      <iframe
        srcDoc={app.htmlContent}
        sandbox="allow-scripts allow-forms allow-modals"
        className="flex-1 border-0"
        title={app.title}
      />
    </div>
  )
}
