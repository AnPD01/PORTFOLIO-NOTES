
import React, { useMemo } from 'react';
import { X, TrendingUp, Wallet, Coins, Activity, PieChart, Percent, History, Timer, Plus, Minus, Hash } from 'lucide-react';
import { ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { StockHolding, MarketType, TransactionType } from '../types';
import { calculateHoldingStatus } from '../services/portfolioService';

interface StockDetailModalProps {
  stock: StockHolding;
  onClose: () => void;
}

const StockDetailModal: React.FC<StockDetailModalProps> = ({ stock, onClose }) => {
  const { quantity, avgPrice } = calculateHoldingStatus(stock.transactions || []);
  
  const buyAmt = quantity * avgPrice;
  const evalAmt = quantity * stock.currentPrice;
  const pl = evalAmt - buyAmt;
  const plRate = buyAmt > 0 ? (pl / buyAmt) * 100 : 0;
  const dividends = stock.dividendsReceived;
  const myDivYield = buyAmt > 0 ? (dividends / buyAmt) * 100 : 0;
  const totalReturn = pl + dividends;
  const totalReturnRate = buyAmt > 0 ? (totalReturn / buyAmt) * 100 : 0;

  const tradeHistory = useMemo(() => {
    return (stock.transactions || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stock.transactions]);

  const formatCurrency = (num: number) => {
    const symbol = stock.market === MarketType.USA ? '$' : '₩';
    const formatted = new Intl.NumberFormat('ko-KR').format(Math.round(num));
    return stock.market === MarketType.USA ? `${symbol}${formatted}` : `${formatted}원`;
  };

  const stats = [
    { label: '평가금액', value: formatCurrency(evalAmt), icon: <Wallet size={12}/>, color: 'text-slate-900' },
    { label: '평가수익률', value: (plRate >= 0 ? '+' : '') + plRate.toFixed(2) + '%', icon: <Activity size={12}/>, color: plRate >= 0 ? 'text-blue-600' : 'text-rose-600' },
    { label: '배당금', value: formatCurrency(dividends), icon: <Coins size={12}/>, color: 'text-emerald-600' },
    { label: '총 수익률', value: (totalReturnRate >= 0 ? '+' : '') + totalReturnRate.toFixed(2) + '%', icon: <PieChart size={12}/>, color: totalReturnRate >= 0 ? 'text-blue-600' : 'text-rose-600' },
    { label: '보유 수량', value: `${quantity.toLocaleString()}주`, icon: <Hash size={12}/>, color: 'text-amber-600' },
    { label: '평균 단가', value: formatCurrency(avgPrice), icon: <History size={12}/>, color: 'text-slate-400' },
  ];

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-xl z-[100] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white/95 rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] border border-white/60 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div className="px-10 py-6 border-b border-white/40 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 text-white p-3.5 rounded-2xl shadow-xl"><TrendingUp size={22} /></div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{stock.name}</h2>
                <span className="text-[10px] font-black text-indigo-600 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">{stock.symbol}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm flex flex-col justify-between min-h-[100px]">
                <div className="flex items-center gap-2 text-slate-400"><span className="p-1 bg-slate-50 rounded">{stat.icon}</span><span className="text-[9px] font-black uppercase tracking-widest">{stat.label}</span></div>
                <div className={`text-xl font-black tabular-nums tracking-tighter text-right ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white/40 border border-white rounded-[2.5rem] p-6 shadow-sm overflow-hidden relative">
               <h3 className="text-base font-black text-slate-900 mb-6">최근 거래 내역</h3>
               <div className="space-y-4">
                 {tradeHistory.map(trade => (
                   <div key={trade.id} className="flex items-center justify-between p-4 bg-white/80 rounded-2xl border border-white shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${trade.type === TransactionType.BUY ? 'bg-rose-500' : 'bg-blue-500'}`}>
                          {trade.type === TransactionType.BUY ? <Plus size={14} strokeWidth={4}/> : <Minus size={14} strokeWidth={4}/>}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-slate-800">{trade.date}</p>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${trade.type === TransactionType.BUY ? 'text-rose-500' : 'text-blue-500'}`}>{trade.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{formatCurrency(trade.price * trade.quantity)}</p>
                        <p className="text-[9px] font-bold text-slate-400">{trade.quantity}주 @ {formatCurrency(trade.price)}</p>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
            
            <div className="bg-indigo-50/20 border border-indigo-100 rounded-[2.5rem] p-8">
               <h3 className="text-base font-black text-indigo-900 mb-4">투자 인사이트</h3>
               <p className="text-sm font-medium text-slate-600 leading-relaxed">
                  이 종목의 평균 매입가는 {formatCurrency(avgPrice)}이며, 현재 가격 기준 {plRate.toFixed(2)}%의 평가수익을 기록 중입니다. 
                  보유 거래 내역을 통해 본 실현 손익과 배당금을 합산한 종합적인 성과를 관리하세요.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockDetailModal;
