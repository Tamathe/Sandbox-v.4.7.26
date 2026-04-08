import { prisma } from '../prisma'
import type { Petition, User } from '../../generated/prisma'

export const PETITION_ROUTES: Record<string, string> = {
  LATE_WITHDRAWAL: 'registrar-withdrawals@uky.edu',
  GRADE_CHANGE: 'registrar-grades@uky.edu',
  NAME_UPDATE: 'registrar-records@uky.edu',
  ENROLLMENT_CERTIFICATION: 'registrar-certifications@uky.edu',
  ACADEMIC_RENEWAL: 'registrar-renewal@uky.edu',
  COURSE_OVERLOAD: 'registrar-advising@uky.edu',
  GRADUATION_APPLICATION: 'registrar-graduation@uky.edu',
  MAJOR_CHANGE: 'registrar-advising@uky.edu',
  LEAVE_OF_ABSENCE: 'registrar-loa@uky.edu',
}

export async function routePetition(
  petition: Petition,
  actor: User,
): Promise<void> {
  const routedTo = PETITION_ROUTES[petition.type] ?? 'registrar@uky.edu'

  await prisma.$transaction([
    prisma.petition.update({
      where: { id: petition.id },
      data: {
        routedTo,
        routedAt: new Date(),
        status: 'IN_REVIEW',
      },
    }),
    prisma.petitionAuditEntry.create({
      data: {
        petitionId: petition.id,
        actorId: actor.id,
        action: 'ROUTED',
        note: `Petition automatically routed to ${routedTo}`,
      },
    }),
  ])
}
