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
    marginBottom: 20,
    textAlign: 'center',
  },
  content: {
    marginTop: 4,
  },
});

export default function NotesPdfDocument({ note }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{note.title}</Text>
        <View style={styles.content}>
          <MarkdownPdfRenderer content={note.content} />
        </View>
      </Page>
    </Document>
  );
}
