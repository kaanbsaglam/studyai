import { useState, useEffect } from "react";

export function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      alert("Time is up!");
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-white p-6 rounded shadow text-center mb-6">
      <h3 className="font-bold text-lg mb-2">Pomodoro Timer</h3>
      <div className="text-4xl font-mono mb-4">{formatTime(timeLeft)}</div>
      <div className="space-x-2">
        <button onClick={() => setIsRunning(!isRunning)} className="px-4 py-2 bg-indigo-600 text-white rounded">
          {isRunning ? "Pause" : "Start"}
        </button>
        <button onClick={() => { setIsRunning(false); setTimeLeft(25 * 60); }} className="px-4 py-2 bg-gray-300 rounded">
          Reset
        </button>
      </div>
    </div>
  );
}

export function Notebook() {
  const [note, setNote] = useState(localStorage.getItem("studyai_note") || "");

  const handleChange = (e) => {
    setNote(e.target.value);
    localStorage.setItem("studyai_note", e.target.value);
  };

  return (
    <div className="bg-white p-4 rounded shadow h-full flex flex-col">
      <h3 className="font-bold mb-2">Quick Notes</h3>
      <textarea
        className="w-full flex-1 p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Type your notes here... (Auto-saved)"
        value={note}
        onChange={handleChange}
        style={{ minHeight: "200px" }}
      />
    </div>
  );
}