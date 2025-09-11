'use client';

import { useEffect, useState } from 'react';

interface HydrationSafeLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export default function HydrationSafeLoader({ 
  size = 'lg', 
  color = 'border-blue-500',
  className = ''
}: HydrationSafeLoaderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-16 w-16',
    lg: 'h-32 w-32'
  };

  // During SSR and initial hydration, show a static version
  if (!isClient) {
    return (
      <div className={`
        rounded-full ${sizeClasses[size]} border-2 border-gray-200 mx-auto mb-4 ${className}
      `} />
    );
  }

  // After hydration, show the animated version
  return (
    <div className={`
      animate-spin rounded-full ${sizeClasses[size]} border-b-2 ${color} mx-auto mb-4 ${className}
    `} />
  );
}



