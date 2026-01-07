import { useParams, useOutletContext } from 'react-router-dom';
import FlashcardsPanel from '../components/FlashcardsPanel';

export default function FlashcardsPage() {
  const { id: classroomId } = useParams();
  const { classroom } = useOutletContext();

  const documents = classroom?.documents || [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Flashcards</h2>
        <p className="text-gray-500">
          Generate and study flashcards from your documents or any topic.
        </p>
      </div>

      <FlashcardsPanel
        classroomId={classroomId}
        documents={documents}
        initialDocumentIds={[]}
        fullHeight
      />
    </div>
  );
}
