import { useState, useRef, useEffect } from 'react';

/**
 * Reusable 3-dot dropdown menu component.
 *
 * Props:
 *   items: Array of { label, icon?, onClick, danger?, disabled? }
 */
export default function ThreeDotMenu({ items = [] }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        style={{ color: 'var(--text-muted, #6b7280)' }}
        title="More options"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--card-border, #e5e7eb)' }}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick?.();
              }}
              disabled={item.disabled}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-none rounded-none focus:outline-none shadow-none ${
                item.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : 'hover:bg-gray-50'
              }`}
              style={
                !item.danger
                  ? { color: 'var(--text-primary, #111827)' }
                  : undefined
              }
            >
              {item.icon && <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
