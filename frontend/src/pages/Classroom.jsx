import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import DocumentManager from "../components/DocumentManager";
import RagChat from "../components/RagChat";
import { PomodoroTimer, Notebook } from "../components/StudyTools";

export default function Classroom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("documents"); // documents | chat | tools

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="text-gray-500 hover:text-black">
            ← Back
          </button>
          <h1 className="text-xl font-bold">Classroom {id}</h1>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
          {["documents", "chat", "tools"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md capitalize text-sm font-medium transition-colors ${
                activeTab === tab 
                  ? "bg-white text-blue-600 shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        
        {activeTab === "documents" && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-4">Documents & AI Generation</h2>
            <DocumentManager classroomId={id} />
          </div>
        )}

        {activeTab === "chat" && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-4">Chat with your Documents (RAG)</h2>
            <RagChat classroomId={id} />
          </div>
        )}

        {activeTab === "tools" && (
          <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <PomodoroTimer />
            </div>
            <div>
              <Notebook />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}