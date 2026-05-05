import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  content: string;
  noScroll?: boolean;
};

export default function MarkdownRenderer({ content, noScroll }: Props) {
  const { tokens } = useTheme();

  const styles = {
    body: {
      color: tokens.textPrimary,
      fontSize: 15,
      lineHeight: 24,
    },
    heading1: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: tokens.textPrimary,
      marginTop: 20,
      marginBottom: 8,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: tokens.cardBorder,
    },
    heading2: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: tokens.textPrimary,
      marginTop: 18,
      marginBottom: 6,
    },
    heading3: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: tokens.textPrimary,
      marginTop: 14,
      marginBottom: 4,
    },
    heading4: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: tokens.textSecondary,
      marginTop: 12,
      marginBottom: 4,
    },
    heading5: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: tokens.textSecondary,
      marginTop: 10,
      marginBottom: 4,
    },
    heading6: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: tokens.textMuted,
      marginTop: 10,
      marginBottom: 4,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 12,
      color: tokens.textPrimary,
      fontSize: 15,
      lineHeight: 24,
    },
    code_inline: {
      backgroundColor: tokens.btnBgPressed,
      color: tokens.accent,
      fontFamily: 'monospace',
      fontSize: 13,
      borderRadius: 4,
      paddingHorizontal: 4,
    },
    code_block: {
      backgroundColor: '#1e1e2e',
      borderRadius: 10,
      padding: 14,
      fontFamily: 'monospace',
      fontSize: 12,
      color: '#cdd6f4',
      lineHeight: 20,
    },
    fence: {
      backgroundColor: '#1e1e2e',
      borderRadius: 10,
      padding: 14,
      fontFamily: 'monospace',
      fontSize: 12,
      color: '#cdd6f4',
      lineHeight: 20,
    },
    blockquote: {
      backgroundColor: tokens.accentSoft,
      borderLeftWidth: 4,
      borderLeftColor: tokens.accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 4,
      marginVertical: 8,
    },
    bullet_list: {
      marginBottom: 10,
    },
    ordered_list: {
      marginBottom: 10,
    },
    list_item: {
      marginBottom: 4,
    },
    bullet_list_icon: {
      color: tokens.accent,
      fontSize: 18,
      lineHeight: 24,
      marginRight: 8,
    },
    ordered_list_icon: {
      color: tokens.accent,
      fontSize: 15,
      lineHeight: 24,
      marginRight: 8,
      fontWeight: '600' as const,
    },
    bullet_list_content: {
      flex: 1,
      color: tokens.textPrimary,
      fontSize: 15,
      lineHeight: 24,
    },
    ordered_list_content: {
      flex: 1,
      color: tokens.textPrimary,
      fontSize: 15,
      lineHeight: 24,
    },
    hr: {
      backgroundColor: tokens.cardBorder,
      height: 1,
      marginVertical: 16,
    },
    strong: {
      fontWeight: '700' as const,
      color: tokens.textPrimary,
    },
    em: {
      fontStyle: 'italic' as const,
      color: tokens.textSecondary,
    },
    s: {
      textDecorationLine: 'line-through' as const,
      color: tokens.textMuted,
    },
    link: {
      color: tokens.accent,
      textDecorationLine: 'underline' as const,
    },
    table: {
      borderWidth: 1,
      borderColor: tokens.cardBorder,
      borderRadius: 8,
      marginVertical: 10,
    },
    thead: {
      backgroundColor: tokens.btnBgPressed,
    },
    tr: {
      borderBottomWidth: 1,
      borderBottomColor: tokens.cardBorder,
      flexDirection: 'row' as const,
    },
    th: {
      padding: 10,
      fontWeight: '700' as const,
      color: tokens.textPrimary,
      fontSize: 13,
      borderRightWidth: 1,
      borderRightColor: tokens.cardBorder,
      flex: 1,
    },
    td: {
      padding: 10,
      color: tokens.textSecondary,
      fontSize: 13,
      borderRightWidth: 1,
      borderRightColor: tokens.cardBorder,
      flex: 1,
    },
    image: {
      width: '100%' as any,
      marginVertical: 8,
    },
  };

  // Custom rule: wrap fenced code blocks in a horizontal ScrollView
  const rules = {
    fence: (node: any, children: any, _parent: any, mdStyles: any) => (
      <ScrollView
        key={node.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{
          backgroundColor: '#1e1e2e',
          borderRadius: 10,
          marginVertical: 10,
        }}
        contentContainerStyle={{ padding: 14 }}
      >
        <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#cdd6f4', lineHeight: 20 }}>
          {node.content}
        </Text>
      </ScrollView>
    ),
    code_block: (node: any, children: any, _parent: any, mdStyles: any) => (
      <ScrollView
        key={node.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{
          backgroundColor: '#1e1e2e',
          borderRadius: 10,
          marginVertical: 10,
        }}
        contentContainerStyle={{ padding: 14 }}
      >
        <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#cdd6f4', lineHeight: 20 }}>
          {node.content}
        </Text>
      </ScrollView>
    ),
  };

  const markdownEl = (
    <Markdown style={styles as any} rules={rules as any}>
      {content}
    </Markdown>
  );

  if (noScroll) return markdownEl;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {markdownEl}
    </ScrollView>
  );
}
