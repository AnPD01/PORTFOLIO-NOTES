
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
  // 사용자 요청: 마이너스(-)는 빨간색(rose), 플러스(+)는 파란색(blue)
  const trendColor = trend === 'up' ? 'text-blue-500' : trend === 'down' ? 'text-rose-500' : 'text-slate-400';
  const valueTrendColor = trend === 'up' ? 'text-blue-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-900';
  
  const valueLength = String(value).length;
  const fontSizeClass = valueLength > 15 ? 'text-[13px]' : valueLength > 12 ? 'text-[15px]' : 'text-[17px]';

  return (
    <button 
      onClick={onClick}
      className={`w-full text-left px-5 py-4 rounded-[1.8rem] border transition-all duration-500 flex flex-col justify-center group outline-none glass-card min-h-[105px] ${
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
          {/* Fix: Check if icon exists and is a valid React element, then cast to allow the 'size' property to avoid TS error */}
          {icon && React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 14 }) : icon}
        </div>
      </div>
      <div className="overflow-hidden">
        <h3 className={`${fontSizeClass} font-black tracking-tighter tabular-nums transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${isActive ? 'text-white' : valueTrendColor}`}>
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
