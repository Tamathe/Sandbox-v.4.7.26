-- CreateTable
CREATE TABLE "CoursePolicy" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "policyType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'syllabus',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoursePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingWeight" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'syllabus',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradingWeight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoursePolicy_courseId_idx" ON "CoursePolicy"("courseId");

-- CreateIndex
CREATE INDEX "CoursePolicy_courseId_policyType_idx" ON "CoursePolicy"("courseId", "policyType");

-- CreateIndex
CREATE INDEX "GradingWeight_courseId_idx" ON "GradingWeight"("courseId");

-- AddForeignKey
ALTER TABLE "CoursePolicy" ADD CONSTRAINT "CoursePolicy_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingWeight" ADD CONSTRAINT "GradingWeight_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
