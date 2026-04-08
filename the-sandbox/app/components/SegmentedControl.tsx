'use client';

import React from 'react';

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
}

export default function SegmentedControl<T extends string>({ value, onChange, options, className = '' }: SegmentedControlProps<T>) {
  return (
    <div className={`flex gap-1 bg-gray-100 rounded-xl p-1 ${className}`}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            value === opt.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
