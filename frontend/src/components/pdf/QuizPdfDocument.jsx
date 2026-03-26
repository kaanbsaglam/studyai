import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
  },
  questionBlock: {
    marginBottom: 14,
  },
  questionText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  option: {
    fontSize: 10,
    marginBottom: 3,
    paddingLeft: 12,
    lineHeight: 1.5,
  },
  divider: {
    borderBottom: '1 solid #cccccc',
    marginTop: 20,
    marginBottom: 12,
  },
  answerKeyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  answerKeyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  answerKeyItem: {
    fontSize: 10,
    marginRight: 12,
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#aaaaaa',
  },
});

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuizPdfDocument({ quiz, answerKeyLabel }) {
  // Build answer key & option mappings
  const questionsData = quiz.questions.map((q) => {
    const allAnswers = [q.correctAnswer, ...q.wrongAnswers];
    // Shuffle deterministically using the question text as seed-like order
    // Actually, keep consistent order: correct first then wrong — but label them A,B,C,D
    const correctIndex = 0; // correctAnswer is always first in allAnswers
    return {
      question: q.question,
      options: allAnswers,
      correctLetter: LETTERS[correctIndex],
    };
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{quiz.title}</Text>
        {quiz.focusTopic && (
          <Text style={styles.subtitle}>{quiz.focusTopic}</Text>
        )}

        {questionsData.map((q, idx) => (
          <View key={idx} style={styles.questionBlock} wrap={false}>
            <Text style={styles.questionText}>
              {idx + 1}. {q.question}
            </Text>
            {q.options.map((opt, optIdx) => (
              <Text key={optIdx} style={styles.option}>
                {LETTERS[optIdx]}) {opt}
              </Text>
            ))}
          </View>
        ))}

        {/* Answer Key */}
        <View style={styles.divider} />
        <Text style={styles.answerKeyTitle}>{answerKeyLabel}</Text>
        <View style={styles.answerKeyRow}>
          {questionsData.map((q, idx) => (
            <Text key={idx} style={styles.answerKeyItem}>
              {idx + 1}-{q.correctLetter}
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}
