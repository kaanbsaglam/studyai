import { useState } from "react";
import api from "../api/axiosClient";
import toast from "react-hot-toast";

export default function DocumentManager({ classroomId }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState([]); // Temporary session state
  const [generatedContent, setGeneratedContent] = useState(null);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("classroom_id", classroomId);

    setUploading(true);
    try {
      const res = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Add to local list immediately
      setDocs((prev) => [...prev, { id: res.data.document_id, name: file.name }]);
      toast.success("Document uploaded!");
      setFile(null);
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function generate(type, docId) {
    const toastId = toast.loading(`Generating ${type}...`);
    try {
      // Endpoints: /documents/summary, /documents/questions, /documents/flashcards
      const res = await api.post(`/documents/${type}`, { document_id: docId });
      
      let content = "";
      if (type === "summary") content = res.data.summary;
      if (type === "questions") content = res.data.questions;
      if (type === "flashcards") content = JSON.stringify(res.data.flashcards, null, 2);

      setGeneratedContent({ type, content });
      toast.success("Done!", { id: toastId });
    } catch (err) {
      toast.error("Generation failed", { id: toastId });
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-bold mb-2">Upload Document</h3>
        <form onSubmit={handleUpload} className="flex gap-2">
          <input 
            type="file" 
            onChange={(e) => setFile(e.target.files[0])} 
            className="border p-1 flex-1"
          />
          <button disabled={uploading} className="bg-blue-600 text-white px-4 py-1 rounded">
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      </div>

      {/* Document List */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-bold mb-2">Your Documents (Session)</h3>
        {docs.length === 0 && <p className="text-gray-500 text-sm">No documents uploaded yet.</p>}
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li key={doc.id} className="border p-2 rounded flex justify-between items-center">
              <span>{doc.name}</span>
              <div className="text-sm space-x-2">
                <button onClick={() => generate("summary", doc.id)} className="text-blue-600 hover:underline">Summary</button>
                <button onClick={() => generate("questions", doc.id)} className="text-green-600 hover:underline">Questions</button>
                <button onClick={() => generate("flashcards", doc.id)} className="text-purple-600 hover:underline">Flashcards</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Results Display */}
      {generatedContent && (
        <div className="bg-gray-50 p-4 rounded border mt-4">
          <div className="flex justify-between mb-2">
            <h3 className="font-bold capitalize">{generatedContent.type} Result</h3>
            <button onClick={() => setGeneratedContent(null)} className="text-red-500">Close</button>
          </div>
          <pre className="whitespace-pre-wrap text-sm bg-white p-3 rounded border">
            {generatedContent.content}
          </pre>
        </div>
      )}
    </div>
  );
}