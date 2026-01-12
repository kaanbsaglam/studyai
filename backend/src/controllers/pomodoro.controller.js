/**
 * Pomodoro Timer Controller
 *
 * Route handlers for pomodoro timer settings.
 */

const { asyncHandler } = require('../middleware/errorHandler');
const { updateSettingsSchema } = require('../validators/pomodoro.validator');
const pomodoroService = require('../services/pomodoro.service');

/**
 * Get user's pomodoro settings
 * GET /api/v1/pomodoro/settings
 */
const getSettings = asyncHandler(async (req, res) => {
  const settings = await pomodoroService.getSettings(req.user.id);

  res.json({
    success: true,
    data: {
      settings: {
        focusDuration: settings.focusDuration,
        shortBreakDuration: settings.shortBreakDuration,
        longBreakDuration: settings.longBreakDuration,
        sessionsBeforeLong: settings.sessionsBeforeLong,
        soundEnabled: settings.soundEnabled,
        autoStartBreaks: settings.autoStartBreaks,
      },
    },
  });
});

/**
 * Update user's pomodoro settings
 * PATCH /api/v1/pomodoro/settings
 */
const updateSettings = asyncHandler(async (req, res) => {
  const data = updateSettingsSchema.parse(req.body);

  const settings = await pomodoroService.updateSettings(req.user.id, data);

  res.json({
    success: true,
    data: {
      settings: {
        focusDuration: settings.focusDuration,
        shortBreakDuration: settings.shortBreakDuration,
        longBreakDuration: settings.longBreakDuration,
        sessionsBeforeLong: settings.sessionsBeforeLong,
        soundEnabled: settings.soundEnabled,
        autoStartBreaks: settings.autoStartBreaks,
      },
    },
  });
});

module.exports = {
  getSettings,
  updateSettings,
};
