/**
 * Study Session Service
 *
 * Business logic for study time tracking and statistics.
 */

const prisma = require('../lib/prisma');

/**
 * Convert a UTC date to local date string (YYYY-MM-DD) using timezone offset.
 * @param {Date} utcDate - The UTC date
 * @param {number} tzOffset - Timezone offset in minutes (from getTimezoneOffset(), negative for UTC+)
 * @returns {string} Local date string in YYYY-MM-DD format
 */
function toLocalDateStr(utcDate, tzOffset = 0) {
  // getTimezoneOffset returns negative for UTC+ (ahead), positive for UTC- (behind)
  // To get local time: utcTime - offset * 60000
  const localTime = new Date(utcDate.getTime() - tzOffset * 60000);
  return localTime.toISOString().split('T')[0];
}

/**
 * Get the start of a local day in UTC
 * @param {Date} date - Reference date
 * @param {number} tzOffset - Timezone offset in minutes
 * @returns {Date} Start of local day as UTC Date
 */
function getLocalDayStart(date, tzOffset = 0) {
  const localDateStr = toLocalDateStr(date, tzOffset);
  // Parse as UTC midnight, then add offset to get UTC time of local midnight
  const utcMidnight = new Date(localDateStr + 'T00:00:00.000Z');
  return new Date(utcMidnight.getTime() + tzOffset * 60000);
}

/**
 * Create a new study session
 */
async function createSession({ userId, classroomId, documentId, classroomName, documentName, activityType }) {
  return prisma.studySession.create({
    data: {
      userId,
      classroomId,
      documentId: documentId || null,
      classroomName,
      documentName: documentName || null,
      activityType: activityType || 'DOCUMENT',
      startedAt: new Date(),
      durationSeconds: 0,
    },
  });
}

/**
 * Update session duration via heartbeat
 * Returns null if session not found or already ended
 */
async function updateSessionHeartbeat(sessionId, userId) {
  const session = await prisma.studySession.findUnique({
    where: { id: sessionId },
  });

  // Session not found or doesn't belong to user
  if (!session || session.userId !== userId) {
    return null;
  }

  // Session already ended
  if (session.endedAt) {
    return null;
  }

  // Calculate duration from start time to now
  const now = new Date();
  const durationSeconds = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);

  return prisma.studySession.update({
    where: { id: sessionId },
    data: { durationSeconds },
  });
}

/**
 * End a study session
 */
async function endSession(sessionId, userId) {
  const session = await prisma.studySession.findUnique({
    where: { id: sessionId },
  });

  // Session not found or doesn't belong to user
  if (!session || session.userId !== userId) {
    return null;
  }

  // Session already ended
  if (session.endedAt) {
    return session;
  }

  const now = new Date();
  const durationSeconds = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);

  return prisma.studySession.update({
    where: { id: sessionId },
    data: {
      endedAt: now,
      durationSeconds,
    },
  });
}

/**
 * Get user's overall study statistics
 * @param {string} userId - User ID
 * @param {number} days - Number of days to include (default 90)
 * @param {number} tzOffset - Timezone offset in minutes (default 0 for UTC)
 */
async function getUserStats(userId, days = 90, tzOffset = 0) {
  const now = new Date();

  // Calculate start date (days ago, start of local day)
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  const startOfRange = getLocalDayStart(startDate, tzOffset);

  // Get today's start in user's timezone
  const todayStart = getLocalDayStart(now, tzOffset);

  // Get week start (Sunday) in user's timezone
  const todayLocal = new Date(now.getTime() - tzOffset * 60000);
  const dayOfWeek = todayLocal.getUTCDay(); // 0 = Sunday
  const weekStartLocal = new Date(todayLocal);
  weekStartLocal.setUTCDate(todayLocal.getUTCDate() - dayOfWeek);
  weekStartLocal.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(weekStartLocal.getTime() + tzOffset * 60000);

  // Fetch all sessions in the date range
  const sessions = await prisma.studySession.findMany({
    where: {
      userId,
      startedAt: { gte: startOfRange },
    },
    select: {
      startedAt: true,
      durationSeconds: true,
    },
    orderBy: { startedAt: 'asc' },
  });

  // Calculate today's and this week's totals
  let todaySeconds = 0;
  let weekSeconds = 0;
  const dailyMap = new Map();

  for (const session of sessions) {
    const sessionDate = new Date(session.startedAt);
    // Convert session date to user's local date
    const dateKey = toLocalDateStr(sessionDate, tzOffset);

    // Accumulate daily totals
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + session.durationSeconds);

    // Today's total (session started after local midnight)
    if (sessionDate >= todayStart) {
      todaySeconds += session.durationSeconds;
    }

    // This week's total (session started after local Sunday midnight)
    if (sessionDate >= weekStart) {
      weekSeconds += session.durationSeconds;
    }
  }

  // Convert daily map to array
  const dailyData = Array.from(dailyMap.entries()).map(([date, seconds]) => ({
    date,
    seconds,
  }));

  // Calculate streak
  const streak = await calculateStreak(userId, tzOffset);

  return {
    todaySeconds,
    weekSeconds,
    streak,
    dailyData,
  };
}

/**
 * Calculate user's current study streak (consecutive days with activity)
 * @param {string} userId - User ID
 * @param {number} tzOffset - Timezone offset in minutes (default 0 for UTC)
 */
async function calculateStreak(userId, tzOffset = 0) {
  // Get distinct dates with study activity, ordered descending
  const sessions = await prisma.studySession.findMany({
    where: {
      userId,
      durationSeconds: { gt: 0 }, // Only count sessions with actual duration
    },
    select: { startedAt: true },
    orderBy: { startedAt: 'desc' },
  });

  if (sessions.length === 0) {
    return 0;
  }

  // Get unique dates in user's local timezone
  const uniqueDates = new Set();
  for (const session of sessions) {
    const dateKey = toLocalDateStr(session.startedAt, tzOffset);
    uniqueDates.add(dateKey);
  }

  const sortedDates = Array.from(uniqueDates).sort().reverse();

  // Check if today or yesterday has activity (streak must be current)
  const now = new Date();
  const todayStr = toLocalDateStr(now, tzOffset);

  // Calculate yesterday in user's timezone
  const todayLocal = new Date(now.getTime() - tzOffset * 60000);
  todayLocal.setUTCDate(todayLocal.getUTCDate() - 1);
  const yesterdayStr = todayLocal.toISOString().split('T')[0];

  if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
    return 0; // Streak is broken
  }

  // Count consecutive days
  let streak = 0;
  let expectedDate = new Date(sortedDates[0] + 'T12:00:00.000Z'); // Use noon to avoid DST issues

  for (const dateStr of sortedDates) {
    const expectedStr = expectedDate.toISOString().split('T')[0];

    if (dateStr === expectedStr) {
      streak++;
      expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);
    } else {
      break; // Streak broken
    }
  }

  return streak;
}

/**
 * Get breakdown of study time for a specific day
 * @param {string} userId - User ID
 * @param {string} dateStr - Local date string (YYYY-MM-DD)
 * @param {number} tzOffset - Timezone offset in minutes (default 0 for UTC)
 */
async function getDayBreakdown(userId, dateStr, tzOffset = 0) {
  // dateStr is in user's local timezone, convert to UTC range
  const localMidnight = new Date(dateStr + 'T00:00:00.000Z');
  // Add offset to get UTC time of local midnight
  const dayStart = new Date(localMidnight.getTime() + tzOffset * 60000);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const sessions = await prisma.studySession.findMany({
    where: {
      userId,
      startedAt: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
    select: {
      classroomId: true,
      classroomName: true,
      documentId: true,
      documentName: true,
      durationSeconds: true,
    },
  });

  // Group by classroom
  const classroomMap = new Map();

  for (const session of sessions) {
    const key = session.classroomId || session.classroomName; // Use name as fallback key

    if (!classroomMap.has(key)) {
      classroomMap.set(key, {
        id: session.classroomId,
        name: session.classroomName,
        isDeleted: !session.classroomId,
        totalSeconds: 0,
        documentsMap: new Map(),
      });
    }

    const classroom = classroomMap.get(key);
    classroom.totalSeconds += session.durationSeconds;

    // Group by document within classroom
    if (session.documentName) {
      const docKey = session.documentId || session.documentName;
      if (!classroom.documentsMap.has(docKey)) {
        classroom.documentsMap.set(docKey, {
          id: session.documentId,
          name: session.documentName,
          isDeleted: !session.documentId,
          seconds: 0,
        });
      }
      classroom.documentsMap.get(docKey).seconds += session.durationSeconds;
    }
  }

  // Convert to array format
  const classrooms = Array.from(classroomMap.values()).map((classroom) => ({
    id: classroom.id,
    name: classroom.name,
    isDeleted: classroom.isDeleted,
    totalSeconds: classroom.totalSeconds,
    documents: Array.from(classroom.documentsMap.values()).sort((a, b) => b.seconds - a.seconds),
  }));

  // Sort by total time
  classrooms.sort((a, b) => b.totalSeconds - a.totalSeconds);

  const totalSeconds = classrooms.reduce((sum, c) => sum + c.totalSeconds, 0);

  return {
    date: dateStr,
    totalSeconds,
    classrooms,
  };
}

/**
 * Get classroom-specific study statistics
 * @param {string} classroomId - Classroom ID
 * @param {number} days - Number of days to include (default 30)
 * @param {number} tzOffset - Timezone offset in minutes (default 0 for UTC)
 */
async function getClassroomStats(classroomId, days = 30, tzOffset = 0) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  const startOfRange = getLocalDayStart(startDate, tzOffset);

  const sessions = await prisma.studySession.findMany({
    where: {
      classroomId,
      startedAt: { gte: startOfRange },
    },
    select: {
      startedAt: true,
      durationSeconds: true,
      documentId: true,
      documentName: true,
    },
  });

  // Calculate totals and daily data
  let totalSeconds = 0;
  const dailyMap = new Map();
  const documentMap = new Map();

  for (const session of sessions) {
    totalSeconds += session.durationSeconds;

    // Daily data - use user's local timezone
    const dateKey = toLocalDateStr(session.startedAt, tzOffset);
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + session.durationSeconds);

    // Per-document data
    if (session.documentName) {
      const docKey = session.documentId || session.documentName;
      if (!documentMap.has(docKey)) {
        documentMap.set(docKey, {
          id: session.documentId,
          name: session.documentName,
          isDeleted: !session.documentId,
          seconds: 0,
        });
      }
      documentMap.get(docKey).seconds += session.durationSeconds;
    }
  }

  const dailyData = Array.from(dailyMap.entries()).map(([date, seconds]) => ({
    date,
    seconds,
  }));

  const documents = Array.from(documentMap.values()).sort((a, b) => b.seconds - a.seconds);

  return {
    totalSeconds,
    dailyData,
    documents,
  };
}

/**
 * Get a session by ID
 */
async function getSessionById(sessionId) {
  return prisma.studySession.findUnique({
    where: { id: sessionId },
  });
}

module.exports = {
  createSession,
  updateSessionHeartbeat,
  endSession,
  getUserStats,
  calculateStreak,
  getDayBreakdown,
  getClassroomStats,
  getSessionById,
};
