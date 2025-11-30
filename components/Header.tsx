import React from 'react';
import { Box } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-5xl">
        <div className="flex items-center gap-2 text-indigo-600">
          <Box className="w-8 h-8" />
          <span className="font-bold text-xl tracking-tight text-slate-900">StarterApp</span>
        </div>
        <nav>
          <ul className="flex gap-6 text-sm font-medium text-slate-600">
            <li><a href="#" className="hover:text-indigo-600 transition-colors">Home</a></li>
            <li><a href="#" className="hover:text-indigo-600 transition-colors">Features</a></li>
            <li><a href="#" className="hover:text-indigo-600 transition-colors">About</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
};