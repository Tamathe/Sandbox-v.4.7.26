/**
 * Sandy Universal Agent — Content Creation Tools (P1)
 *
 * 3 tools: generate_rubric, create_discussion_prompt, build_practice_exam
 *
 * Wraps existing assignment-builder and exam-forge services.
 */

import type { ToolModule } from '../agent-types';
import { prisma } from '../../prisma';

export const contentTools: ToolModule = {
  tools: [
    {
      name: 'generate_rubric',
      description:
        'Create a grading rubric from an assignment title and description. Returns structured criteria with performance bands (Excellent → Needs Improvement). Auto-generates using AI.',
      category: 'content',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      reliability: 'synthetic',
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course ID for context' },
          assignmentTitle: { type: 'string', description: 'Title of the assignment' },
          assignmentDescription: { type: 'string', description: 'Description/instructions for the assignment' },
          pointsPossible: { type: 'number', description: 'Total points (default 100)' },
        },
        required: ['courseId', 'assignmentTitle', 'assignmentDescription'],
      },
    },
    {
      name: 'create_discussion_prompt',
      description:
        'Generate discussion board prompts at a target Bloom\'s taxonomy level for a topic. Returns 2-3 prompts with suggested rubric criteria.',
      category: 'content',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      reliability: 'synthetic',
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course ID for context' },
          topic: { type: 'string', description: 'Discussion topic' },
          bloomLevel: {
            type: 'string',
            description: 'Target Bloom level: remember, understand, apply, analyze, evaluate, create. Defaults to analyze.',
          },
          count: { type: 'number', description: 'Number of prompts to generate (default 3)' },
        },
        required: ['courseId', 'topic'],
      },
    },
    {
      name: 'build_practice_exam',
      reliability: 'synthetic',
      description:
        'Generate a full practice exam with answer key for a course. Targets the student\'s weak concepts for personalized review. Sandy will show the exam for your approval.',
      category: 'content',
      permission: 'confirm',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course ID' },
          studentId: { type: 'string', description: 'Student ID for personalization (uses current user if omitted)' },
          questionCount: { type: 'number', description: 'Number of questions (5-20, default 10)' },
        },
        required: ['courseId'],
      },
    },
    {
      name: 'check_contrast',
      description:
        'Check HTML content for WCAG AA color contrast violations. Validates foreground/background color pairs from inline styles, <style> blocks, and Tailwind classes. Returns violations with current ratio, required ratio, and suggested accessible color alternatives.',
      category: 'content',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN', 'STUDENT'],
      reliability: 'live',
      input_schema: {
        type: 'object',
        properties: {
          htmlContent: { type: 'string', description: 'HTML content to check for contrast issues' },
          appId: { type: 'string', description: 'Playground app ID — fetches htmlContent from DB' },
        },
        required: [],
      },
    },
    {
      name: 'compliance_report',
      description:
        'Generate an ADA compliance report for a course, department, or the entire university. Returns WCAG 2.1 AA compliance rate, grade distribution, department breakdown, high-impact remediation queue, and weekly trends.',
      category: 'content',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN', 'STAFF'],
      reliability: 'live',
      input_schema: {
        type: 'object',
        properties: {
          scope: { type: 'string', description: '"university", "department", or "course" (default: "university")' },
          scopeId: { type: 'string', description: 'Course ID or department code prefix (e.g. "ENG")' },
        },
        required: [],
      },
    },
    {
      name: 'remediate_content',
      description:
        'Auto-fix accessibility issues in a course material or tool. Fixes headings (infers hierarchy), readability (simplifies complex text), and structure (converts prose to lists). Returns before/after preview with projected grade improvement. Educator must approve changes before they are applied.',
      category: 'content',
      permission: 'confirm',
      roles: ['EDUCATOR', 'ADMIN'],
      reliability: 'live',
      input_schema: {
        type: 'object',
        properties: {
          targetType: { type: 'string', description: '"course_material" or "tool"' },
          targetId: { type: 'string', description: 'Material or tool ID to remediate' },
          courseId: { type: 'string', description: 'Course ID — generates remediation plan for all D/F materials' },
          fixTypes: {
            type: 'array',
            description: 'Which fixes to apply: "headings", "readability", "structure", "alt-text", "all". Default: "all"',
          },
          apply: { type: 'boolean', description: 'If true, apply the remediated content (requires prior generate call). Default: false' },
        },
        required: [],
      },
    },
    {
      name: 'accessibility_scan',
      description:
        'Run a full ADA/WCAG accessibility scan on a course material or an entire course. Detects missing headings, heading hierarchy skips, image alt text gaps, non-descriptive links, color-dependent information, complex tables, and readability issues. Returns issues with WCAG criteria references and auto-fix suggestions.',
      category: 'content',
      permission: 'confirm',
      roles: ['EDUCATOR', 'ADMIN'],
      reliability: 'live',
      input_schema: {
        type: 'object',
        properties: {
          materialId: { type: 'string', description: 'Course material ID to scan' },
          courseId: { type: 'string', description: 'Course ID — bulk scans all materials in the course' },
          text: { type: 'string', description: 'Raw text to scan (if no materialId/courseId)' },
        },
        required: [],
      },
    },
    {
      name: 'check_readability',
      description:
        'Analyze text readability using Flesch-Kincaid scoring. Returns grade level, jargon terms, long sentences, and a plain-language rewrite suggestion. Can scan a specific tool\'s systemPrompt, a course material, or an entire course\'s materials in bulk.',
      category: 'content',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN', 'STUDENT'],
      reliability: 'live',
      input_schema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to analyze (used if no toolId/materialId/courseId provided)' },
          toolId: { type: 'string', description: 'Tool ID — analyzes the systemPrompt' },
          courseId: { type: 'string', description: 'Course ID — bulk scans all materials and returns per-material grades' },
          simplify: { type: 'boolean', description: 'If true, also returns an AI-simplified version of the text (default: false)' },
        },
        required: [],
      },
    },
    {
      name: 'generate_alt_text',
      description:
        'Generate accessible alt text for images using AI vision analysis. In bulk mode, scans all tool thumbnails missing alt text and auto-saves high-confidence results. In single mode, analyzes one image URL.',
      category: 'content',
      permission: 'confirm',
      roles: ['EDUCATOR', 'ADMIN'],
      reliability: 'synthetic',
      input_schema: {
        type: 'object',
        properties: {
          mode: { type: 'string', description: '"single" for one image, "bulk" to scan all tools missing alt text (default: bulk)' },
          imageUrl: { type: 'string', description: 'Image URL to analyze (required for single mode)' },
          toolId: { type: 'string', description: 'Tool ID to save alt text to (optional, single mode only)' },
          context: { type: 'string', description: 'Context hint for better generation (e.g. "Tool thumbnail for Debate Simulator")' },
        },
        required: [],
      },
    },
  ],

  handlers: {
    async generate_rubric(args) {
      try {
        const courseId = args.courseId as string;
        const assignmentTitle = args.assignmentTitle as string;
        const assignmentDescription = args.assignmentDescription as string;
        const pointsPossible = (args.pointsPossible as number) ?? 100;

        // Try to use the real rubric generator
        try {
          const { generateAndSaveRubric } = await import('../../assignment-builder');
          const rubric = await generateAndSaveRubric({
            courseId,
            assignmentTitle,
            assignmentDescription,
            pointsPossible,
          });

          return {
            status: 'generated',
            rubricId: rubric.id,
            title: rubric.title,
            pointsPossible,
            criteria: rubric.criteria.map((c) => ({
              name: c.title,
              weight: c.maxPoints,
              bands: c.bands.map((b) => ({
                label: b.label,
                score: b.maxPoints,
                description: b.description,
              })),
            })),
            message: `Rubric "${rubric.title}" generated with ${rubric.criteria.length} criteria and saved.`,
          };
        } catch {
          // Fallback to synthetic rubric for demo — flagged so Sandy caveats it
          return {
            _isFallback: true,
            _fallbackReason: 'AI rubric generation failed. This is a generic template rubric — review and customize before using.',
            status: 'generated',
            title: `Rubric: ${assignmentTitle}`,
            pointsPossible,
            criteria: [
              {
                name: 'Content & Understanding',
                weight: 40,
                bands: [
                  { label: 'Excellent', score: 40, description: 'Demonstrates thorough understanding with insightful analysis' },
                  { label: 'Proficient', score: 30, description: 'Shows solid understanding with adequate analysis' },
                  { label: 'Developing', score: 20, description: 'Partial understanding with limited analysis' },
                  { label: 'Needs Improvement', score: 10, description: 'Minimal understanding demonstrated' },
                ],
              },
              {
                name: 'Critical Thinking',
                weight: 30,
                bands: [
                  { label: 'Excellent', score: 30, description: 'Original arguments with strong evidence' },
                  { label: 'Proficient', score: 22, description: 'Clear arguments with adequate support' },
                  { label: 'Developing', score: 15, description: 'Basic arguments with limited evidence' },
                  { label: 'Needs Improvement', score: 8, description: 'Weak or missing argumentation' },
                ],
              },
              {
                name: 'Communication & Organization',
                weight: 30,
                bands: [
                  { label: 'Excellent', score: 30, description: 'Exceptionally clear and well-organized' },
                  { label: 'Proficient', score: 22, description: 'Clear with logical organization' },
                  { label: 'Developing', score: 15, description: 'Somewhat unclear or disorganized' },
                  { label: 'Needs Improvement', score: 8, description: 'Unclear and poorly organized' },
                ],
              },
            ],
            message: `Rubric for "${assignmentTitle}" generated with 3 criteria totaling ${pointsPossible} points.`,
          };
        }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to generate rubric', status: 'failed' };
      }
    },

    async create_discussion_prompt(args) {
      try {
        const courseId = args.courseId as string;
        const topic = args.topic as string;
        const bloomLevel = (args.bloomLevel as string) ?? 'analyze';
        const count = Math.min(Math.max((args.count as number) ?? 3, 1), 5);

        const course = await prisma.course.findUnique({
          where: { id: courseId },
          select: { title: true, courseCode: true },
        });

        const bloomVerbs: Record<string, string[]> = {
          remember: ['identify', 'list', 'define', 'recall'],
          understand: ['explain', 'summarize', 'describe', 'interpret'],
          apply: ['demonstrate', 'implement', 'use', 'solve'],
          analyze: ['compare', 'contrast', 'examine', 'differentiate'],
          evaluate: ['justify', 'critique', 'assess', 'defend'],
          create: ['design', 'propose', 'construct', 'formulate'],
        };

        const verbs = bloomVerbs[bloomLevel] ?? bloomVerbs['analyze'];

        const prompts = Array.from({ length: count }, (_, i) => ({
          number: i + 1,
          bloomLevel,
          prompt: `${verbs[i % verbs.length].charAt(0).toUpperCase() + verbs[i % verbs.length].slice(1)} how ${topic} impacts the field discussed in ${course?.courseCode ?? 'this course'}. ${
            bloomLevel === 'analyze'
              ? 'Compare at least two perspectives and cite specific examples from course materials.'
              : bloomLevel === 'evaluate'
                ? 'Take a position and defend it with evidence, then address a counterargument.'
                : bloomLevel === 'create'
                  ? 'Propose an original framework or solution and explain how it improves on current approaches.'
                  : 'Support your response with specific examples from the readings.'
          }`,
          rubricCriteria: [
            'Depth of engagement with the topic',
            'Use of evidence from course materials',
            'Quality of peer responses (at least 2 substantive replies)',
          ],
          wordCountSuggestion: bloomLevel === 'remember' || bloomLevel === 'understand' ? 150 : 300,
        }));

        return {
          status: 'generated',
          courseCode: course?.courseCode ?? courseId,
          topic,
          bloomLevel,
          promptCount: prompts.length,
          prompts,
          message: `Generated ${prompts.length} ${bloomLevel}-level discussion prompts about "${topic}".`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to create discussion prompts', status: 'failed' };
      }
    },

    async build_practice_exam(args, user) {
      try {
        const courseId = args.courseId as string;
        const studentId = (args.studentId as string) ?? user.id;
        const questionCount = Math.min(Math.max((args.questionCount as number) ?? 10, 5), 20);

        // Try to use the real exam forge service
        try {
          const { generatePracticeExam } = await import('../../exam-forge-service');
          const exam = await generatePracticeExam(studentId, courseId, { questionCount });

          return {
            status: 'preview',
            examId: exam.id,
            courseTitle: exam.courseName,
            questionCount: exam.questions.length,
            targetedConcepts: exam.conceptsTargeted,
            questions: exam.questions.map((q, i) => ({
              number: i + 1,
              question: q.question,
              bloomLevel: q.bloomLevel,
              concept: q.concept,
              options: q.options,
              points: q.points,
            })),
            message: `Practice exam with ${exam.questions.length} questions ready for review. Targets: ${exam.conceptsTargeted.join(', ')}.`,
          };
        } catch {
          // Fallback to synthetic exam for demo — flagged so Sandy caveats it
          const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { title: true, courseCode: true },
          });

          const questions = Array.from({ length: questionCount }, (_, i) => ({
            number: i + 1,
            question: `Practice question ${i + 1} for ${course?.courseCode ?? courseId}`,
            bloomLevel: ['remember', 'understand', 'apply', 'analyze'][i % 4],
            targetConcept: `Core concept ${(i % 5) + 1}`,
            options: [
              { label: 'A', text: `Answer option A for Q${i + 1}` },
              { label: 'B', text: `Answer option B for Q${i + 1}` },
              { label: 'C', text: `Answer option C for Q${i + 1}` },
              { label: 'D', text: `Answer option D for Q${i + 1}` },
            ],
            correctAnswer: 'B',
            explanation: `Explanation for why B is correct in Q${i + 1}.`,
          }));

          return {
            _isFallback: true,
            _fallbackReason: 'AI exam generation failed. These are placeholder questions — do NOT present them as a real practice exam.',
            status: 'preview',
            courseTitle: course?.title ?? 'Unknown Course',
            questionCount: questions.length,
            targetedConcepts: ['Core concept 1', 'Core concept 2', 'Core concept 3'],
            questions,
            message: `Practice exam with ${questions.length} questions generated for ${course?.courseCode ?? courseId}. Approve to start.`,
          };
        }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to build practice exam', status: 'failed' };
      }
    },

    async remediate_content(args) {
      try {
        const targetType = args.targetType as string | undefined;
        const targetId = args.targetId as string | undefined;
        const courseId = args.courseId as string | undefined;
        const fixTypes = (args.fixTypes as string[] | undefined) ?? ['all'];

        // Bulk course remediation plan
        if (courseId) {
          const { bulkGenerateRemediation } = await import('../../accessibility/remediation-service');
          const result = await bulkGenerateRemediation(courseId);

          if (result.materials.length === 0) {
            return {
              status: 'no_issues',
              message: 'No D/F-graded materials found in this course — nothing to remediate.',
            };
          }

          const improved = result.materials.filter((m) => m.projectedGrade < m.currentGrade);
          return {
            status: 'plan_generated',
            materialCount: result.materials.length,
            totalChanges: result.totalChanges,
            projectedGain: result.projectedComplianceGain,
            materials: result.materials.map((m) => ({
              title: m.title,
              current: m.currentGrade,
              projected: m.projectedGrade,
              fixes: m.changeCount,
              autoFixable: m.autoFixableCount,
            })),
            message: `Remediation plan for ${result.materials.length} materials: ${result.totalChanges} total changes. ${improved.length} materials would improve their grade. Projected compliance gain: ${result.projectedComplianceGain}%.`,
          };
        }

        if (!targetType || !targetId) {
          return { error: 'Provide targetType + targetId, or courseId', status: 'failed' };
        }

        const { generateRemediation, applyRemediation } = await import('../../accessibility/remediation-service');

        // Apply mode — commit previously generated changes
        if (args.apply) {
          const result = await applyRemediation(targetType, targetId, '');
          return {
            status: 'applied',
            newGrade: result.newGrade,
            newScore: Math.round(result.newScore * 100),
            message: `Changes applied. New accessibility grade: ${result.newGrade} (${Math.round(result.newScore * 100)}%).`,
          };
        }

        // Generate mode — preview changes
        const result = await generateRemediation(
          targetType,
          targetId,
          fixTypes as Array<'headings' | 'readability' | 'structure' | 'alt-text' | 'all'>,
        );

        if (result.changes.length === 0) {
          return {
            status: 'no_changes',
            grade: result.beforeGrade,
            message: `"${result.title}" doesn't have any auto-fixable issues for the selected fix types.`,
          };
        }

        const highConfidence = result.changes.filter((c) => c.confidence >= 0.7);

        return {
          status: 'preview',
          title: result.title,
          beforeGrade: result.beforeGrade,
          afterGrade: result.afterGrade,
          beforeScore: Math.round(result.beforeScore * 100),
          afterScore: Math.round(result.afterScore * 100),
          totalChanges: result.changes.length,
          highConfidenceChanges: highConfidence.length,
          changes: result.changes.slice(0, 8).map((c) => ({
            type: c.fixType,
            description: c.description,
            confidence: Math.round(c.confidence * 100),
            before: c.before.slice(0, 100),
            after: c.after.slice(0, 100),
          })),
          message: `"${result.title}": ${result.changes.length} changes proposed. Grade would improve from ${result.beforeGrade} (${Math.round(result.beforeScore * 100)}%) to ${result.afterGrade} (${Math.round(result.afterScore * 100)}%). ${highConfidence.length} high-confidence fixes ready to apply. Want me to apply them?`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to remediate content', status: 'failed' };
      }
    },

    async compliance_report(args) {
      try {
        const scope = (args.scope as string) ?? 'university';
        const scopeId = args.scopeId as string | undefined;

        const { getComplianceSummary } = await import('../../accessibility/compliance-aggregator');
        const summary = await getComplianceSummary(
          scope as 'university' | 'department' | 'course',
          scopeId,
        );

        const gradeBreakdown = (['A', 'B', 'C', 'D', 'F'] as const)
          .filter((g) => (summary.gradeDistribution[g] ?? 0) > 0)
          .map((g) => `${g}: ${summary.gradeDistribution[g]}`)
          .join(', ');

        const topDepts = summary.byDepartment
          .slice(0, 5)
          .map((d) => `${d.department}: ${d.compliance}%`)
          .join(', ');

        const topQueue = summary.highImpactQueue
          .slice(0, 3)
          .map((q, i) => `${i + 1}. "${q.title}" (${q.grade}, ${q.enrollment} enrolled, ${q.autoFixableCount} auto-fixable)`)
          .join('; ');

        return {
          status: 'generated',
          scope,
          complianceRate: summary.complianceRate,
          totalScanned: summary.scannedItems,
          totalContent: summary.totalContentItems,
          gradeDistribution: summary.gradeDistribution,
          byType: summary.byType.map((t) => ({
            type: t.type.replace(/_/g, ' '),
            avgScore: Math.round(t.avgScore * 100),
            count: t.total,
          })),
          departments: summary.byDepartment.slice(0, 8).map((d) => ({
            name: d.department,
            compliance: d.compliance,
            materials: d.totalMaterials,
            topIssue: d.topIssue,
          })),
          topRemediations: summary.highImpactQueue.slice(0, 5).map((q) => ({
            title: q.title,
            course: q.courseName,
            grade: q.grade,
            enrolled: q.enrollment,
            autoFixable: q.autoFixableCount,
          })),
          message: `ADA Compliance Report (${scope}${scopeId ? `: ${scopeId}` : ''}): ${summary.complianceRate}% compliance rate. ${summary.scannedItems} of ${summary.totalContentItems} items scanned. Grades: ${gradeBreakdown}.${topDepts ? ` Departments: ${topDepts}.` : ''}${topQueue ? ` Top remediation: ${topQueue}` : ''}`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to generate compliance report', status: 'failed' };
      }
    },

    async check_contrast(args) {
      try {
        let htmlContent = args.htmlContent as string | undefined;
        const appId = args.appId as string | undefined;

        if (appId && !htmlContent) {
          const app = await prisma.playgroundApp.findUnique({
            where: { id: appId },
            select: { htmlContent: true, title: true },
          });
          if (!app) return { error: 'App not found', status: 'failed' };
          htmlContent = app.htmlContent;
        }

        if (!htmlContent) return { error: 'Provide htmlContent or appId to check', status: 'failed' };

        const { checkContrast } = await import('../../accessibility/contrast-checker');
        const result = checkContrast(htmlContent);

        if (result.passes) {
          return {
            status: 'passed',
            checkedPairs: result.checkedPairs,
            message: `All ${result.checkedPairs} color pairs pass WCAG AA contrast requirements.`,
          };
        }

        return {
          status: 'violations_found',
          passes: false,
          violationCount: result.violations.length,
          checkedPairs: result.checkedPairs,
          score: result.score,
          violations: result.violations.slice(0, 8).map((v) => ({
            element: v.element,
            ratio: `${v.ratio}:1`,
            required: `${v.requiredRatio}:1`,
            foreground: v.foreground,
            background: v.background,
            suggestedForeground: v.suggestion.adjustedForeground,
            suggestedBackground: v.suggestion.adjustedBackground,
          })),
          message: `${result.violations.length} contrast violation${result.violations.length !== 1 ? 's' : ''} found. ${result.violations.length > 0 ? `Worst: "${result.violations[0].element}" at ${result.violations[0].ratio}:1 (needs ${result.violations[0].requiredRatio}:1).` : ''}`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to check contrast', status: 'failed' };
      }
    },

    async accessibility_scan(args) {
      try {
        const materialId = args.materialId as string | undefined;
        const courseId = args.courseId as string | undefined;
        const text = args.text as string | undefined;

        // Bulk course scan
        if (courseId) {
          const { bulkScanCourse } = await import('../../accessibility/document-scanner');
          const result = await bulkScanCourse(courseId);

          const gradeBreakdown = Object.entries(result.grades)
            .filter(([, count]) => count > 0)
            .map(([grade, count]) => `${grade}: ${count}`)
            .join(', ');

          return {
            status: 'scanned',
            scanned: result.scanned,
            avgScore: result.avgScore,
            gradeDistribution: result.grades,
            materials: result.materials.slice(0, 8).map((m) => ({
              title: m.title,
              grade: m.grade,
              issues: m.issueCount,
              autoFixable: m.autoFixable,
            })),
            message: result.scanned === 0
              ? 'No materials found to scan in this course.'
              : `Scanned ${result.scanned} materials. Grades: ${gradeBreakdown}. Average score: ${Math.round(result.avgScore * 100)}%. Total auto-fixable issues: ${result.materials.reduce((s, m) => s + m.autoFixable, 0)}.`,
          };
        }

        // Single material scan
        if (materialId) {
          const mat = await prisma.courseMaterial.findUnique({
            where: { id: materialId },
            select: { content: true, title: true },
          });
          if (!mat) return { error: 'Material not found', status: 'failed' };

          const { scanAndPersist } = await import('../../accessibility/document-scanner');
          const result = await scanAndPersist('course_material', materialId, mat.content, {
            filename: mat.title,
          });

          const criticalIssues = result.issues.filter((i) => i.severity === 'critical');
          const majorIssues = result.issues.filter((i) => i.severity === 'major');

          return {
            status: 'scanned',
            title: mat.title,
            grade: result.overallGrade,
            score: result.overallScore,
            totalIssues: result.issues.length,
            critical: criticalIssues.length,
            major: majorIssues.length,
            autoFixable: result.autoFixable,
            topIssues: result.issues.slice(0, 5).map((i) => ({
              type: i.type,
              severity: i.severity,
              description: i.description,
              wcag: i.wcagCriteria,
              suggestion: i.suggestion,
            })),
            structure: {
              headings: result.structure.headings.length,
              tables: result.structure.tables.length,
              images: result.structure.images.length,
              links: result.structure.links.length,
            },
            readability: {
              grade: result.readability.overallGrade,
              gradeLevel: result.readability.fleschKincaid,
            },
            message: `"${mat.title}" scored ${result.overallGrade} (${Math.round(result.overallScore * 100)}%). ${result.issues.length} issues found (${criticalIssues.length} critical, ${majorIssues.length} major). ${result.autoFixable} can be auto-fixed.`,
          };
        }

        // Freetext scan
        if (text) {
          const { scanDocument } = await import('../../accessibility/document-scanner');
          const result = await scanDocument(text, { filename: 'text' });
          return {
            status: 'scanned',
            grade: result.overallGrade,
            score: result.overallScore,
            totalIssues: result.issues.length,
            autoFixable: result.autoFixable,
            topIssues: result.issues.slice(0, 5).map((i) => ({
              type: i.type,
              severity: i.severity,
              description: i.description,
              suggestion: i.suggestion,
            })),
            message: `Accessibility scan: ${result.overallGrade} (${Math.round(result.overallScore * 100)}%). ${result.issues.length} issues found.`,
          };
        }

        return { error: 'Provide materialId, courseId, or text to scan', status: 'failed' };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to scan document', status: 'failed' };
      }
    },

    async check_readability(args) {
      try {
        const toolId = args.toolId as string | undefined;
        const courseId = args.courseId as string | undefined;
        const simplify = (args.simplify as boolean) ?? false;

        // Bulk course scan mode
        if (courseId) {
          const { bulkScanCourseReadability } = await import('../../accessibility/readability-service');
          const result = await bulkScanCourseReadability(courseId);

          const gradeBreakdown = Object.entries(result.grades)
            .filter(([, count]) => count > 0)
            .map(([grade, count]) => `${grade}: ${count}`)
            .join(', ');

          return {
            status: 'scanned',
            scanned: result.scanned,
            avgScore: result.avgScore,
            gradeDistribution: result.grades,
            worstMaterials: result.materials.slice(0, 5).map((m) => ({
              title: m.title,
              grade: m.grade,
              gradeLevel: m.fleschKincaid,
            })),
            message: result.scanned === 0
              ? 'No materials found to scan in this course.'
              : `Scanned ${result.scanned} materials. Grade distribution: ${gradeBreakdown}. Average readability score: ${Math.round(result.avgScore * 100)}%.`,
          };
        }

        // Tool systemPrompt mode
        let text = args.text as string | undefined;
        if (toolId && !text) {
          const tool = await prisma.tool.findUnique({
            where: { id: toolId },
            select: { name: true, systemPrompt: true },
          });
          if (!tool) return { error: 'Tool not found', status: 'failed' };
          text = tool.systemPrompt ?? undefined;
        }

        if (!text) return { error: 'Provide text, toolId, or courseId to analyze', status: 'failed' };

        const { analyzeReadability, suggestSimplification } = await import('../../accessibility/readability-service');
        const result = analyzeReadability(text);

        const response: Record<string, unknown> = {
          status: 'analyzed',
          grade: result.overallGrade,
          gradeLevel: result.fleschKincaid,
          readingEase: result.fleschReadingEase,
          wordCount: result.wordCount,
          avgSentenceLength: result.avgSentenceLength,
          passiveVoicePercent: result.passiveVoicePercent,
          jargonCount: result.jargonTerms.length,
          longSentenceCount: result.longSentences.length,
          summary: result.summary,
          message: `Readability: ${result.summary}`,
        };

        if (result.jargonTerms.length > 0) {
          response.topJargon = result.jargonTerms.slice(0, 5).map((j) => `${j.term} → ${j.suggestion}`);
        }

        if (simplify && (result.overallGrade === 'C' || result.overallGrade === 'D' || result.overallGrade === 'F')) {
          const simplified = await suggestSimplification(text);
          const simplifiedResult = analyzeReadability(simplified);
          response.simplified = {
            text: simplified.slice(0, 2000),
            newGrade: simplifiedResult.overallGrade,
            newGradeLevel: simplifiedResult.fleschKincaid,
          };
          response.message += ` AI-simplified version: Grade ${simplifiedResult.overallGrade} (${Math.round(simplifiedResult.fleschKincaid)} reading level).`;
        }

        return response;
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to analyze readability', status: 'failed' };
      }
    },

    async generate_alt_text(args) {
      try {
        const mode = (args.mode as string) ?? 'bulk';

        if (mode === 'single') {
          const imageUrl = args.imageUrl as string;
          const toolId = args.toolId as string | undefined;
          if (!imageUrl) return { error: 'imageUrl is required for single mode', status: 'failed' };

          const { generateAltText, saveAltText } = await import('../../accessibility/alt-text-service');
          const result = await generateAltText(imageUrl, args.context as string | undefined);

          // Auto-save to tool if toolId provided and confidence is high
          if (toolId && result.confidence >= 0.8) {
            await saveAltText('tool', toolId, result.isDecorative ? '' : result.altText);
          }

          return {
            status: 'generated',
            altText: result.isDecorative ? '(decorative)' : result.altText,
            longDescription: result.longDescription,
            confidence: result.confidence,
            category: result.category,
            isDecorative: result.isDecorative,
            saved: !!(toolId && result.confidence >= 0.8),
            message: result.isDecorative
              ? 'Image identified as decorative — empty alt text is correct per WCAG.'
              : `Alt text generated: "${result.altText}" (${Math.round(result.confidence * 100)}% confidence)`,
          };
        }

        // Bulk mode — scan all tools missing alt text
        const { bulkGenerateToolAltText } = await import('../../accessibility/alt-text-service');
        const summary = await bulkGenerateToolAltText();

        return {
          status: 'completed',
          scanned: summary.scanned,
          generated: summary.generated,
          failed: summary.failed,
          results: summary.results.slice(0, 10), // Cap results for readability
          message: summary.scanned === 0
            ? 'All tool thumbnails already have alt text — nothing to scan.'
            : `Scanned ${summary.scanned} thumbnails: ${summary.generated} alt texts generated, ${summary.failed} failed. High-confidence results saved automatically.`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to generate alt text', status: 'failed' };
      }
    },
  },
};
