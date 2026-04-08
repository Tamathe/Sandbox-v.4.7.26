-- AlterTable
ALTER TABLE "CourseMaterial" ADD COLUMN     "isVisible" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "CourseToolLink" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseToolLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseToolLink_courseId_idx" ON "CourseToolLink"("courseId");

-- CreateIndex
CREATE INDEX "CourseToolLink_toolId_idx" ON "CourseToolLink"("toolId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseToolLink_courseId_toolId_key" ON "CourseToolLink"("courseId", "toolId");

-- AddForeignKey
ALTER TABLE "CourseToolLink" ADD CONSTRAINT "CourseToolLink_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseToolLink" ADD CONSTRAINT "CourseToolLink_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
