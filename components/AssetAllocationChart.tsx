
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { StockHolding, MarketType } from '../types';

interface AssetAllocationChartProps {
  holdings: StockHolding[];
}

// 애플 리퀴드 글라스 테마 확장 컬러셋
export const ASSET_COLORS: Record<string, string> = {
  "미국 주식": '#6366f1',          // Indigo
  "해외투자 국내 ETF": '#8b5cf6',   // Violet
  "국내 주식": '#10b981',          // Emerald
  "리츠": '#ec4899',               // Pink
  "국내 채권": '#f59e0b',          // Amber
  "미국 채권": '#3b82f6',          // Blue
};

export const getAssetCategory = (stock: StockHolding): string => {
  const name = stock.name;
  const symbol = stock.symbol.toUpperCase();
  
  // 1. 리츠 분류 (국내/해외 통합)
  const reitKeywords = ['리츠', 'REIT', '맥쿼리', '리얼티인컴', 'O', 'STAG', 'VICI'];
  if (reitKeywords.some(k => name.includes(k) || symbol.includes(k))) return "리츠";

  // 2. 채권 분류
  const bondKeywords = ['채권', '국채', 'BOND', 'TREASURY', 'TLT', 'IEF', 'SHY', 'EDV', 'VGLT', 'BND', 'AGG', '국고채', 'KTB'];
  const isBond = bondKeywords.some(k => name.toUpperCase().includes(k) || symbol.includes(k));
  
  if (isBond) {
    if (stock.market === MarketType.USA || name.includes('미국')) return "미국 채권";
    return "국내 채권";
  }

  // 3. 주식 및 ETF 분류
  if (stock.market === MarketType.USA) return "미국 주식";

  const overseasKeywords = ['미국', '나스닥', 'S&P', '해외', '다우존스', '차이나', '유럽', '일본', '항셍', '베트남', '인도'];
  if (overseasKeywords.some(k => name.includes(k))) return "해외투자 국내 ETF";

  return "국내 주식";
};

const AssetAllocationChart: React.FC<AssetAllocationChartProps> = ({ holdings }) => {
  const dataMap = holdings.reduce((acc, stock) => {
    const value = stock.quantity * stock.currentPrice;
    const category = getAssetCategory(stock);
    acc[category] = (acc[category] || 0) + value;
    return acc;
  }, {} as Record<string, number>);

  const categories = ["미국 주식", "해외투자 국내 ETF", "국내 주식", "리츠", "미국 채권", "국내 채권"];
  const data = categories
    .map(name => ({ name, value: dataMap[name] || 0 }))
    .filter(item => item.value > 0);

  return (
    <div className="h-56 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={6}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry) => (
              <Cell 
                key={`cell-${entry.name}`} 
                fill={ASSET_COLORS[entry.name]} 
                className="hover:opacity-80 transition-opacity duration-300 cursor-pointer"
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              borderRadius: '20px', 
              border: 'none', 
              background: 'rgba(255,255,255,0.95)', 
              backdropFilter: 'blur(16px)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              padding: '12px 16px'
            }}
            itemStyle={{ fontWeight: 900, fontSize: '11px' }}
            formatter={(value: number) => new Intl.NumberFormat('ko-KR').format(value) + '원'}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Strategy</p>
      </div>
    </div>
  );
};

export default AssetAllocationChart;
