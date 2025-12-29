import { useState, useEffect } from "react";
import api from "../api/axiosClient";
import toast from "react-hot-toast";
import { FaArrowLeft, FaArrowRight, FaSave, FaRedo } from "react-icons/fa";

export default function FlashcardGenerator({ classroomId }) {
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    // Fetch docs for dropdown
    api.get(`/documents/list/${classroomId}`).then(res => setDocs(res.data));
  }, [classroomId]);

  async function handleGenerate() {
    if (!selectedDoc) return toast.error("Select a document first");
    const toastId = toast.loading("Generating Flashcards...");
    try {
      const res = await api.post("/documents/flashcards", { document_id: selectedDoc });
      setCards(res.data.flashcards);
      setCurrentIndex(0);
      setIsFlipped(false);
      toast.success("Deck Ready!", { id: toastId });
    } catch (err) {
      toast.error("Generation failed", { id: toastId });
    }
  }

  async function handleSave() {
    try {
      await api.post("/documents/save-flashcards", { document_id: selectedDoc, data: cards });
      toast.success("Deck saved to history!");
    } catch (err) {
      toast.error("Save failed");
    }
  }

  const nextCard = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(c => c + 1);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex(c => c - 1);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold">Flashcards</h2>
         {cards.length > 0 && (
             <button onClick={handleSave} className="flex items-center gap-2 text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded">
                 <FaSave /> Save Deck
             </button>
         )}
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm flex gap-4">
        <select 
          className="border p-2 rounded flex-1"
          value={selectedDoc}
          onChange={(e) => setSelectedDoc(e.target.value)}
        >
          <option value="">-- Select Source Document --</option>
          {docs.map(d => <option key={d.id} value={d.id}>{d.filename}</option>)}
        </select>
        <button onClick={handleGenerate} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center gap-2">
           <FaRedo /> Generate
        </button>
      </div>

      {/* Flashcard Area */}
      {cards.length > 0 ? (
        <div className="flex flex-col items-center space-y-6">
            
            {/* The Card */}
            <div 
              className="relative w-full h-64 cursor-pointer perspective-1000"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d shadow-lg rounded-xl border ${isFlipped ? "rotate-y-180" : ""}`}>
                
                {/* Front */}
                <div className="absolute w-full h-full bg-white flex items-center justify-center p-8 backface-hidden rounded-xl">
                  <p className="text-2xl font-semibold text-center text-gray-800">{cards[currentIndex].front}</p>
                  <span className="absolute bottom-4 text-xs text-gray-400">Click to flip</span>
                </div>

                {/* Back */}
                <div className="absolute w-full h-full bg-indigo-600 text-white flex items-center justify-center p-8 backface-hidden rotate-y-180 rounded-xl">
                  <p className="text-xl text-center leading-relaxed">{cards[currentIndex].back}</p>
                </div>

              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-8">
                <button onClick={prevCard} disabled={currentIndex === 0} className="p-3 rounded-full bg-white shadow hover:bg-gray-50 disabled:opacity-50">
                    <FaArrowLeft />
                </button>
                <span className="font-mono text-gray-500">{currentIndex + 1} / {cards.length}</span>
                <button onClick={nextCard} disabled={currentIndex === cards.length - 1} className="p-3 rounded-full bg-white shadow hover:bg-gray-50 disabled:opacity-50">
                    <FaArrowRight />
                </button>
            </div>
        </div>
      ) : (
          <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed">
              <p className="text-gray-500">Select a document to generate flashcards.</p>
          </div>
      )}

      {/* CSS for 3D Flip (Add this to your index.css or global CSS) */}
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}