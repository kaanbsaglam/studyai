import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';

/**
 * Pre-processes markdown content
 * - ==text== → <mark>text</mark> (highlight)
 * - Ensures --- produces horizontal rules properly
 */
function preprocessMarkdown(content) {
  if (!content) return '';

  let processed = content;

  // Convert ==highlight== to <mark>highlight</mark>
  // Handles multi-word highlights and nested content
  processed = processed.replace(/==(.*?)==/g, '<mark>$1</mark>');

  return processed;
}

const markdownComponents = {
  // Style <mark> elements for highlights
  mark: ({ children }) => (
    <mark className="bg-yellow-200 text-yellow-900 px-0.5 rounded">
      {children}
    </mark>
  ),
  // Ensure horizontal rules render nicely
  hr: () => <hr className="my-4 border-t-2 border-gray-300" />,
  // Tables
  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse border border-gray-300 text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-100">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-300 px-3 py-2 text-gray-600">
      {children}
    </td>
  ),
};

export default function MarkdownRenderer({ children, className = '' }) {
  const processed = preprocessMarkdown(children);

  return (
    <div className={`prose prose-sm max-w-none ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw]}
        components={markdownComponents}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
