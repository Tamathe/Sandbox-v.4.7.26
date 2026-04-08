import { prisma } from './prisma'

interface ImportPortfolioInput {
  name: string
  shortDescription: string
  fullDescription: string
  externalUrl: string
  category: string
  techStack: string[]
  repoUrl: string | null
  thumbnailUrl: string | null
  creatorId: string
  creatorRole: string
}

export async function importPortfolioTool(input: ImportPortfolioInput) {
  // Students → PENDING approval; educators/admins → fast-track
  const isPrivileged = input.creatorRole === 'EDUCATOR' || input.creatorRole === 'ADMIN'

  const tool = await prisma.tool.create({
    data: {
      name: input.name,
      shortDescription: input.shortDescription,
      fullDescription: input.fullDescription,
      category: input.category,
      toolType: 'PORTFOLIO',
      externalUrl: input.externalUrl,
      techStack: input.techStack,
      repoUrl: input.repoUrl,
      thumbnailUrl: input.thumbnailUrl,
      isPortfolio: true,
      published: true,
      approvalStatus: isPrivileged ? 'APPROVED' : 'PENDING',
      fastTrackApprovedAt: isPrivileged ? new Date() : null,
      difficultyLevel: 'Introductory',
      creatorId: input.creatorId,
    },
    include: {
      creator: true,
    },
  })

  return {
    toolId: tool.id,
    name: tool.name,
    approvalStatus: tool.approvalStatus,
    message: isPrivileged
      ? 'Your app has been imported and is live!'
      : 'Your app has been imported and is pending admin approval.',
  }
}
