import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimer } from '../../hooks/useTimer';
import TimerPopover from './TimerPopover';

/**
 * Format seconds into MM:SS display
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function TimerPill() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const {
    phase,
    timeRemaining,
    isRunning,
    isIdle,
    isFocus,
    start,
  } = useTimer();

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Determine pill styling based on state
  const getPillStyle = () => {
    if (isIdle) {
      return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }
    if (isFocus) {
      return 'bg-red-100 text-red-700';
    }
    // Break
    return 'bg-green-100 text-green-700';
  };

  const handlePillClick = () => {
    if (isIdle) {
      // Start timer directly from idle state
      start();
    } else {
      // Toggle popover if timer is running
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handlePillClick}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors ${getPillStyle()}`}
      >
        {/* Tomato icon */}
        <span className="text-base">🍅</span>

        {isIdle ? (
          <span>{t('timer.start')}</span>
        ) : (
          <>
            <span className="font-mono">{formatTime(timeRemaining)}</span>
            {!isRunning && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
              </svg>
            )}
          </>
        )}
      </button>

      {/* Popover - only show when not idle and isOpen */}
      {!isIdle && isOpen && (
        <TimerPopover onClose={() => setIsOpen(false)} />
      )}
    </div>
  );
}
