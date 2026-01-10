import { useParams, useOutletContext } from 'react-router-dom';
import NotesPanel from '../components/NotesPanel';
import { useStudyTracker } from '../hooks/useStudyTracker';

export default function NotesPage() {
  const { id: classroomId } = useParams();
  const { classroom } = useOutletContext();

  // Track study time for notes activity
  useStudyTracker(classroomId, 'NOTES');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Notes</h2>
        <p className="text-gray-500">
          Create and organize your study notes with markdown support.
        </p>
      </div>

      <div className="h-[calc(100vh-16rem)]">
        <NotesPanel
          classroomId={classroomId}
        />
      </div>
    </div>
  );
}
