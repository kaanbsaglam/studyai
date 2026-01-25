import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
// FIX: Changed 'FastickyNote' to 'FaStickyNote'
import { 
  FaBook, FaRobot, FaBrain, FaStickyNote, FaClock, FaBars, FaLayerGroup 
} from "react-icons/fa"; 
import ThemeToggle from "../components/ThemeToggle";

import DocumentManager from "../components/DocumentManager";
import RagChat from "../components/RagChat";
import QuizGenerator from "../components/QuizGenerator";
import Notebook from "../components/Notebook";
import Pomodoro from "../components/Pomodoro";
import FlashcardGenerator from "../components/FlashcardGenerator";

export default function Classroom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("documents");
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { id: "documents", label: "Documents", icon: <FaBook /> },
    { id: "chat", label: "AI Chat", icon: <FaRobot /> },
    { id: "quiz", label: "Quiz", icon: <FaBrain /> },
    { id: "flashcards", label: "Flashcards", icon: <FaLayerGroup /> },
    { id: "notes", label: "Notebook", icon: <FaStickyNote /> },
    { id: "timer", label: "Timer", icon: <FaClock /> },
  ];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden dark:bg-slate-900">
      
      {/* Sidebar */}
      <div className={`bg-white border-r transition-all duration-300 flex flex-col dark:bg-slate-900 dark:border-slate-800 ${isSidebarOpen ? "w-64" : "w-16"}`}>
        <div className="p-4 flex items-center justify-between border-b h-16 dark:border-slate-800">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-indigo-600 dark:text-indigo-300">StudyAI</span>
              <ThemeToggle />
            </div>
          )}
          {!isSidebarOpen && <ThemeToggle />}
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-gray-100 rounded text-gray-500 dark:text-slate-300 dark:hover:bg-slate-800">
            <FaBars />
          </button>
        </div>
        
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                activeTab === item.id 
                  ? "bg-indigo-50 text-indigo-600 font-medium dark:bg-indigo-900/40 dark:text-indigo-300" 
                  : "text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span className="text-xl min-w-[20px]">{item.icon}</span>
              {isSidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t dark:border-slate-800">
          <button 
            onClick={() => navigate("/")} 
            className={`flex items-center gap-3 text-sm text-gray-500 hover:text-red-500 transition-colors w-full p-2 rounded hover:bg-red-50 dark:text-slate-300 dark:hover:bg-red-900/20`}
          >
             <span>←</span>
             {isSidebarOpen && <span>Exit Classroom</span>}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto relative bg-gray-50 dark:bg-slate-950">
        <div className="p-8 max-w-6xl mx-auto h-full">
            {activeTab === "documents" && <DocumentManager classroomId={id} />}
            {activeTab === "chat" && <RagChat classroomId={id} />}
            {activeTab === "quiz" && <QuizGenerator classroomId={id} />}
            {activeTab === "flashcards" && <FlashcardGenerator classroomId={id} />}
            {activeTab === "notes" && <Notebook classroomId={id} />}
            {activeTab === "timer" && <Pomodoro />}
        </div>
      </main>
    </div>
  );
}