import { useState, useEffect } from "react";
import { FaPlay, FaPause, FaRedo } from "react-icons/fa";

export default function Pomodoro() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState("work"); // 'work' | 'break'

  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      // Play a simple browser notification sound or alert
      const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
      audio.play().catch(e => console.log("Audio play failed", e));
      alert(mode === "work" ? "Time for a break!" : "Back to work!");
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(mode === "work" ? 25 * 60 : 5 * 60);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(newMode === "work" ? 25 * 60 : 5 * 60);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-white rounded-xl shadow-sm border p-10">
      <h2 className="text-3xl font-bold mb-8 text-gray-700">Pomodoro Timer</h2>

      {/* Mode Toggles */}
      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => switchMode("work")}
          className={`px-6 py-2 rounded-full font-medium transition-colors ${
            mode === "work" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"
          }`}
        >
          Work (25m)
        </button>
        <button 
          onClick={() => switchMode("break")}
          className={`px-6 py-2 rounded-full font-medium transition-colors ${
            mode === "break" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
          }`}
        >
          Break (5m)
        </button>
      </div>

      {/* Timer Display */}
      <div className={`text-9xl font-mono mb-12 tracking-wider ${
        mode === "work" ? "text-gray-800" : "text-green-600"
      }`}>
        {formatTime(timeLeft)}
      </div>

      {/* Controls */}
      <div className="flex gap-6">
        <button 
          onClick={() => setIsRunning(!isRunning)}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl shadow-lg transition-transform hover:scale-110 active:scale-95 ${
            isRunning ? "bg-amber-500" : "bg-indigo-600"
          }`}
        >
          {isRunning ? <FaPause /> : <FaPlay className="ml-1" />}
        </button>

        <button 
          onClick={handleReset}
          className="w-16 h-16 rounded-full flex items-center justify-center bg-gray-200 text-gray-600 text-xl shadow hover:bg-gray-300 transition-transform hover:scale-110 active:scale-95"
        >
          <FaRedo />
        </button>
      </div>
    </div>
  );
}