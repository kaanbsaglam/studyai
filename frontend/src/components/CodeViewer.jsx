import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import hljs from 'highlight.js';

/**
 * Map file extensions to highlight.js language identifiers.
 */
const EXT_TO_LANGUAGE = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  pyw: 'python',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin',
  html: 'xml',
  htm: 'xml',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',
  json: 'json',
  jsonc: 'json',
  xml: 'xml',
  svg: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  markdown: 'markdown',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  sql: 'sql',
  r: 'r',
  lua: 'lua',
  dart: 'dart',
  toml: 'ini',
  ini: 'ini',
  cfg: 'ini',
  conf: 'ini',
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  gradle: 'gradle',
  cmake: 'cmake',
};

function getLanguageFromFilename(filename) {
  if (!filename) return undefined;
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? EXT_TO_LANGUAGE[ext] : undefined;
}

const CODE_EXTENSIONS = new Set(Object.keys(EXT_TO_LANGUAGE));

export function isCodeFileByName(filename) {
  if (!filename) return false;
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? CODE_EXTENSIONS.has(ext) : false;
}

/**
 * CodeViewer — renders source code with syntax highlighting and line numbers.
 * Uses a table layout so line numbers and code are always perfectly aligned.
 */
export default function CodeViewer({ code, filename, language }) {
  const { t } = useTranslation();
  const [highlightedLines, setHighlightedLines] = useState([]);
  const [copied, setCopied] = useState(false);
  const lang = language || getLanguageFromFilename(filename);

  const rawLines = useMemo(() => (code ? code.split('\n') : []), [code]);

  useEffect(() => {
    if (!code) return;

    try {
      let result;
      if (lang) {
        result = hljs.highlight(code, { language: lang, ignoreIllegals: true });
      } else {
        result = hljs.highlightAuto(code);
      }
      setHighlightedLines(result.value.split('\n'));
    } catch {
      setHighlightedLines(
        rawLines.map((line) =>
          line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        )
      );
    }
  }, [code, lang, rawLines]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (!code) return null;

  const lineCount = rawLines.length;
  const gutterWidth = String(lineCount).length;

  return (
    <div className="code-viewer-container">
      {filename && (
        <div className="code-viewer-header">
          <span className="code-viewer-filename">
            <svg className="code-viewer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            {filename}
            {lang && <span className="code-viewer-lang">{lang}</span>}
          </span>
          <span className="code-viewer-header-actions">
            <button
              onClick={handleCopy}
              className="code-viewer-copy-btn"
              title="Copy code"
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t('codeViewer.copied')}
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  {t('codeViewer.copy')}
                </>
              )}
            </button>
            <button
              onClick={() => {
                const blob = new Blob([code], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename || 'code.txt';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="code-viewer-copy-btn"
              title="Download file"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              {t('codeViewer.download')}
            </button>
            <span className="code-viewer-line-info">
              {t('codeViewer.lines', { count: lineCount })}
            </span>
          </span>
        </div>
      )}

      {/* Code body — single scroll container with table layout */}
      <div className="code-viewer-body">
        <table className="code-viewer-table">
          <tbody>
            {highlightedLines.map((lineHtml, i) => (
              <tr key={i} className="code-viewer-row">
                <td
                  className="code-viewer-line-number"
                  style={{ minWidth: `${gutterWidth + 2}ch` }}
                  aria-hidden="true"
                >
                  {i + 1}
                </td>
                <td
                  className="code-viewer-line-content"
                  dangerouslySetInnerHTML={{ __html: lineHtml || '&nbsp;' }}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
