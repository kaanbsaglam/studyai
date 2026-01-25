import { useState } from "react";
import api from "../api/axiosClient";

export default function RagChat({ classroomId }) {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Ask me anything about your documents!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim()) return;
    
    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/rag/ask", {
        classroom_id: classroomId,
        question: userMsg.text
      });

      setMessages((prev) => [...prev, { role: "ai", text: res.data.answer }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "ai", text: "Error connecting to AI." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[500px] bg-white rounded shadow dark:bg-slate-900 dark:border dark:border-slate-800">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${
              msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-100"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-gray-400 dark:text-slate-500 text-sm ml-4">Thinking...</div>}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t flex gap-2 dark:border-slate-800">
        <input
          className="flex-1 p-2 border rounded bg-white text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type your question..."
        />
        <button 
          onClick={handleSend}
          disabled={loading}
          className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}