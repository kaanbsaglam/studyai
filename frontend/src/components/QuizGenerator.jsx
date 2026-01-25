import { useState, useEffect } from "react";
import api from "../api/axiosClient";
import toast from "react-hot-toast";

export default function QuizGenerator({ classroomId }) {
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [quiz, setQuiz] = useState(null); // The generated quiz data
  const [answers, setAnswers] = useState({}); // User's selected answers
  const [score, setScore] = useState(null);

  // Load documents for selection dropdown
  useEffect(() => {
    api.get(`/documents/list/${classroomId}`).then(res => setDocs(res.data));
  }, [classroomId]);

  async function handleGenerate() {
    if (!selectedDoc) return toast.error("Select a document first");
    const toastId = toast.loading("Creating quiz...");
    try {
      const res = await api.post("/documents/quiz", { document_id: selectedDoc });
      setQuiz(res.data.quiz);
      setAnswers({});
      setScore(null);
      toast.success("Quiz Ready!", { id: toastId });
    } catch (err) {
      toast.error("Failed to generate", { id: toastId });
    }
  }

  async function saveQuizResult() {
    try {
        await api.post("/documents/save-quiz", { document_id: selectedDoc, data: quiz });
        toast.success("Quiz saved to history!");
    } catch(err) { toast.error("Save failed"); }
  }

  function calculateScore() {
    let correct = 0;
    quiz.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) correct++;
    });
    setScore(correct);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-slate-900 dark:text-slate-100">
      <h2 className="text-2xl font-bold">AI Quiz Generator</h2>
      
      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm flex gap-4 items-center dark:bg-slate-900 dark:border dark:border-slate-800">
        <select 
        className="border p-2 rounded flex-1 bg-white text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
            value={selectedDoc}
            onChange={(e) => setSelectedDoc(e.target.value)}
        >
          <option value="">-- Select a Document --</option>
          {docs.map(d => <option key={d.id} value={d.id}>{d.filename}</option>)}
        </select>
        <button onClick={handleGenerate} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
          Generate New Quiz
        </button>
      </div>

      {/* Quiz UI */}
      {quiz && (
        <div className="space-y-6 animate-fade-in">
          {quiz.map((q, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border dark:bg-slate-900 dark:border-slate-800">
              <p className="font-semibold text-lg mb-4">{index + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, optIndex) => (
                  <label key={optIndex} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    answers[index] === optIndex ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-700" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}>
                    <input 
                      type="radio" 
                      name={`q-${index}`} 
                      className="mr-3"
                      checked={answers[index] === optIndex}
                      onChange={() => setAnswers({...answers, [index]: optIndex})}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-4">
            <button onClick={calculateScore} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold">
              Submit Answers
            </button>
            {score !== null && (
               <div className="flex items-center gap-4">
                  <span className="text-xl font-bold">Score: {score} / {quiz.length}</span>
                  <button onClick={saveQuizResult} className="text-blue-600 underline">Save to History</button>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}