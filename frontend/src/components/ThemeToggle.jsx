import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

export default function ThemeToggle({ className = "" }) {
  const { theme, setTheme } = useContext(ThemeContext);

  return (
    <div
      className={`gap-1 inline-flex items-center rounded-full border border-gray-500/50 bg-white p-1 text-sm shadow-sm ${className}`}
      role="group"
      aria-label="Theme selection"
    >
      {[
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
        { value: "system", label: "System" },
        { value: "earth", label: "Earth" },
      ].map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setTheme(option.value)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            theme === option.value
              ? "bg-white text-black border border-gray-500"
              : "bg-white text-black"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
