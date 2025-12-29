import { useState, useEffect, useCallback } from "react";
import api from "../api/axiosClient";
import toast from "react-hot-toast";
import { FaTrash, FaFilePdf } from "react-icons/fa";

export default function DocumentManager({ classroomId }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [generatedContent, setGeneratedContent] = useState(null);

  // 1. Define loadDocs function
  const loadDocs = useCallback(async () => {
    try {
      // Make sure your backend has the GET /documents/list/:classroomId route!
      const res = await api.get(`/documents/list/${classroomId}`);
      setDocs(res.data);
    } catch (err) {
      console.error("Failed to load docs:", err);
      // Optional: toast.error("Could not load documents");
    }
  }, [classroomId]);

  // 2. Call it in useEffect
  useEffect(() => {
    if (classroomId) {
      loadDocs();
    }
  }, [loadDocs, classroomId]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("classroom_id", classroomId);

    setUploading(true);
    try {
      await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Document uploaded!");
      setFile(null);
      loadDocs(); // Refresh list after upload
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId) {
    if (!confirm("Are you sure? This will remove the file from the AI's memory.")) return;
    try {
      await api.delete(`/documents/${docId}`);
      toast.success("Document deleted");
      loadDocs(); // Refresh list after delete
    } catch (err) {
      toast.error("Delete failed");
    }
  }

  async function generate(type, docId) {
    const toastId = toast.loading(`Generating ${type}...`);
    try {
      const res = await api.post(`/documents/${type}`, { document_id: docId });
      
      let content = "";
      if (type === "summary") content = res.data.summary;
      if (type === "questions") content = res.data.questions;
      // Flashcards and Quiz usually have their own dedicated UI components now, 
      // but this keeps the "Quick Action" buttons working if you still use them.
      
      if (content) {
          setGeneratedContent({ type, content });
      }
      
      toast.success("Done!", { id: toastId });
    } catch (err) {
      toast.error("Generation failed", { id: toastId });
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-bold mb-4 text-lg">Upload Document</h3>
        <form onSubmit={handleUpload} className="flex gap-4">
          <input 
            type="file" 
            onChange={(e) => setFile(e.target.files[0])} 
            className="border p-2 rounded flex-1"
          />
          <button 
            disabled={uploading} 
            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      </div>

      {/* Document List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-10">
                No documents found. Upload one to get started.
            </div>
        )}
        
        {docs.map((doc) => (
          <div key={doc.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-start group">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-3 bg-red-50 text-red-500 rounded-lg shrink-0">
                <FaFilePdf size={20} />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate text-gray-800" title={doc.filename}>
                    {doc.filename}
                </p>
                <p className="text-xs text-gray-500">
                    {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => handleDelete(doc.id)} 
              className="text-gray-300 hover:text-red-500 transition-colors p-2"
              title="Delete Document"
            >
              <FaTrash />
            </button>
          </div>
        ))}
      </div>

      {/* Quick Result Display (Optional) */}
      {generatedContent && (
        <div className="bg-gray-50 p-4 rounded border mt-4 relative">
          <button 
            onClick={() => setGeneratedContent(null)} 
            className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
          >
            ✕
          </button>
          <h3 className="font-bold capitalize mb-2">{generatedContent.type} Result</h3>
          <pre className="whitespace-pre-wrap text-sm bg-white p-4 rounded border">
            {generatedContent.content}
          </pre>
        </div>
      )}
    </div>
  );
}