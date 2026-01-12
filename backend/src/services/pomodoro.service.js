/**
 * Pomodoro Timer Service
 *
 * Business logic for pomodoro timer settings.
 */

const prisma = require('../lib/prisma');

/**
 * Default pomodoro settings
 */
const DEFAULT_SETTINGS = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLong: 4,
  soundEnabled: true,
  autoStartBreaks: false,
};

/**
 * Get user's pomodoro settings, creating defaults if they don't exist
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Pomodoro settings
 */
async function getSettings(userId) {
  let settings = await prisma.pomodoroSettings.findUnique({
    where: { userId },
  });

  // Create default settings if none exist
  if (!settings) {
    settings = await prisma.pomodoroSettings.create({
      data: {
        userId,
        ...DEFAULT_SETTINGS,
      },
    });
  }

  return settings;
}

/**
 * Update user's pomodoro settings
 * @param {string} userId - User ID
 * @param {Object} data - Settings to update
 * @returns {Promise<Object>} Updated pomodoro settings
 */
async function updateSettings(userId, data) {
  // Ensure settings exist first
  await getSettings(userId);

  return prisma.pomodoroSettings.update({
    where: { userId },
    data,
  });
}

module.exports = {
  getSettings,
  updateSettings,
  DEFAULT_SETTINGS,
};
