import { Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, marginTop: 12 },
  h2: { fontSize: 16, fontWeight: 'bold', marginBottom: 6, marginTop: 10 },
  h3: { fontSize: 14, fontWeight: 'bold', marginBottom: 4, marginTop: 8 },
  h4: { fontSize: 12, fontWeight: 'bold', marginBottom: 4, marginTop: 6 },
  h5: { fontSize: 11, fontWeight: 'bold', marginBottom: 3, marginTop: 5 },
  h6: { fontSize: 10, fontWeight: 'bold', marginBottom: 3, marginTop: 4 },
  paragraph: { fontSize: 10, lineHeight: 1.6, marginBottom: 6 },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
  inlineCode: {
    fontFamily: 'Courier',
    fontSize: 9,
    backgroundColor: '#f0f0f0',
    padding: '1 3',
  },
  codeBlock: {
    fontFamily: 'Courier',
    fontSize: 8,
    backgroundColor: '#f5f5f5',
    padding: 8,
    marginBottom: 8,
    borderRadius: 3,
    border: '1 solid #e0e0e0',
  },
  codeBlockText: {
    fontFamily: 'Courier',
    fontSize: 8,
    lineHeight: 1.5,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 8,
  },
  listBullet: {
    fontSize: 10,
    marginRight: 6,
    width: 12,
  },
  listContent: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.5,
  },
  hr: {
    borderBottom: '1 solid #cccccc',
    marginTop: 8,
    marginBottom: 8,
  },
  // Table styles
  table: {
    marginBottom: 8,
    marginTop: 4,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeaderCell: {
    backgroundColor: '#f0f0f0',
    borderWidth: 0.5,
    borderColor: '#cccccc',
    padding: '4 6',
    flex: 1,
  },
  tableCell: {
    borderWidth: 0.5,
    borderColor: '#cccccc',
    padding: '4 6',
    flex: 1,
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableCellText: {
    fontSize: 9,
  },
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 1.2,
    borderColor: '#444444',
    borderRadius: 1,
    marginRight: 6,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxFill: {
    width: 6,
    height: 6,
    backgroundColor: '#333333',
    borderRadius: 0.5,
  },
});

/**
 * Parse inline formatting: **bold**, *italic*, ~~strikethrough~~, `code`
 */
function parseInline(text) {
  if (!text) return [{ text: '' }];

  const segments = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Italic
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Strikethrough
    const strikeMatch = remaining.match(/~~(.+?)~~/);

    // Find the earliest match
    const matches = [
      boldMatch && { type: 'bold', match: boldMatch },
      italicMatch && { type: 'italic', match: italicMatch },
      codeMatch && { type: 'code', match: codeMatch },
      strikeMatch && { type: 'strike', match: strikeMatch },
    ].filter(Boolean);

    if (matches.length === 0) {
      segments.push({ text: remaining });
      break;
    }

    // Sort by earliest index
    matches.sort((a, b) => a.match.index - b.match.index);
    const earliest = matches[0];
    const m = earliest.match;

    // Text before the match
    if (m.index > 0) {
      segments.push({ text: remaining.substring(0, m.index) });
    }

    // The matched segment
    switch (earliest.type) {
      case 'bold':
        segments.push({ text: m[1], bold: true });
        break;
      case 'italic':
        segments.push({ text: m[1], italic: true });
        break;
      case 'code':
        segments.push({ text: m[1], code: true });
        break;
      case 'strike':
        segments.push({ text: m[1], strike: true });
        break;
    }

    remaining = remaining.substring(m.index + m[0].length);
  }

  return segments;
}

/**
 * Render inline segments as <Text> elements
 */
function InlineText({ text, baseStyle = {} }) {
  const segments = parseInline(text);

  return (
    <Text style={baseStyle}>
      {segments.map((seg, i) => {
        if (seg.code) {
          return (
            <Text key={i} style={styles.inlineCode}>
              {seg.text}
            </Text>
          );
        }
        const style = {};
        if (seg.bold) style.fontWeight = 'bold';
        if (seg.italic) style.fontStyle = 'italic';
        if (seg.strike) style.textDecoration = 'line-through';
        return (
          <Text key={i} style={style}>
            {seg.text}
          </Text>
        );
      })}
    </Text>
  );
}

/**
 * Parse a markdown table block
 */
function parseTable(lines) {
  const rows = [];
  for (const line of lines) {
    // Skip separator lines (|---|---|)
    if (/^\|[\s-:|]+\|$/.test(line.trim())) continue;

    const cells = line
      .split('|')
      .filter((_, i, arr) => i > 0 && i < arr.length - 1)
      .map((c) => c.trim());
    rows.push(cells);
  }
  return rows;
}

/**
 * Main markdown-to-PDF parser
 */
export default function MarkdownPdfRenderer({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <View key={key++} style={styles.codeBlock}>
          <Text style={styles.codeBlockText}>{codeLines.join('\n')}</Text>
        </View>
      );
      continue;
    }

    // Table (line starts with |)
    if (trimmed.startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = parseTable(tableLines);
      if (rows.length > 0) {
        elements.push(
          <View key={key++} style={styles.table}>
            {rows.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.tableRow}>
                {row.map((cell, cellIdx) => (
                  <View
                    key={cellIdx}
                    style={rowIdx === 0 ? styles.tableHeaderCell : styles.tableCell}
                  >
                    <InlineText
                      text={cell}
                      baseStyle={rowIdx === 0 ? styles.tableHeaderText : styles.tableCellText}
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
        );
      }
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<View key={key++} style={styles.hr} />);
      i++;
      continue;
    }

    // Headers
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const headerStyle = styles[`h${level}`] || styles.h6;
      elements.push(
        <InlineText key={key++} text={headerMatch[2]} baseStyle={headerStyle} />
      );
      i++;
      continue;
    }

    // Unordered list (including checklists)
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      let content = ulMatch[1];
      let isChecklist = false;
      let checked = false;

      // Detect checklist pattern in the captured content
      if (content.startsWith('[x] ') || content.startsWith('[X] ')) {
        isChecklist = true;
        checked = true;
        content = content.substring(4);
      } else if (content.startsWith('[ ] ')) {
        isChecklist = true;
        checked = false;
        content = content.substring(4);
      }

      elements.push(
        <View key={key++} style={styles.listItem}>
          {isChecklist ? (
            <View style={styles.checkbox}>
              {checked && <View style={styles.checkboxFill} />}
            </View>
          ) : (
            <Text style={styles.listBullet}>-</Text>
          )}
          <InlineText text={content} baseStyle={styles.listContent} />
        </View>
      );
      i++;
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (olMatch) {
      elements.push(
        <View key={key++} style={styles.listItem}>
          <Text style={styles.listBullet}>{olMatch[1]}.</Text>
          <InlineText text={olMatch[2]} baseStyle={styles.listContent} />
        </View>
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <InlineText key={key++} text={trimmed} baseStyle={styles.paragraph} />
    );
    i++;
  }

  return <View>{elements}</View>;
}
