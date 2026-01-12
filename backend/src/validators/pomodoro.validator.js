/**
 * Pomodoro Timer Validators
 *
 * Zod schemas for validating pomodoro settings requests.
 */

const { z } = require('zod');

/**
 * Schema for updating pomodoro settings
 * All fields are optional - only provided fields will be updated
 */
const updateSettingsSchema = z.object({
  focusDuration: z
    .number()
    .int('Focus duration must be a whole number')
    .min(1, 'Focus duration must be at least 1 minute')
    .max(120, 'Focus duration cannot exceed 120 minutes')
    .optional(),
  shortBreakDuration: z
    .number()
    .int('Short break duration must be a whole number')
    .min(1, 'Short break must be at least 1 minute')
    .max(60, 'Short break cannot exceed 60 minutes')
    .optional(),
  longBreakDuration: z
    .number()
    .int('Long break duration must be a whole number')
    .min(1, 'Long break must be at least 1 minute')
    .max(60, 'Long break cannot exceed 60 minutes')
    .optional(),
  sessionsBeforeLong: z
    .number()
    .int('Sessions before long break must be a whole number')
    .min(1, 'Must have at least 1 session before long break')
    .max(10, 'Cannot exceed 10 sessions before long break')
    .optional(),
  soundEnabled: z
    .boolean()
    .optional(),
  autoStartBreaks: z
    .boolean()
    .optional(),
});

module.exports = {
  updateSettingsSchema,
};
