import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';

const TimerContext = createContext(null);

// Timer phases
const PHASES = {
  IDLE: 'IDLE',
  FOCUS: 'FOCUS',
  SHORT_BREAK: 'SHORT_BREAK',
  LONG_BREAK: 'LONG_BREAK',
};

// Default settings (used before fetching from backend)
const DEFAULT_SETTINGS = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLong: 4,
  soundEnabled: true,
  autoStartBreaks: false,
};

export function TimerProvider({ children }) {
  // Timer state
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(1);

  // Settings state
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Refs
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio('/sounds/timer-complete.mp3');
    audioRef.current.volume = 0.5;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/pomodoro/settings');
      setSettings(response.data.data.settings);
    } catch (err) {
      console.error('Failed to load timer settings:', err);
      // Keep default settings on error
    } finally {
      setSettingsLoading(false);
    }
  };

  // Play notification sound
  const playSound = useCallback(() => {
    if (settings.soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, [settings.soundEnabled]);

  // Get duration for a phase in seconds
  const getPhaseDuration = useCallback((phaseType) => {
    switch (phaseType) {
      case PHASES.FOCUS:
        return settings.focusDuration * 60;
      case PHASES.SHORT_BREAK:
        return settings.shortBreakDuration * 60;
      case PHASES.LONG_BREAK:
        return settings.longBreakDuration * 60;
      default:
        return 0;
    }
  }, [settings]);

  // Transition to next phase
  const transitionToNextPhase = useCallback(() => {
    playSound();

    if (phase === PHASES.FOCUS) {
      // After focus, go to break
      if (sessionCount >= settings.sessionsBeforeLong) {
        // Long break after completing all sessions
        setPhase(PHASES.LONG_BREAK);
        setTimeRemaining(getPhaseDuration(PHASES.LONG_BREAK));
        setSessionCount(1); // Reset session count
      } else {
        // Short break
        setPhase(PHASES.SHORT_BREAK);
        setTimeRemaining(getPhaseDuration(PHASES.SHORT_BREAK));
      }

      // Auto-start breaks if enabled
      if (settings.autoStartBreaks) {
        setIsRunning(true);
      } else {
        setIsRunning(false);
      }
    } else {
      // After break, go to focus
      setPhase(PHASES.FOCUS);
      setTimeRemaining(getPhaseDuration(PHASES.FOCUS));
      if (phase === PHASES.SHORT_BREAK) {
        setSessionCount((prev) => prev + 1);
      }
      setIsRunning(false); // Always pause after break
    }
  }, [phase, sessionCount, settings, getPhaseDuration, playSound]);

  // Timer tick effect
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            transitionToNextPhase();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, transitionToNextPhase]);

  // Actions
  const start = useCallback(() => {
    if (phase === PHASES.IDLE) {
      setPhase(PHASES.FOCUS);
      setTimeRemaining(getPhaseDuration(PHASES.FOCUS));
      setSessionCount(1);
    }
    setIsRunning(true);
  }, [phase, getPhaseDuration]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    setPhase(PHASES.IDLE);
    setTimeRemaining(0);
    setSessionCount(1);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const skip = useCallback(() => {
    if (phase !== PHASES.IDLE) {
      transitionToNextPhase();
    }
  }, [phase, transitionToNextPhase]);

  const updateSettings = useCallback(async (newSettings) => {
    try {
      const response = await api.patch('/pomodoro/settings', newSettings);
      setSettings(response.data.data.settings);
      return response.data.data.settings;
    } catch (err) {
      console.error('Failed to update timer settings:', err);
      throw err;
    }
  }, []);

  const value = {
    // State
    phase,
    timeRemaining,
    isRunning,
    sessionCount,
    settings,
    settingsLoading,

    // Computed
    isIdle: phase === PHASES.IDLE,
    isFocus: phase === PHASES.FOCUS,
    isBreak: phase === PHASES.SHORT_BREAK || phase === PHASES.LONG_BREAK,
    totalDuration: getPhaseDuration(phase),

    // Actions
    start,
    pause,
    resume,
    stop,
    skip,
    updateSettings,
    refreshSettings: fetchSettings,

    // Constants
    PHASES,
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}

export { PHASES };
