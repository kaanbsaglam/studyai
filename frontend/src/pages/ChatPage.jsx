import { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ChatPanel from '../components/ChatPanel';
import DocumentSelector from '../components/DocumentSelector';
import { useStudyTracker } from '../hooks/useStudyTracker';

export default function ChatPage() {
  const { id: classroomId } = useParams();
  const { classroom } = useOutletContext();
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const { t } = useTranslation();

  // Track study time for chat activity
  useStudyTracker(classroomId, 'CHAT');

  const documents = classroom?.documents || [];
  const hasReadyDocuments = documents.some((d) => d.status === 'READY');
  const selectedDocuments = documents.filter((d) => selectedDocIds.includes(d.id));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{t('chatPage.title')}</h2>
        <p className="text-gray-500 mb-4">
          {t('chatPage.subtitle')}
        </p>

        {/* Document selector */}
        <DocumentSelector
          documents={documents}
          selectedIds={selectedDocIds}
          onChange={setSelectedDocIds}
        />
      </div>

      <ChatPanel
        classroomId={classroomId}
        documentIds={selectedDocIds}
        selectedDocuments={selectedDocuments}
        hasReadyDocuments={hasReadyDocuments}
        fullHeight
      />
    </div>
  );
}
