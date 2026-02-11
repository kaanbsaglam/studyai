import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function DocumentSelector({
  documents = [],
  selectedIds = [],
  onChange,
  disabled = false,
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const readyDocuments = documents.filter((d) => d.status === 'READY');
  const selectedDocuments = readyDocuments.filter((d) => selectedIds.includes(d.id));

  const toggleDocument = (docId) => {
    if (selectedIds.includes(docId)) {
      onChange(selectedIds.filter((id) => id !== docId));
    } else {
      onChange([...selectedIds, docId]);
    }
  };

  const selectAll = () => {
    onChange(readyDocuments.map((d) => d.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  if (readyDocuments.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
        {t('documentSelector.noDocuments')}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <div className="flex justify-between items-center">
          <span className="text-gray-700">
            {selectedIds.length === 0
              ? t('documentSelector.selectDocuments')
              : t('documentSelector.documentsSelected', { count: selectedIds.length })}
          </span>
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Selected documents preview */}
      {selectedDocuments.length > 0 && !isOpen && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selectedDocuments.map((doc) => (
            <span
              key={doc.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
            >
              {doc.originalName}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDocument(doc.id);
                }}
                className="hover:text-blue-900"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
          {/* Actions */}
          <div className="px-3 py-2 border-b border-gray-200 flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {t('documentSelector.selectedOf', { selected: selectedIds.length, total: readyDocuments.length })}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {t('documentSelector.selectAll')}
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {t('documentSelector.clear')}
              </button>
            </div>
          </div>

          {/* Document list */}
          <div className="max-h-60 overflow-y-auto">
            {readyDocuments.map((doc) => (
              <label
                key={doc.id}
                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(doc.id)}
                  onChange={() => toggleDocument(doc.id)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-3 text-sm text-gray-700 truncate" title={doc.originalName}>
                  {doc.originalName}
                </span>
              </label>
            ))}
          </div>

          {/* Close button */}
          <div className="px-3 py-2 border-t border-gray-200">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              {t('documentSelector.done')}
            </button>
          </div>
        </div>
      )}

      {/* Help text */}
      <p className="mt-1 text-xs text-gray-500">
        {selectedIds.length === 0
          ? t('documentSelector.noDocsSelectedHint')
          : t('documentSelector.docsSelectedHint')}
      </p>
    </div>
  );
}
