-- AlterTable
ALTER TABLE "Course"
ADD COLUMN "facultyAiRetrievalApproved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "studentUploadsAllowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "transcriptGenerationAllowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "classroomRecordingAllowed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CourseMaterial"
ADD COLUMN "sourceSystem" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "provenanceType" TEXT NOT NULL DEFAULT 'official',
ADD COLUMN "approvalBasis" TEXT NOT NULL DEFAULT 'course_owner',
ADD COLUMN "accessScope" TEXT NOT NULL DEFAULT 'course_members',
ADD COLUMN "aiOptInStatus" TEXT NOT NULL DEFAULT 'approved',
ADD COLUMN "uploadedById" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill access scopes from current course visibility
UPDATE "CourseMaterial" AS material
SET "accessScope" = CASE
  WHEN course."isPublic" = true THEN 'public_course'
  ELSE 'course_members'
END,
    "updatedAt" = material."createdAt"
FROM "Course" AS course
WHERE course."id" = material."courseId";

-- CreateIndex
CREATE INDEX "CourseMaterial_uploadedById_idx" ON "CourseMaterial"("uploadedById");

-- AddForeignKey
ALTER TABLE "CourseMaterial"
ADD CONSTRAINT "CourseMaterial_uploadedById_fkey"
FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
