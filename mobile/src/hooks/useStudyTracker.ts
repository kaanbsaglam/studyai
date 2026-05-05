import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../lib/api';

const HEARTBEAT_INTERVAL = 30_000;
const BLUR_RESTART_THRESHOLD = 120_000;

export function useStudyTracker(classroomId: string, activityType = 'DOCUMENT') {
  const sessionIdRef = useRef<string | null>(null);
  const activeRef = useRef(true);
  const lastHeartbeatRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigation = useNavigation();

  const startSession = useCallback(async () => {
    if (!classroomId) return;
    try {
      const res = await api.post<{ success: boolean; data: { sessionId: string } }>(
        '/study-sessions/start',
        { classroomId, activityType },
      );
      sessionIdRef.current = res.data.data.sessionId;
      lastHeartbeatRef.current = Date.now();
    } catch {
      // silently fail — never disrupt the user
    }
  }, [classroomId, activityType]);

  const sendHeartbeat = useCallback(async () => {
    if (!sessionIdRef.current || !activeRef.current) return;
    try {
      await api.patch(`/study-sessions/${sessionIdRef.current}/heartbeat`);
      lastHeartbeatRef.current = Date.now();
    } catch (e: any) {
      if (e?.response?.status === 404) {
        sessionIdRef.current = null;
        startSession();
      }
    }
  }, [startSession]);

  const endSession = useCallback(async () => {
    if (!sessionIdRef.current) return;
    const id = sessionIdRef.current;
    sessionIdRef.current = null;
    try {
      await api.patch(`/study-sessions/${id}/end`);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    startSession();

    intervalRef.current = setInterval(() => {
      if (activeRef.current) sendHeartbeat();
    }, HEARTBEAT_INTERVAL);

    // App goes to background / foreground
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const away = Date.now() - lastHeartbeatRef.current;
        activeRef.current = true;
        if (away > BLUR_RESTART_THRESHOLD) {
          endSession().then(() => startSession());
        } else {
          sendHeartbeat();
        }
      } else {
        // background or inactive
        activeRef.current = false;
        sendHeartbeat();
      }
    });

    // Screen loses navigation focus (user navigates away)
    const unsubBlur = navigation.addListener('blur', () => {
      activeRef.current = false;
      sendHeartbeat();
    });

    const unsubFocus = navigation.addListener('focus', () => {
      const away = Date.now() - lastHeartbeatRef.current;
      activeRef.current = true;
      if (away > BLUR_RESTART_THRESHOLD) {
        endSession().then(() => startSession());
      } else {
        sendHeartbeat();
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      appStateSub.remove();
      unsubBlur();
      unsubFocus();
      endSession();
    };
  }, [startSession, sendHeartbeat, endSession, navigation]);
}
