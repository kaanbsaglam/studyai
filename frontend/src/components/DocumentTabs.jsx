import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { isCodeFileByName } from './CodeViewer';
import { isNotebookFileByName } from './IpynbViewer';

export const MAX_OPEN_TABS = 5;

function getDocIconType(doc) {
  const name = doc?.originalName || '';
  const mime = doc?.mimeType || '';
  if (mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('audio/')) return 'audio';
  if (isNotebookFileByName(name)) return 'notebook';
  if (isCodeFileByName(name)) return 'code';
  return 'doc';
}

const ICON_PATHS = {
  pdf: 'M9 12h6m-6 4h3m4 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  audio: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z',
  notebook: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  code: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
};

function DocTypeIcon({ doc, className = 'h-4 w-4 flex-shrink-0 opacity-70' }) {
  const type = getDocIconType(doc);
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICON_PATHS[type]} />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <path d="M6 6L18 18M6 18L18 6" />
    </svg>
  );
}

function DocPlusIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function DocumentTabs({
  tabs,
  activeId,
  availableDocs,
  maxReached,
  onSelect,
  onClose,
  onAdd,
}) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState(null);
  const pickerRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handleClick = (e) => {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setPickerOpen(false);
      }
    };
    window.document.addEventListener('mousedown', handleClick);
    return () => window.document.removeEventListener('mousedown', handleClick);
  }, [pickerOpen]);

  // Position the portal dropdown right under the trigger.
  useLayoutEffect(() => {
    if (!pickerOpen || !triggerRef.current) return;
    const updatePos = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      setPickerPos({ top: rect.bottom + 8, left: rect.left });
    };
    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [pickerOpen]);

  const canAdd = !maxReached && availableDocs.length > 0;

  return (
    <div className="flex items-end min-w-0 flex-1 -mb-[9px]">
      <div className="flex items-end gap-0.5 min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:thin]">
        {tabs.map((doc) => {
          const isActive = doc.id === activeId;
          return (
            <div
              key={doc.id}
              onClick={() => onSelect(doc.id)}
              title={doc.originalName}
              className={`group relative flex items-center gap-2 h-10 pl-4 pr-2 rounded-t-2xl text-sm font-medium cursor-pointer flex-shrink-0 max-w-[240px] select-none transition-colors ${
                isActive
                  ? 'doc-tab-active shadow-[0_-1px_3px_rgba(0,0,0,0.06)]'
                  : 'doc-tab-inactive'
              }`}
              style={isActive ? { marginBottom: '-4px' } : undefined}
            >
              <span className="truncate">{doc.originalName}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(doc.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    e.preventDefault();
                    onClose(doc.id);
                  }
                }}
                className="flex-shrink-0 cursor-pointer rounded-full p-0.5 doc-tab-icon"
                title={t('documentTabs.close', 'Close')}
                aria-label={t('documentTabs.close', 'Close')}
              >
                <CloseIcon />
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative flex-shrink-0 self-center ml-2" ref={pickerRef}>
        <span
          ref={triggerRef}
          role="button"
          tabIndex={canAdd ? 0 : -1}
          onClick={() => canAdd && setPickerOpen((v) => !v)}
          onKeyDown={(e) => {
            if (canAdd && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              setPickerOpen((v) => !v);
            }
          }}
          aria-disabled={!canAdd}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 doc-tab-add ${
            canAdd ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
          }`}
          title={
            maxReached
              ? t('documentTabs.maxReached', 'Maximum {{max}} tabs', { max: MAX_OPEN_TABS })
              : availableDocs.length === 0
                ? t('documentTabs.noMore', 'No more documents to open')
                : t('documentTabs.addTab', 'Open another document')
          }
          aria-label={t('documentTabs.addTab', 'Open another document')}
        >
          <DocPlusIcon />
          <PlusIcon />
        </span>

        {pickerOpen && canAdd && pickerPos && createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-50 min-w-[240px] max-w-[320px] rounded-xl border overflow-hidden max-h-72 overflow-y-auto"
            style={{
              top: pickerPos.top,
              left: pickerPos.left,
              backgroundColor: 'var(--card-bg)',
              borderColor: 'var(--card-border)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            }}
          >
            {availableDocs.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => {
                  setPickerOpen(false);
                  onAdd(doc.id);
                }}
                className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2.5 border-0 outline-none focus:outline-none hover:bg-blue-500/10 dark:hover:bg-blue-400/15 hover:pl-4 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-150"
                style={{ color: 'var(--text-primary)', background: 'transparent' }}
                title={doc.originalName}
              >
                <DocTypeIcon doc={doc} />
                <span className="truncate">{doc.originalName}</span>
              </button>
            ))}
          </div>,
          window.document.body
        )}
      </div>
    </div>
  );
}
