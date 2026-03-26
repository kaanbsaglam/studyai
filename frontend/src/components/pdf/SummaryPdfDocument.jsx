import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import MarkdownPdfRenderer from './MarkdownPdfRenderer';

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
  content: {
    marginTop: 4,
  },
});

export default function SummaryPdfDocument({ summary }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{summary.title}</Text>
        {summary.focusTopic && (
          <Text style={styles.subtitle}>{summary.focusTopic}</Text>
        )}
        <View style={styles.content}>
          <MarkdownPdfRenderer content={summary.content} />
        </View>
      </Page>
    </Document>
  );
}
