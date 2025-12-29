import { useState, useEffect } from "react";
import api from "../api/axiosClient";
import toast from "react-hot-toast";

export default function Notebook({ classroomId }) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load note for this classroom
    api.get(`/notes/${classroomId}`).then(res => setContent(res.data.content));
  }, [classroomId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/notes/${classroomId}`, { content });
      toast.success("Notes saved");
    } catch (err) {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-[80vh] flex flex-col bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
        <span className="font-semibold text-gray-600">Classroom Notebook</span>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-1 rounded text-sm"
        >
          {saving ? "Saving..." : "Save Notes"}
        </button>
      </div>
      <textarea 
        className="flex-1 p-6 resize-none focus:outline-none text-lg leading-relaxed text-gray-800"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Start typing your lecture notes here..."
      />
    </div>
  );
}