
import React from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  isActive?: boolean;
  onClick?: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, subValue, icon, trend, isActive, onClick }) => {
  const trendColor = trend === 'up' ? 'text-rose-500' : trend === 'down' ? 'text-blue-500' : 'text-slate-400';
  
  // 가독성을 위해 글자수가 많으면 폰트 크기를 줄임
  const valueLength = String(value).length;
  // 10억 단위(₩1,000,000,000) 등 긴 숫자를 고려한 폰트 스케일링
  const fontSizeClass = valueLength > 15 ? 'text-sm' : valueLength > 12 ? 'text-base' : 'text-lg';

  return (
    <button 
      onClick={onClick}
      className={`w-full text-left px-5 py-4 rounded-[1.8rem] border transition-all duration-500 flex flex-col justify-center group outline-none glass-card min-h-[110px] ${
        isActive 
          ? 'bg-indigo-600/95 !border-indigo-400/30 shadow-2xl shadow-indigo-100 ring-1 ring-indigo-400/20' 
          : 'shadow-sm hover:shadow-xl hover:border-indigo-200/50'
      }`}
    >
      <div className="flex items-center justify-between mb-2 w-full">
        <span className={`text-[9px] font-black uppercase tracking-wider ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
          {title}
        </span>
        <div className={`p-1.5 rounded-lg transition-all duration-300 ${isActive ? 'bg-white/20 text-white' : 'bg-white/70 text-slate-400 group-hover:text-indigo-500 shadow-sm border border-slate-100'}`}>
          {React.cloneElement(icon as React.ReactElement, { size: 14 })}
        </div>
      </div>
      <div className="overflow-hidden">
        <h3 className={`${fontSizeClass} font-extrabold tracking-tight tabular-nums transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${isActive ? 'text-white' : 'text-slate-900'}`}>
          {value}
        </h3>
        {subValue && (
          <p className={`text-[9px] mt-0.5 font-bold tracking-wide transition-colors ${isActive ? 'text-indigo-100/80' : trendColor}`}>
            {subValue}
          </p>
        )}
      </div>
    </button>
  );
};

export default DashboardCard;
