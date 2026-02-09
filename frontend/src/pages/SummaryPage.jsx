import { useParams, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SummaryPanel from '../components/SummaryPanel';
import { useStudyTracker } from '../hooks/useStudyTracker';

export default function SummaryPage() {
  const { id: classroomId } = useParams();
  const { classroom } = useOutletContext();
  const { t } = useTranslation();

  // Track study time for summary activity
  useStudyTracker(classroomId, 'SUMMARY');

  const documents = classroom?.documents || [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{t('summaryPage.title')}</h2>
        <p className="text-gray-500">
          {t('summaryPage.subtitle')}
        </p>
      </div>

      <SummaryPanel
        classroomId={classroomId}
        documents={documents}
        initialDocumentIds={[]}
        fullHeight
      />
    </div>
  );
}
