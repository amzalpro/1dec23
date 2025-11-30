import React, { useState, useMemo } from 'react';
import { Trophy, RotateCcw, AlertCircle } from 'lucide-react';

interface Point {
  x: number;
  y: number;
  label: number;
}

interface ConnectDotsRendererProps {
  jsonContent: string;
  isPrint?: boolean;
}

export const ConnectDotsRenderer: React.FC<ConnectDotsRendererProps> = ({ jsonContent, isPrint = false }) => {
  const [nextNumber, setNextNumber] = useState(1);
  const [lines, setLines] = useState<Point[]>([]);
  const [completed, setCompleted] = useState(false);

  const points: Point[] = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (Array.isArray(parsed)) {
        return parsed.map((p: any, i: number) => ({
          x: Number(p.x),
          y: Number(p.y),
          label: i + 1
        }));
      }
      return [];
    } catch (e) {
      return [];
    }
  }, [jsonContent]);

  if (points.length === 0) {
      return <div className="flex items-center justify-center h-full text-red-400 text-xs gap-2"><AlertCircle size={14}/> Erreur données points</div>;
  }

  const handlePointClick = (point: Point) => {
    if (isPrint || completed) return;

    if (point.label === nextNumber) {
      if (point.label > 1) {
          const prevPoint = points.find(p => p.label === point.label - 1);
          if (prevPoint) {
              setLines(prev => [...prev, point]);
          }
      }
      
      if (point.label === points.length) {
        // Close the loop if needed, or just finish
        // Let's close loop to first point if it's a shape
        const firstPoint = points[0];
        setLines(prev => [...prev, firstPoint]);
        setCompleted(true);
      } else {
        setNextNumber(point.label + 1);
      }
    }
  };

  const reset = () => {
      setNextNumber(1);
      setLines([]);
      setCompleted(false);
  };

  // SVG Scaling
  // Points are 0-100 based. SVG viewBox 0 0 100 100
  
  return (
    <div className="w-full h-full bg-white relative flex flex-col">
        {!isPrint && completed && (
            <div className="absolute inset-0 z-20 bg-white/80 flex flex-col items-center justify-center animate-in fade-in">
                <Trophy className="text-yellow-500 w-16 h-16 mb-2 drop-shadow-md" />
                <h3 className="text-xl font-bold text-slate-800 mb-4">Bravo !</h3>
                <button onClick={(e) => { e.stopPropagation(); reset(); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition-colors">
                    <RotateCcw size={16} /> Recommencer
                </button>
            </div>
        )}

        <div className="flex-1 relative">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full absolute inset-0">
                {/* User Drawn Lines */}
                <polyline 
                    points={isPrint ? "" : [points[0], ...lines].map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="0.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300"
                />
                
                {/* Dots */}
                {points.map((p) => (
                    <g 
                        key={p.label} 
                        onClick={(e) => { e.stopPropagation(); handlePointClick(p); }}
                        className={`${!isPrint && !completed ? 'cursor-pointer hover:opacity-80' : ''}`}
                    >
                        <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r={isPrint ? 0.5 : 1.5} 
                            fill={(!isPrint && p.label < nextNumber) ? "#4f46e5" : "#cbd5e1"} 
                            stroke="white"
                            strokeWidth="0.2"
                            className="transition-colors duration-200"
                        />
                        <text 
                            x={p.x} 
                            y={p.y - 2} 
                            textAnchor="middle" 
                            fontSize="3" 
                            fill="#64748b" 
                            className="select-none pointer-events-none font-sans font-bold"
                        >
                            {p.label}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
        
        {isPrint && (
            <div className="absolute bottom-2 right-2 text-[10px] text-slate-400">
                Relie les points de 1 à {points.length}
            </div>
        )}
    </div>
  );
};