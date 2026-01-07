import { useParams, useOutletContext } from 'react-router-dom';
import QuizPanel from '../components/QuizPanel';

export default function QuizPage() {
  const { id: classroomId } = useParams();
  const { classroom } = useOutletContext();

  const documents = classroom?.documents || [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Quizzes</h2>
        <p className="text-gray-500">
          Test your knowledge with AI-generated multiple-choice quizzes.
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
