/**
 * Study Session Validators
 *
 * Zod schemas for validating study session requests.
 */

const { z } = require('zod');

/**
 * Valid activity types for study sessions
 */
const ACTIVITY_TYPES = ['DOCUMENT', 'CHAT', 'FLASHCARDS', 'QUIZ', 'SUMMARY', 'NOTES'];

/**
 * Schema for starting a new study session
 */
const startSessionSchema = z.object({
  classroomId: z
    .string({ required_error: 'Classroom ID is required' })
    .uuid('Invalid classroom ID'),
  documentId: z
    .string()
    .uuid('Invalid document ID')
    .optional(), // Optional - only required for DOCUMENT activity
  activityType: z
    .enum(ACTIVITY_TYPES, { required_error: 'Activity type is required' })
    .default('DOCUMENT'),
});

/**
 * Schema for heartbeat updates
 */
const heartbeatSchema = z.object({
  // Optional: could track focused seconds since last heartbeat
  focusedSeconds: z
    .number()
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(60, 'Cannot exceed heartbeat interval')
    .optional(),
});

/**
 * Schema for query parameters when fetching stats
 * tzOffset: Timezone offset in minutes from getTimezoneOffset() (negative for UTC+, positive for UTC-)
 */
const getStatsQuerySchema = z.object({
  days: z.coerce
    .number()
    .int('Days must be a whole number')
    .min(1, 'Must request at least 1 day')
    .max(365, 'Cannot exceed 365 days')
    .default(90),
  tzOffset: z.coerce
    .number()
    .int('Timezone offset must be a whole number')
    .min(-720, 'Invalid timezone offset') // UTC+12
    .max(840, 'Invalid timezone offset')  // UTC-14
    .default(0),
});

/**
 * Schema for getting stats for a specific day
 */
const getDayStatsSchema = z.object({
  date: z
    .string({ required_error: 'Date is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

/**
 * Schema for classroom-specific stats query
 */
const getClassroomStatsQuerySchema = z.object({
  days: z.coerce
    .number()
    .int('Days must be a whole number')
    .min(1, 'Must request at least 1 day')
    .max(365, 'Cannot exceed 365 days')
    .default(30),
  tzOffset: z.coerce
    .number()
    .int('Timezone offset must be a whole number')
    .min(-720, 'Invalid timezone offset')
    .max(840, 'Invalid timezone offset')
    .default(0),
});

module.exports = {
  startSessionSchema,
  heartbeatSchema,
  getStatsQuerySchema,
  getDayStatsSchema,
  getClassroomStatsQuerySchema,
};
