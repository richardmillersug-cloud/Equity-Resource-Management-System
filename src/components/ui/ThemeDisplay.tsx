'use client';

import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeDisplay() {
  const { theme, actualTheme } = useTheme();

  const getThemeIcon = () => {
    switch (theme) {
      case 'dark': return <Moon className="w-5 h-5" />;
      case 'light': return <Sun className="w-5 h-5" />;
      case 'system': return <Monitor className="w-5 h-5" />;
      default: return <Sun className="w-5 h-5" />;
    }
  };

  const getThemeColor = () => {
    switch (actualTheme) {
      case 'dark': return 'bg-gray-800 text-white border-gray-600';
      case 'light': return 'bg-white text-gray-900 border-gray-200';
      default: return 'bg-white text-gray-900 border-gray-200';
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${getThemeColor()}`}>
      {getThemeIcon()}
      <span className="text-sm font-medium capitalize">
        {theme} {theme === 'system' && `(${actualTheme})`}
      </span>
    </div>
  );
}