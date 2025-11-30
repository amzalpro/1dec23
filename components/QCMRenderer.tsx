import React, { useState } from 'react';
import { AlertCircle, Sparkles, RotateCcw, ChevronRight, Trophy, XCircle, CheckCircle2, HelpCircle } from 'lucide-react';

interface QCMRendererProps {
  jsonContent: string;
  isPrint?: boolean;
}

export const QCMRenderer: React.FC<QCMRendererProps> = ({ jsonContent, isPrint = false }) => {
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [showScore, setShowScore] = useState(false);

  let questions: any[] = [];
  try {
    questions = JSON.parse(jsonContent);
  } catch (e) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-xs gap-2 bg-slate-50 rounded-xl border border-dashed border-slate-300">
        <AlertCircle size={16}/> Erreur format QCM
      </div>
    );
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm italic bg-slate-50 rounded-xl border border-dashed border-slate-300">
        QCM vide
      </div>
    );
  }

  // --- MODE IMPRESSION (Liste statique propre) ---
  if (isPrint) {
    return (
      <div className="flex flex-col h-full font-sans p-6 bg-white border border-slate-200 rounded-xl">
        <div className="mb-6 border-b-2 border-slate-900 pb-2">
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wider">Quiz d'évaluation</h2>
            <p className="text-xs text-slate-500">Cochez la bonne réponse pour chaque question.</p>
        </div>
        {questions.map((q, idx) => (
          <div key={idx} className="mb-6 break-inside-avoid">
            <div className="flex gap-3 mb-3">
              <span className="flex items-center justify-center w-6 h-6 bg-slate-900 text-white font-bold text-xs rounded-full flex-shrink-0">
                {idx + 1}
              </span>
              <h3 className="font-bold text-slate-900 text-sm leading-snug mt-0.5">{q.question}</h3>
            </div>
            <div className="pl-9 grid grid-cols-1 gap-2">
              {q.options?.map((opt: string, oIdx: number) => (
                <div key={oIdx} className="flex items-center gap-3 text-slate-700 text-sm p-2 border border-slate-200 rounded-lg">
                  <div className="w-4 h-4 border-2 border-slate-400 rounded flex-shrink-0" />
                  <span>{opt}</span>
                </div>
              )) || <div className="text-xs text-red-400">Options manquantes</div>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // --- MODE INTERACTIF (Design App Moderne) ---
  const currentQuestion = questions[currentStep];
  const totalQuestions = questions.length;

  // Safeguard if current question is undefined or malformed
  if (!currentQuestion) {
      return <div className="flex items-center justify-center h-full text-red-500 text-xs">Erreur de chargement de la question</div>;
  }

  const handleAnswer = (optionIndex: number) => {
    if (answers[currentStep] !== undefined) return; // Déjà répondu
    setAnswers(prev => ({...prev, [currentStep]: optionIndex}));
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) correct++;
    });
    return correct;
  };

  if (showScore) {
    const score = calculateScore();
    const percentage = Math.round((score / totalQuestions) * 100);
    
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in bg-white rounded-xl shadow-inner">
            <div className="relative mb-6">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${percentage >= 50 ? 'bg-green-50 border-green-500 text-green-600' : 'bg-red-50 border-red-500 text-red-600'} shadow-lg`}>
                     {percentage === 100 ? <Trophy size={40} /> : <Sparkles size={40} />}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                    {percentage}%
                </div>
            </div>
            
            <h3 className="text-2xl font-bold text-slate-800 mb-1">
                {percentage === 100 ? 'Excellent !' : percentage >= 50 ? 'Bien joué !' : 'À revoir'}
            </h3>
            <p className="text-slate-500 mb-8 font-medium">
                Vous avez obtenu <span className="text-indigo-600 font-bold">{score}</span> sur <span className="text-slate-900">{totalQuestions}</span>
            </p>

            <button 
                onClick={() => {
                    setAnswers({});
                    setCurrentStep(0);
                    setShowScore(false);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all hover:shadow-lg transform hover:-translate-y-0.5"
            >
                <RotateCcw size={16} /> Recommencer le Quiz
            </button>
        </div>
    )
  }

  return (
    <div className="flex flex-col h-full font-sans bg-slate-50/80 rounded-xl overflow-hidden relative group">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '16px 16px'}}>
      </div>

      {/* Header / Progress */}
      <div className="flex flex-col px-6 pt-5 pb-2 z-10">
        <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded shadow-sm border border-indigo-100">
                Question {currentStep + 1} / {totalQuestions}
            </span>
            <HelpCircle size={16} className="text-slate-300" />
        </div>
        {/* Modern Progress Bar */}
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
            {questions.map((_, i) => {
                let color = 'bg-slate-200';
                if (i < currentStep) {
                    // Past question color
                    if (answers[i] === questions[i].correctIndex) color = 'bg-green-500';
                    else color = 'bg-red-400';
                } else if (i === currentStep) {
                    color = 'bg-indigo-600';
                }
                
                return (
                    <div key={i} className={`h-full flex-1 border-r border-white/50 last:border-0 transition-all duration-500 ${color}`} />
                );
            })}
        </div>
      </div>

      {/* Content Card */}
      <div className="flex-1 px-6 py-2 overflow-y-auto flex flex-col justify-center z-10">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-4">
            <h3 className="text-lg font-bold text-slate-800 leading-snug">{currentQuestion.question}</h3>
        </div>
        
        <div className="flex flex-col gap-2.5">
            {currentQuestion.options ? currentQuestion.options.map((opt: string, idx: number) => {
                const isSelected = answers[currentStep] === idx;
                const isAnswered = answers[currentStep] !== undefined;
                const isCorrect = idx === currentQuestion.correctIndex;
                
                let btnClass = "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 shadow-sm";
                let icon = null;

                if (isAnswered) {
                    if (isCorrect) {
                        btnClass = "bg-green-50 border-green-500 text-green-800 shadow-md ring-1 ring-green-500/20";
                        icon = <CheckCircle2 size={18} className="text-green-600" />;
                    } else if (isSelected) {
                        btnClass = "bg-red-50 border-red-500 text-red-800 shadow-sm";
                        icon = <XCircle size={18} className="text-red-500" />;
                    } else {
                        btnClass = "bg-slate-50 border-slate-100 text-slate-400 opacity-60";
                    }
                } else if (isSelected) {
                    btnClass = "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500";
                }

                return (
                    <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        disabled={isAnswered}
                        className={`relative text-left p-3.5 rounded-xl border-2 transition-all duration-200 text-sm font-medium flex items-center justify-between group ${btnClass}`}
                    >
                        <span className="pr-6">{opt}</span>
                        {icon ? icon : <div className={`w-4 h-4 rounded-full border-2 ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 group-hover:border-indigo-400'}`}></div>}
                    </button>
                );
            }) : (
                <div className="text-center text-red-400 text-xs p-4 border border-red-200 rounded bg-red-50">
                    Erreur : Aucune option disponible pour cette question.
                </div>
            )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="p-4 border-t border-slate-200/60 bg-white/50 backdrop-blur-sm flex justify-end items-center z-10">
         <button 
            onClick={() => {
                if (currentStep < totalQuestions - 1) setCurrentStep(prev => prev + 1);
                else setShowScore(true);
            }}
            disabled={answers[currentStep] === undefined}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold shadow-lg shadow-slate-900/20 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:shadow-none transition-all"
         >
            {currentStep === totalQuestions - 1 ? 'Voir Résultats' : 'Suivant'} 
            <ChevronRight size={16} />
         </button>
      </div>
    </div>
  );
};