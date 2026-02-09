import { useParams, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import NotesPanel from '../components/NotesPanel';
import { useStudyTracker } from '../hooks/useStudyTracker';

export default function NotesPage() {
  const { id: classroomId } = useParams();
  const { classroom } = useOutletContext();
  const { t } = useTranslation();

  // Track study time for notes activity
  useStudyTracker(classroomId, 'NOTES');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{t('notesPage.title')}</h2>
        <p className="text-gray-500">
          {t('notesPage.subtitle')}
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
