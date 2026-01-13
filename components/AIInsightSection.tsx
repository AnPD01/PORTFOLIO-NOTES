
import React, { useState, useMemo } from 'react';
import { Sparkles, RefreshCcw, BrainCircuit, Lightbulb, TrendingUp, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface AIInsightSectionProps {
  advice: string;
  isAnalyzing: boolean;
  onAnalyze: () => void;
}

const AIInsightSection: React.FC<AIInsightSectionProps> = ({ advice, isAnalyzing, onAnalyze }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 첫 번째 단락이나 일정 길이까지만 요약본으로 추출
  const summary = useMemo(() => {
    if (!advice) return "";
    const paragraphs = advice.split('\n').filter(p => p.trim().length > 0);
    return paragraphs[0] || advice.substring(0, 150) + "...";
  }, [advice]);

  return (
    <div className="mb-10 relative group">
      {/* Background Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-[3rem] blur-xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
      
      <div className={`relative glass-panel rounded-[3rem] overflow-hidden border border-white/60 bg-white/40 backdrop-blur-3xl shadow-2xl shadow-indigo-100/20 transition-all duration-500 ${isExpanded ? 'max-h-[1500px]' : 'max-h-[500px]'}`}>
        <div className="p-8 sm:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className={`p-3.5 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 ${isAnalyzing ? 'animate-pulse' : ''}`}>
                  <Sparkles size={24} className={isAnalyzing ? 'animate-spin-slow' : ''} />
                </div>
                {isAnalyzing && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-ping"></div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">AI 포트폴리오 인사이트</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Smart Portfolio Intelligence</p>
              </div>
            </div>

            <button 
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-xs transition-all shadow-xl active:scale-95 ${
                isAnalyzing 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100 shadow-indigo-100/50'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCcw size={16} className="animate-spin" />
                  <span>분석 중...</span>
                </>
              ) : (
                <>
                  <BrainCircuit size={16} />
                  <span>새로 분석하기</span>
                </>
              )}
            </button>
          </div>

          <div className="relative">
            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                </div>
                <p className="text-xs font-bold text-slate-500 animate-pulse uppercase tracking-widest">포트폴리오 자산을 정밀 분석하고 있습니다</p>
              </div>
            ) : advice ? (
              <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-700">
                <div className="relative">
                  <div className={`prose prose-slate max-w-none transition-all duration-700 ${!isExpanded ? 'max-h-[100px] overflow-hidden' : ''}`}>
                    <div className="flex items-start gap-4 p-6 bg-white/40 rounded-[2rem] border border-white/60">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded-lg mt-0.5 flex-shrink-0">
                        <Lightbulb size={16} />
                      </div>
                      <div className="text-slate-700 font-semibold leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                        {isExpanded ? advice : summary}
                      </div>
                    </div>
                  </div>
                  
                  {/* 요약 모드일 때 하단 페이드 효과 */}
                  {!isExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/40 to-transparent pointer-events-none"></div>
                  )}
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <TrendingUp size={14} />
                    <span>Data-driven Recommendations</span>
                  </div>
                  
                  <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-[11px] uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp size={16} />
                        <span>요약 보기</span>
                      </>
                    ) : (
                      <>
                        <FileText size={16} />
                        <span>전체 리포트 읽기</span>
                      </>
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-6 pt-4 border-t border-slate-200/50 flex justify-end">
                    <span className="text-[9px] font-bold text-slate-300 italic">Gemini 3.0 Pro Intelligence Engine</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-12 opacity-60">
                <div className="w-14 h-14 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                  <BrainCircuit size={28} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-500">분석 준비 완료</p>
                  <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">상단의 버튼을 눌러 AI 분석을 시작하세요</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsightSection;
