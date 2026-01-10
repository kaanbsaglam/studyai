/**
 * Study Session Service
 *
 * Business logic for study time tracking and statistics.
 */

const prisma = require('../lib/prisma');

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
 */
async function getUserStats(userId, days = 90) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Get today's start for "today" calculation
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Get week start (Sunday) for "this week" calculation
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  // Fetch all sessions in the date range
  const sessions = await prisma.studySession.findMany({
    where: {
      userId,
      startedAt: { gte: startDate },
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
    const dateKey = sessionDate.toISOString().split('T')[0];

    // Accumulate daily totals
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + session.durationSeconds);

    // Today's total
    if (sessionDate >= todayStart) {
      todaySeconds += session.durationSeconds;
    }

    // This week's total
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
  const streak = await calculateStreak(userId);

  return {
    todaySeconds,
    weekSeconds,
    streak,
    dailyData,
  };
}

/**
 * Calculate user's current study streak (consecutive days with activity)
 */
async function calculateStreak(userId) {
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

  // Get unique dates
  const uniqueDates = new Set();
  for (const session of sessions) {
    const dateKey = session.startedAt.toISOString().split('T')[0];
    uniqueDates.add(dateKey);
  }

  const sortedDates = Array.from(uniqueDates).sort().reverse();

  // Check if today or yesterday has activity (streak must be current)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
    return 0; // Streak is broken
  }

  // Count consecutive days
  let streak = 0;
  let expectedDate = new Date(sortedDates[0]);

  for (const dateStr of sortedDates) {
    const date = new Date(dateStr);
    const expectedStr = expectedDate.toISOString().split('T')[0];

    if (dateStr === expectedStr) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      break; // Streak broken
    }
  }

  return streak;
}

/**
 * Get breakdown of study time for a specific day
 */
async function getDayBreakdown(userId, dateStr) {
  const date = new Date(dateStr);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const sessions = await prisma.studySession.findMany({
    where: {
      userId,
      startedAt: {
        gte: date,
        lt: nextDay,
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
 */
async function getClassroomStats(classroomId, days = 30) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const sessions = await prisma.studySession.findMany({
    where: {
      classroomId,
      startedAt: { gte: startDate },
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

    // Daily data
    const dateKey = session.startedAt.toISOString().split('T')[0];
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
