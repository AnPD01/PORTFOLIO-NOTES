
import React, { useMemo } from 'react';
import { X, TrendingUp, ArrowUpRight, Percent, Wallet, Coins, Activity } from 'lucide-react';
import { 
  ComposedChart, 
  Line, 
  Area, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { StockHolding } from '../types';

interface StockDetailModalProps {
  stock: StockHolding;
  onClose: () => void;
}

const StockDetailModal: React.FC<StockDetailModalProps> = ({ stock, onClose }) => {
  const data = useMemo(() => {
    const months = ['24.03', '24.04', '24.05', '24.06', '24.07', '24.08', '24.09', '24.10', '24.11', '24.12', '25.01', '25.02'];
    let currentQty = Math.max(1, Math.round(stock.quantity * 0.6));
    
    return months.map((month, i) => {
      if (i > 0 && Math.random() > 0.7) currentQty += Math.round(stock.quantity * 0.1);
      if (i === months.length - 1) currentQty = stock.quantity;

      const priceFactor = 0.8 + (i * 0.02) + (Math.random() * 0.15);
      const simulatedPrice = Math.round(stock.currentPrice * priceFactor);
      
      return {
        date: month,
        evaluation: currentQty * simulatedPrice,
        price: simulatedPrice,
        quantity: currentQty
      };
    });
  }, [stock]);

  const buyAmt = stock.quantity * stock.avgPurchasePrice;
  const evalAmt = stock.quantity * stock.currentPrice;
  const pl = evalAmt - buyAmt;
  const plRate = buyAmt > 0 ? (pl / buyAmt) * 100 : 0;
  const divYield = buyAmt > 0 ? (stock.dividendsReceived / buyAmt) * 100 : 0;
  
  const totalReturnStock = pl + stock.dividendsReceived;
  const totalReturnRateStock = buyAmt > 0 ? (totalReturnStock / buyAmt) * 100 : 0;

  const formatKRW = (num: number) => new Intl.NumberFormat('ko-KR').format(Math.round(num)) + '원';
  const formatPct = (num: number) => num.toFixed(2) + '%';

  const stats = [
    { label: '평가금액', value: formatKRW(evalAmt), icon: <Wallet size={16}/>, color: 'text-slate-900' },
    { label: '평가수익률', value: (pl >= 0 ? '+' : '') + formatPct(plRate), icon: <Activity size={16}/>, color: pl >= 0 ? 'text-rose-500' : 'text-blue-500' },
    { label: '배당금', value: formatKRW(stock.dividendsReceived), icon: <Coins size={16}/>, color: 'text-emerald-600' },
    { label: '배당수익률', value: formatPct(divYield), icon: <Percent size={16}/>, color: 'text-emerald-500' },
    { label: '매도수익', value: '0원', icon: <ArrowUpRight size={16}/>, color: 'text-slate-400' },
    { label: '매도수익률', value: '0.00%', icon: <Percent size={16}/>, color: 'text-slate-400' },
    { label: '총 수익', value: formatKRW(totalReturnStock), icon: <TrendingUp size={16}/>, color: totalReturnStock >= 0 ? 'text-rose-500' : 'text-blue-500' },
    { label: '총 수익률', value: (totalReturnStock >= 0 ? '+' : '') + formatPct(totalReturnRateStock), icon: <Percent size={16}/>, color: totalReturnStock >= 0 ? 'text-rose-500' : 'text-blue-500' },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500"
      onClick={onClose}
    >
      <div 
        className="bg-white/70 rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.1)] w-full max-w-7xl overflow-hidden flex flex-col max-h-[92vh] border border-white/60 animate-in zoom-in-95 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-14 py-10 border-b border-white/40 flex items-center justify-between bg-white/20">
          <div className="flex items-center gap-6">
            <div className="bg-indigo-600 text-white p-5 rounded-[1.8rem] shadow-2xl shadow-indigo-200">
              <TrendingUp size={32} />
            </div>
            <div>
              <div className="flex items-center gap-4">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{stock.name}</h2>
                <span className="bg-white/80 border border-white text-indigo-600 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-sm">{stock.symbol}</span>
              </div>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em] mt-2 opacity-70">{stock.market} MARKET • {stock.account}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-4 bg-white/50 hover:bg-white rounded-[1.5rem] transition-all duration-300 shadow-sm"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-14 scrollbar-hide">
          {/* 그리드 구조를 8열에서 4열로 변경하여 공간 확보 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white/50 p-6 rounded-[2.5rem] border border-white shadow-sm flex flex-col justify-center transition-all hover:bg-white hover:shadow-xl min-h-[120px]">
                <div className="flex items-center gap-2 text-slate-400 mb-3">
                  <span className="opacity-80">{stat.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">{stat.label}</span>
                </div>
                <div className={`text-xl font-black tabular-nums tracking-tight ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white/40 border border-white rounded-[3.5rem] p-12 shadow-sm backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Performance History (12M)</h3>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Simulated Dynamic Evaluation</p>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-full bg-indigo-500/30 border-2 border-indigo-500"/><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Eval</span></div>
                <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-full bg-amber-500 shadow-md shadow-amber-200"/><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Price</span></div>
                <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-full bg-emerald-400 shadow-md shadow-emerald-200"/><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quantity</span></div>
              </div>
            </div>
            
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                  <defs>
                    <linearGradient id="colorEval" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.4)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#94a3b8' }} dy={15}/>
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#94a3b8' }} tickFormatter={(val) => new Intl.NumberFormat('ko-KR', { notation: 'compact' }).format(val)}/>
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#94a3b8' }} tickFormatter={(val) => `${val}주`}/>
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', padding: '20px' }}
                    labelStyle={{ fontWeight: 900, marginBottom: '8px', color: '#1e293b' }}
                  />
                  <Area yAxisId="left" type="monotone" dataKey="evaluation" fill="url(#colorEval)" stroke="#6366f1" strokeWidth={0} />
                  <Bar yAxisId="right" dataKey="quantity" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} opacity={0.5} />
                  <Line yAxisId="left" type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={4} dot={{ r: 6, fill: '#f59e0b', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="px-14 py-10 border-t border-white/40 flex justify-end bg-white/20">
          <button onClick={onClose} className="px-14 py-4 bg-slate-900 text-white rounded-[2rem] font-black text-sm hover:bg-slate-800 active:scale-95 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.15)]">Close Analytics</button>
        </div>
      </div>
    </div>
  );
};

export default StockDetailModal;
