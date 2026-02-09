import { useParams, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QuizPanel from '../components/QuizPanel';
import { useStudyTracker } from '../hooks/useStudyTracker';

export default function QuizPage() {
  const { t } = useTranslation();
  const { id: classroomId } = useParams();
  const { classroom } = useOutletContext();

  // Track study time for quiz activity
  useStudyTracker(classroomId, 'QUIZ');

  const documents = classroom?.documents || [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{t('quizPage.title')}</h2>
        <p className="text-gray-500">
          {t('quizPage.subtitle')}
        </p>
      </div>

      <QuizPanel
        classroomId={classroomId}
        documents={documents}
        initialDocumentIds={[]}
        fullHeight
      />
    </div>
  );
}
