import { Link } from 'react-router-dom';
import { useTimer } from '../../hooks/useTimer';

/**
 * Format seconds into MM:SS display
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get phase display label
 */
function getPhaseLabel(phase) {
  switch (phase) {
    case 'FOCUS':
      return 'Focus Session';
    case 'SHORT_BREAK':
      return 'Short Break';
    case 'LONG_BREAK':
      return 'Long Break';
    default:
      return 'Ready to Focus';
  }
}

export default function TimerPopover({ onClose }) {
  const {
    phase,
    timeRemaining,
    isRunning,
    sessionCount,
    settings,
    isIdle,
    isFocus,
    totalDuration,
    start,
    pause,
    resume,
    stop,
    skip,
  } = useTimer();

  // Calculate progress percentage
  const progress = totalDuration > 0 ? ((totalDuration - timeRemaining) / totalDuration) * 100 : 0;

  // Phase-specific colors
  const phaseColor = isFocus ? 'text-red-600' : 'text-green-600';
  const progressColor = isFocus ? 'bg-red-500' : 'bg-green-500';

  return (
    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${isIdle ? 'text-gray-600' : phaseColor}`}>
            {getPhaseLabel(phase)}
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Timer Display */}
      <div className="px-4 py-6 text-center">
        <div className={`text-5xl font-mono font-bold ${isIdle ? 'text-gray-400' : phaseColor}`}>
          {isIdle ? formatTime(settings.focusDuration * 60) : formatTime(timeRemaining)}
        </div>

        {/* Progress Bar */}
        {!isIdle && (
          <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${progressColor} transition-all duration-1000`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Session Counter */}
        {!isIdle && (
          <div className="mt-2 text-sm text-gray-500">
            Session {sessionCount} of {settings.sessionsBeforeLong}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 pb-4 flex justify-center gap-2">
        {isIdle ? (
          <button
            onClick={start}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Start Focus
          </button>
        ) : (
          <>
            {isRunning ? (
              <button
                onClick={pause}
                className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                title="Pause"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                </svg>
              </button>
            ) : (
              <button
                onClick={resume}
                className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                title="Resume"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
              </button>
            )}

            <button
              onClick={stop}
              className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              title="Stop"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>

            <button
              onClick={skip}
              className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              title="Skip to next phase"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Settings Link */}
      <div className="px-4 pb-3 border-t border-gray-100 pt-3">
        <Link
          to="/settings"
          onClick={onClose}
          className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Timer Settings
        </Link>
      </div>
    </div>
  );
}
