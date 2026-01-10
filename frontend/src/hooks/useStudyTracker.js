import { useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';

/**
 * Custom hook for tracking study time.
 *
 * Features:
 * - Starts a session when component mounts
 * - Sends heartbeats every 30 seconds while tab is focused
 * - Pauses tracking when tab loses focus
 * - Ends session on unmount or extended blur (2+ minutes)
 * - Uses fetch with keepalive for reliable session end on page close
 *
 * @param {string} classroomId - The classroom ID (required)
 * @param {string} activityType - The activity type: 'DOCUMENT', 'CHAT', 'FLASHCARDS', 'QUIZ', 'SUMMARY', 'NOTES'
 * @param {string} [documentId] - The document ID (optional, only for DOCUMENT activity)
 */
export function useStudyTracker(classroomId, activityType = 'DOCUMENT', documentId = null) {
  const sessionIdRef = useRef(null);
  const isFocusedRef = useRef(!document.hidden);
  const lastHeartbeatRef = useRef(Date.now());
  const heartbeatIntervalRef = useRef(null);

  const startSession = useCallback(async () => {
    if (!classroomId) return;

    try {
      const payload = {
        classroomId,
        activityType,
      };
      if (documentId) {
        payload.documentId = documentId;
      }

      const response = await api.post('/study-sessions/start', payload);
      sessionIdRef.current = response.data.data.sessionId;
      lastHeartbeatRef.current = Date.now();
    } catch (err) {
      // Silently fail - don't disrupt user experience for tracking
      console.error('Failed to start study session:', err);
    }
  }, [classroomId, activityType, documentId]);

  const sendHeartbeat = useCallback(async () => {
    if (!sessionIdRef.current || !isFocusedRef.current) return;

    try {
      await api.patch(`/study-sessions/${sessionIdRef.current}/heartbeat`);
      lastHeartbeatRef.current = Date.now();
    } catch (err) {
      // Session might have been auto-ended or expired
      if (err.response?.status === 404) {
        sessionIdRef.current = null;
        // Try to start a new session
        startSession();
      }
    }
  }, [startSession]);

  const endSession = useCallback(async () => {
    if (!sessionIdRef.current) return;

    const sessionId = sessionIdRef.current;
    sessionIdRef.current = null;

    try {
      await api.patch(`/study-sessions/${sessionId}/end`);
    } catch (err) {
      // Session might already be ended, ignore
      console.error('Failed to end study session:', err);
    }
  }, []);

  // Use fetch with keepalive for reliable delivery on page close
  const endSessionBeacon = useCallback(() => {
    if (!sessionIdRef.current) return;

    const url = `${api.defaults.baseURL}/study-sessions/${sessionIdRef.current}/end`;
    const token = localStorage.getItem('token');

    fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({}),
      keepalive: true,
    }).catch(() => {
      // Ignore errors on page unload
    });

    sessionIdRef.current = null;
  }, []);

  useEffect(() => {
    // Start session on mount
    startSession();

    // Set up heartbeat interval (every 30 seconds)
    heartbeatIntervalRef.current = setInterval(() => {
      if (isFocusedRef.current) {
        sendHeartbeat();
      }
    }, 30000);

    // Handle visibility change (tab focus/blur)
    const handleVisibilityChange = () => {
      const wasHidden = !isFocusedRef.current;
      isFocusedRef.current = !document.hidden;

      if (document.hidden) {
        // Tab lost focus - send immediate heartbeat to capture time
        sendHeartbeat();
      } else if (wasHidden) {
        // Tab regained focus
        const blurDuration = Date.now() - lastHeartbeatRef.current;

        if (blurDuration > 120000) {
          // Was blurred for more than 2 minutes - start new session
          endSession().then(() => startSession());
        } else {
          // Resume with heartbeat
          sendHeartbeat();
        }
      }
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      endSessionBeacon();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on unmount
    return () => {
      clearInterval(heartbeatIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      endSession();
    };
  }, [startSession, sendHeartbeat, endSession, endSessionBeacon]);

  // No return value - this hook just manages side effects
  return null;
}
