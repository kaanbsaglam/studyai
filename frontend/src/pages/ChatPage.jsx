import { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import ChatPanel from '../components/ChatPanel';
import DocumentSelector from '../components/DocumentSelector';
import { useStudyTracker } from '../hooks/useStudyTracker';

export default function ChatPage() {
  const { id: classroomId } = useParams();
  const { classroom } = useOutletContext();
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  // Track study time for chat activity
  useStudyTracker(classroomId, 'CHAT');

  const documents = classroom?.documents || [];
  const hasReadyDocuments = documents.some((d) => d.status === 'READY');
  const selectedDocuments = documents.filter((d) => selectedDocIds.includes(d.id));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">AI Study Assistant</h2>
        <p className="text-gray-500 mb-4">
          Ask questions about your study materials. Select specific documents for context or let the AI search all documents.
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
