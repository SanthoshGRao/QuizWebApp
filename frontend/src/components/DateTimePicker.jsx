import React from 'react';

/**
 * Beautified date and time picker with icon and modern styling.
 */
export function DateTimePicker({ value, onChange, min, max, id, required, className = '' }) {
  return (
    <div className={`datetime-picker-wrapper group ${className}`}>
      <div className="relative flex items-center">
        <span className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-400 transition-colors" aria-hidden>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </span>
        <input
          id={id}
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          required={required}
          className="datetime-input w-full h-11 pl-11 pr-4 text-sm font-medium tracking-normal"
          style={{ lineHeight: '1.4' }}
        />
      </div>
    </div>
  );
}
