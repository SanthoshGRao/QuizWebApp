import React, { useEffect, useRef, useState } from 'react';

/**
 * Accessible custom dropdown with keyboard support.
 * - `options`: [{ value, label }]
 * - `value`: current value
 * - `onChange`: (value) => void
 * - `placeholder`: text when no value selected
 */
export function Select({ options, value, onChange, placeholder = 'Select...', disabled = false }) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const buttonRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find((o) => o.value === value) || null;

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target) &&
        listRef.current &&
        !listRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const toggle = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  const handleSelect = (opt) => {
    onChange?.(opt.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onButtonKeyDown = (e) => {
    if (disabled) return;
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
      const idx = options.findIndex((o) => o.value === value);
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
  };

  const onListKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => {
        const next = i + 1;
        return next >= options.length ? 0 : next;
      });
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => {
        const next = i - 1;
        return next < 0 ? options.length - 1 : next;
      });
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = options[focusedIndex];
      if (opt) handleSelect(opt);
    }
  };

  return (
    <div className="relative text-xs">
      <button
        type="button"
        ref={buttonRef}
        onClick={toggle}
        onKeyDown={onButtonKeyDown}
        disabled={disabled}
        className={`input flex items-center justify-between gap-2 cursor-pointer ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? '' : 'text-slate-500'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`h-3 w-3 text-slate-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-950/95 shadow-lg focus:outline-none"
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isFocused = idx === focusedIndex;
            return (
              <li
                key={opt.value ?? idx}
                role="option"
                aria-selected={isSelected}
                className={`px-3 py-1.5 cursor-pointer text-xs ${
                  isFocused ? 'bg-slate-800' : ''
                } ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}
                onMouseEnter={() => setFocusedIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt);
                }}
              >
                {opt.label}
              </li>
            );
          })}
          {options.length === 0 && (
            <li className="px-3 py-1.5 text-[11px] text-slate-500">No options</li>
          )}
        </ul>
      )}
    </div>
  );
}

