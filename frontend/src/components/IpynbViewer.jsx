import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import CodeViewer from './CodeViewer';
import MarkdownRenderer from './MarkdownRenderer';

function joinSource(source) {
  if (Array.isArray(source)) return source.join('');
  if (typeof source === 'string') return source;
  return '';
}

function getNotebookLanguage(notebook) {
  return (
    notebook?.metadata?.kernelspec?.language ||
    notebook?.metadata?.language_info?.name ||
    'python'
  );
}

export function isNotebookFileByName(filename) {
  if (!filename) return false;
  return filename.toLowerCase().endsWith('.ipynb');
}

export default function IpynbViewer({ rawContent, filename }) {
  const { t } = useTranslation();

  const { cells, parseError, language } = useMemo(() => {
    if (!rawContent) return { cells: [], parseError: null, language: 'python' };
    try {
      const nb = JSON.parse(rawContent);
      return {
        cells: Array.isArray(nb.cells) ? nb.cells : [],
        parseError: null,
        language: getNotebookLanguage(nb),
      };
    } catch (err) {
      return { cells: [], parseError: err.message, language: 'python' };
    }
  }, [rawContent]);

  if (parseError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
        {t('ipynbViewer.parseError', 'Failed to parse notebook')}: {parseError}
      </div>
    );
  }

  if (cells.length === 0) {
    return (
      <div className="text-gray-500 text-center p-6">
        {t('ipynbViewer.empty', 'Notebook has no cells')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cells.map((cell, idx) => {
        const source = joinSource(cell.source);
        const cellType = cell.cell_type;

        if (cellType === 'markdown') {
          return (
            <div
              key={idx}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <MarkdownRenderer>{source}</MarkdownRenderer>
            </div>
          );
        }

        if (cellType === 'code') {
          return (
            <div key={idx}>
              <CodeViewer
                code={source || ' '}
                filename={`${filename || 'notebook'} — ${t('ipynbViewer.cell', 'cell')} ${idx + 1}`}
                language={language}
              />
            </div>
          );
        }

        // raw or unknown cells
        return (
          <div
            key={idx}
            className="bg-gray-50 border border-gray-200 rounded-lg p-4"
          >
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700">
              {source}
            </pre>
          </div>
        );
      })}
    </div>
  );
}
