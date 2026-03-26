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
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderWidth: 0.5,
    borderColor: '#cccccc',
  },
  tableHeaderCell: {
    flex: 1,
    padding: '6 10',
    fontWeight: 'bold',
    fontSize: 10,
  },
  tableHeaderNum: {
    width: 30,
    padding: '6 8',
    fontWeight: 'bold',
    fontSize: 10,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#cccccc',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#cccccc',
    backgroundColor: '#fafafa',
  },
  cellNum: {
    width: 30,
    padding: '5 8',
    fontSize: 10,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderColor: '#cccccc',
  },
  cellContent: {
    flex: 1,
    padding: '5 10',
    fontSize: 10,
    lineHeight: 1.5,
  },
  cellDivider: {
    width: 0.5,
    backgroundColor: '#cccccc',
  },
});

export default function FlashcardsPdfDocument({ flashcardSet, frontLabel, backLabel }) {
  const cards = flashcardSet.cards || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{flashcardSet.title}</Text>
        {flashcardSet.focusTopic && (
          <Text style={styles.subtitle}>{flashcardSet.focusTopic}</Text>
        )}

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderNum}>#</Text>
          <Text style={styles.tableHeaderCell}>{frontLabel}</Text>
          <Text style={styles.tableHeaderCell}>{backLabel}</Text>
        </View>

        {/* Table rows */}
        {cards.map((card, idx) => (
          <View
            key={idx}
            style={idx % 2 === 1 ? styles.tableRowAlt : styles.tableRow}
            wrap={false}
          >
            <Text style={styles.cellNum}>{idx + 1}</Text>
            <Text style={styles.cellContent}>{card.front}</Text>
            <View style={styles.cellDivider} />
            <Text style={styles.cellContent}>{card.back}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
