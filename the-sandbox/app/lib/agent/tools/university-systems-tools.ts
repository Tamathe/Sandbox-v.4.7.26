/**
 * Sandy Universal Agent — University Systems Integration Hub Tools
 *
 * P0 (3): get_attendance_summary, check_enrollment_changes, search_travel_grants, get_my_reimbursements
 * P1 (6): book_room, log_attendance, submit_grades_to_sis, start_reimbursement,
 *          update_department_website, review_paper
 *
 * Wraps university-systems-service for Banner/SIS, 25Live rooms, attendance,
 * travel reimbursement, grants, department website, and paper review.
 */

import type { ToolModule } from '../agent-types';
import {
  searchAvailableRooms,
  bookRoom,
  logAttendance,
  getAttendanceSummary,
  submitGradesToSIS,
  checkEnrollmentChanges,
  createTravelReimbursement,
  getUserReimbursements,
  searchTravelGrants,
  matchGrantsToTrip,
  submitWebsiteChangeRequest,
  getUserChangeRequests,
  createPaperReview,
  getFacultyPaperReviews,
  analyzePaperStructure,
  generateReimbursementForm,
} from '../../university-systems-service';

export const universitySystemsTools: ToolModule = {
  tools: [
    // ── P1 Tools ──────────────────────────────────────────────────
    {
      name: 'book_room',
      description:
        'Search for and book available classrooms/meeting rooms on campus. Returns a list of available rooms matching the criteria for the requested date and time.',
      category: 'campus',
      permission: 'confirm',
      roles: ['EDUCATOR', 'ADMIN', 'STAFF', 'STUDENT', 'REGISTRAR'],
      reliability: 'seeded',
      input_schema: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date to search for availability (ISO format, e.g. "2026-04-01")',
          },
          startTime: {
            type: 'string',
            description: 'Start time (e.g. "09:00" or "14:30")',
          },
          endTime: {
            type: 'string',
            description: 'End time (e.g. "10:00" or "16:00")',
          },
          capacity: {
            type: 'number',
            description: 'Minimum room capacity needed (optional)',
          },
          building: {
            type: 'string',
            description: 'Preferred building name (optional, e.g. "White Hall")',
          },
        },
        required: ['date', 'startTime', 'endTime'],
      },
    },
    {
      name: 'log_attendance',
      description:
        'Log attendance for a course session. Records each student as present, absent, excused, or late for a given date.',
      category: 'campus',
      permission: 'confirm',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: {
            type: 'string',
            description: 'The course ID to log attendance for',
          },
          records: {
            type: 'array',
            description: 'Array of attendance records',
            items: {
              type: 'object',
              properties: {
                studentId: {
                  type: 'string',
                  description: 'Student user ID',
                },
                status: {
                  type: 'string',
                  description: 'Attendance status: PRESENT, ABSENT, EXCUSED, or LATE',
                },
              },
              required: ['studentId', 'status'],
            },
          },
          date: {
            type: 'string',
            description: 'Date of the session (ISO format). Defaults to today if omitted.',
          },
        },
        required: ['courseId', 'records'],
      },
    },

    // ── P0 Tools ──────────────────────────────────────────────────
    {
      name: 'get_attendance_summary',
      description:
        'Get attendance summary and risk flags for a course. Shows per-student attendance rates and highlights students with concerning absence patterns.',
      category: 'campus',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: {
            type: 'string',
            description: 'The course ID to get attendance summary for',
          },
        },
        required: ['courseId'],
      },
    },

    // ── P1 Tools ──────────────────────────────────────────────────
    {
      name: 'submit_grades_to_sis',
      description:
        'Submit final grades to the Student Information System (Banner). Sends grade data for each student in a course to the university registrar system.',
      category: 'campus',
      permission: 'confirm',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: {
            type: 'string',
            description: 'The course ID to submit grades for',
          },
          grades: {
            type: 'array',
            description: 'Array of student grades to submit',
            items: {
              type: 'object',
              properties: {
                studentId: {
                  type: 'string',
                  description: 'Student user ID',
                },
                grade: {
                  type: 'string',
                  description: 'Letter grade (e.g. "A", "B+", "C-", "F", "W", "I")',
                },
              },
              required: ['studentId', 'grade'],
            },
          },
        },
        required: ['courseId', 'grades'],
      },
    },

    // ── P0 Tools ──────────────────────────────────────────────────
    {
      name: 'check_enrollment_changes',
      description:
        'Check for enrollment changes (dropped/added students) in a course. Returns recent add/drop activity so instructors stay informed about roster changes.',
      category: 'campus',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: {
            type: 'string',
            description: 'The course ID to check enrollment changes for',
          },
        },
        required: ['courseId'],
      },
    },

    // ── P1 Tools ──────────────────────────────────────────────────
    {
      name: 'start_reimbursement',
      description:
        'Start a travel reimbursement request. Creates a draft reimbursement with trip details and expense items that can be submitted for approval.',
      category: 'campus',
      permission: 'confirm',
      roles: ['EDUCATOR', 'ADMIN', 'STAFF', 'STUDENT', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          tripPurpose: {
            type: 'string',
            description: 'Purpose of the trip (e.g. "conference", "research", "workshop", "other")',
          },
          destination: {
            type: 'string',
            description: 'Travel destination (e.g. "San Francisco, CA")',
          },
          startDate: {
            type: 'string',
            description: 'Trip start date (ISO format)',
          },
          endDate: {
            type: 'string',
            description: 'Trip end date (ISO format)',
          },
          expenses: {
            type: 'array',
            description: 'Array of expense items',
            items: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Expense category (e.g. "airfare", "hotel", "meals", "registration", "ground-transport")',
                },
                description: {
                  type: 'string',
                  description: 'Description of the expense',
                },
                amount: {
                  type: 'number',
                  description: 'Amount in USD',
                },
              },
              required: ['category', 'description', 'amount'],
            },
          },
          fundingSource: {
            type: 'string',
            description: 'Funding source (e.g. "grant", "department", "professional-development"). Optional.',
          },
        },
        required: ['tripPurpose', 'destination', 'startDate', 'endDate', 'expenses'],
      },
    },

    // ── P0 Tools ──────────────────────────────────────────────────
    {
      name: 'search_travel_grants',
      description:
        'Search for conference travel grant opportunities. Can match grants to a specific trip description or browse available grants by category.',
      category: 'campus',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN', 'STAFF', 'STUDENT', 'REGISTRAR'],
      reliability: 'seeded',
      input_schema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Grant category filter (e.g. "conference", "research", "professional-development")',
          },
          tripDescription: {
            type: 'string',
            description: 'Describe your trip to find matching grants (e.g. "Attending ACM SIGCHI 2026 in Montreal to present a paper on AI in education")',
          },
        },
        required: [],
      },
    },

    // ── P1 Tools ──────────────────────────────────────────────────
    {
      name: 'update_department_website',
      description:
        'Submit a change request for your department website profile. Updates to office hours, bio, publications, or research sections are routed for approval.',
      category: 'campus',
      permission: 'confirm',
      roles: ['EDUCATOR', 'ADMIN', 'STAFF'],
      input_schema: {
        type: 'object',
        properties: {
          section: {
            type: 'string',
            description: 'Section to update: "office_hours", "bio", "publications", or "research"',
          },
          newContent: {
            type: 'string',
            description: 'The new content for the section',
          },
          pageUrl: {
            type: 'string',
            description: 'URL of the department page to update (optional)',
          },
          currentContent: {
            type: 'string',
            description: 'Current content being replaced (optional, for diff tracking)',
          },
        },
        required: ['section', 'newContent'],
      },
    },
    {
      name: 'review_paper',
      description:
        'Start or continue reviewing an academic paper with AI assistance. Can create a new review, analyze paper structure, or list existing reviews.',
      category: 'campus',
      permission: 'confirm',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Paper title (for creating a new review)',
          },
          authors: {
            type: 'string',
            description: 'Paper authors (for creating a new review)',
          },
          source: {
            type: 'string',
            description: 'Source type: "journal", "dissertation", "colleague", or "conference"',
          },
          venue: {
            type: 'string',
            description: 'Journal or conference name (optional)',
          },
          dueDate: {
            type: 'string',
            description: 'Review due date (ISO format, optional)',
          },
          paperContent: {
            type: 'string',
            description: 'Paper content text for AI structural analysis (optional)',
          },
          reviewId: {
            type: 'string',
            description: 'Existing review ID to continue or analyze (optional)',
          },
        },
        required: [],
      },
    },

    // ── P0 Tools ──────────────────────────────────────────────────
    {
      name: 'get_my_reimbursements',
      description:
        'View your travel reimbursement requests and their status. Shows all submitted, pending, approved, and paid reimbursements.',
      category: 'campus',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN', 'STAFF', 'STUDENT', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ],

  handlers: {
    // ── book_room ─────────────────────────────────────────────────
    async book_room(args) {
      try {
        const date = args.date as string;
        const startTime = args.startTime as string;
        const endTime = args.endTime as string;
        const capacity = args.capacity as number | undefined;
        const building = args.building as string | undefined;

        const rooms = await searchAvailableRooms({
          date,
          startTime,
          endTime,
          capacity,
          building,
        });

        return {
          date,
          startTime,
          endTime,
          capacity: capacity ?? '(any)',
          building: building ?? '(any)',
          resultCount: rooms.length,
          rooms,
          message: rooms.length > 0
            ? `Found ${rooms.length} available room(s) on ${date} from ${startTime} to ${endTime}.`
            : `No available rooms found for the requested time and criteria.`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to search rooms', status: 'failed' };
      }
    },

    // ── log_attendance ────────────────────────────────────────────
    async log_attendance(args, user) {
      try {
        const courseId = args.courseId as string;
        const records = args.records as Array<{ studentId: string; status: string }>;
        const date = (args.date as string) ?? new Date().toISOString().slice(0, 10);

        const result = await logAttendance(
          courseId,
          user.id,
          records as Array<{ studentId: string; status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE' }>,
          date,
        );

        return {
          ...result,
          message: `Logged attendance for ${records.length} student(s) on ${date}.`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to log attendance', status: 'failed' };
      }
    },

    // ── get_attendance_summary ────────────────────────────────────
    async get_attendance_summary(args) {
      try {
        const courseId = args.courseId as string;
        const summary = await getAttendanceSummary(courseId);

        return { ...summary };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to get attendance summary', status: 'failed' };
      }
    },

    // ── submit_grades_to_sis ──────────────────────────────────────
    async submit_grades_to_sis(args, user) {
      try {
        const courseId = args.courseId as string;
        const grades = args.grades as Array<{ studentId: string; grade: string }>;

        const result = await submitGradesToSIS(courseId, grades);

        return {
          ...result,
          message: `Submitted ${grades.length} grade(s) to Banner SIS for processing.`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to submit grades to SIS', status: 'failed' };
      }
    },

    // ── check_enrollment_changes ──────────────────────────────────
    async check_enrollment_changes(args) {
      try {
        const courseId = args.courseId as string;
        const changes = await checkEnrollmentChanges(courseId);

        return { ...changes };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to check enrollment changes', status: 'failed' };
      }
    },

    // ── start_reimbursement ───────────────────────────────────────
    async start_reimbursement(args, user) {
      try {
        const tripPurpose = args.tripPurpose as string;
        const destination = args.destination as string;
        const startDate = args.startDate as string;
        const endDate = args.endDate as string;
        const expenses = args.expenses as Array<{ category: string; description: string; amount: number }>;
        const fundingSource = args.fundingSource as string | undefined;

        const result = await createTravelReimbursement(user.id, {
          tripPurpose,
          destination,
          startDate,
          endDate,
          expenses,
          fundingSource,
        });

        return {
          ...result,
          message: `Travel reimbursement request created for ${destination} (${startDate} to ${endDate}).`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to create reimbursement', status: 'failed' };
      }
    },

    // ── search_travel_grants ──────────────────────────────────────
    async search_travel_grants(args) {
      try {
        const category = args.category as string | undefined;
        const tripDescription = args.tripDescription as string | undefined;

        if (tripDescription) {
          const matches = await matchGrantsToTrip(tripDescription);
          return {
            tripDescription,
            resultCount: matches.grants.length,
            grants: matches.grants,
            matchReasons: matches.matchReasons,
            message: `Found ${matches.grants.length} grant(s) matching your trip.`,
          };
        }

        const grants = await searchTravelGrants(category ? { category } : undefined);
        return {
          category: category ?? '(all)',
          resultCount: grants.length,
          grants,
          message: `Found ${grants.length} active travel grant(s).`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to search travel grants', status: 'failed' };
      }
    },

    // ── update_department_website ─────────────────────────────────
    async update_department_website(args, user) {
      try {
        const section = args.section as string;
        const newContent = args.newContent as string;
        const pageUrl = args.pageUrl as string | undefined;
        const currentContent = args.currentContent as string | undefined;

        const result = await submitWebsiteChangeRequest(user.id, {
          section,
          newContent,
          pageUrl,
          currentContent,
        });

        return {
          ...result,
          message: `Website change request submitted for "${section}" section. It will be reviewed by your department web editor.`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to submit website change request', status: 'failed' };
      }
    },

    // ── review_paper ──────────────────────────────────────────────
    async review_paper(args, user) {
      try {
        const reviewId = args.reviewId as string | undefined;
        const paperContent = args.paperContent as string | undefined;
        const title = args.title as string | undefined;
        const authors = args.authors as string | undefined;
        const source = args.source as string | undefined;
        const venue = args.venue as string | undefined;
        const dueDate = args.dueDate as string | undefined;

        // Case 1: Analyze structure of an existing review
        if (reviewId && paperContent) {
          const analysis = await analyzePaperStructure(reviewId, paperContent);
          return {
            ...analysis,
            message: 'Structural analysis complete. Key sections and methodology identified.',
          };
        }

        // Case 2: Create a new review
        if (title && authors && source) {
          const review = await createPaperReview(user.id, {
            title,
            authors,
            source,
            venue,
            dueDate,
          });
          return {
            ...review,
            message: `Paper review created for "${title}". You can add structural analysis by providing paper content later.`,
          };
        }

        // Case 3: List existing reviews
        const reviews = await getFacultyPaperReviews(user.id);
        return {
          resultCount: reviews.length,
          reviews,
          message: reviews.length > 0
            ? `You have ${reviews.length} paper review(s).`
            : 'No paper reviews found. You can create one by providing a title, authors, and source.',
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to process paper review', status: 'failed' };
      }
    },

    // ── get_my_reimbursements ─────────────────────────────────────
    async get_my_reimbursements(_args, user) {
      try {
        const reimbursements = await getUserReimbursements(user.id);
        return {
          resultCount: reimbursements.length,
          reimbursements,
          message: reimbursements.length > 0
            ? `You have ${reimbursements.length} reimbursement request(s).`
            : 'No travel reimbursement requests found.',
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to get reimbursements', status: 'failed' };
      }
    },
  },
};
