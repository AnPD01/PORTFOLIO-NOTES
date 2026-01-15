
import React, { useMemo } from 'react';
import { X, TrendingUp, Wallet, Coins, Activity, BarChart2, PieChart, ArrowUpRight, Percent, History, Timer, Plus, Minus, Hash } from 'lucide-react';
import { 
  ComposedChart, 
  Line, 
  Area, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { StockHolding, MarketType } from '../types';

interface StockDetailModalProps {
  stock: StockHolding;
  onClose: () => void;
}

const StockDetailModal: React.FC<StockDetailModalProps> = ({ stock, onClose }) => {
  const buyAmt = stock.quantity * stock.avgPurchasePrice;
  const evalAmt = stock.quantity * stock.currentPrice;
  const pl = evalAmt - buyAmt;
  const plRate = buyAmt > 0 ? (pl / buyAmt) * 100 : 0;
  const dividends = stock.dividendsReceived;
  const divYield = stock.dividendYield || 0;

  const totalReturn = pl + dividends;
  const totalReturnRate = buyAmt > 0 ? (totalReturn / buyAmt) * 100 : 0;

  // 12개월 평균값
  const avgMonthlyROI = plRate / 12;
  const avgMonthlyDiv = dividends / 12;
  const avgMonthlyYield = divYield / 12;
  const avgMonthlyTotalROI = totalReturnRate / 12;

  // 차트 데이터 구성 (매수 시점 vs 현재 시점)
  const chartData = useMemo(() => {
    const pDate = new Date(stock.purchaseDate).toISOString().split('T')[0].substring(2).replace(/-/g, '.');
    const todayStr = new Date().toISOString().split('T')[0].substring(2).replace(/-/g, '.');

    return [
      {
        date: pDate,
        evaluation: buyAmt,
        totalReturn: 0,
        quantity: stock.quantity,
      },
      {
        date: todayStr,
        evaluation: evalAmt,
        totalReturn: totalReturn,
        quantity: stock.quantity,
      }
    ];
  }, [stock, buyAmt, evalAmt, totalReturn]);

  const tradeHistory = useMemo(() => {
    return [
      {
        id: '1',
        date: stock.purchaseDate,
        type: '매수',
        quantity: stock.quantity,
        price: stock.avgPurchasePrice,
        amount: stock.quantity * stock.avgPurchasePrice
      }
    ];
  }, [stock]);

  const formatCurrency = (num: number) => {
    const symbol = stock.market === MarketType.USA ? '$' : '₩';
    const formatted = new Intl.NumberFormat('ko-KR').format(Math.round(num));
    return stock.market === MarketType.USA ? `${symbol}${formatted}` : `${formatted}원`;
  };

  const formatPercent = (num: number) => (num >= 0 ? '+' : '') + num.toFixed(2) + '%';
  const getTrendValueColor = (val: number) => val >= 0 ? 'text-blue-600' : 'text-rose-600';

  const stats = [
    { label: '평가금액', value: formatCurrency(evalAmt), icon: <Wallet size={12}/>, color: 'text-slate-900' },
    { label: '평가수익률', value: formatPercent(plRate), icon: <Activity size={12}/>, color: getTrendValueColor(plRate), monthlyAvg: formatPercent(avgMonthlyROI) },
    { label: '배당금', value: formatCurrency(dividends), icon: <Coins size={12}/>, color: 'text-emerald-600', monthlyAvg: formatCurrency(avgMonthlyDiv) },
    { label: '배당수익률', value: formatPercent(divYield), icon: <Percent size={12}/>, color: 'text-emerald-500', monthlyAvg: formatPercent(avgMonthlyYield) },
    { label: '총 수익', value: formatCurrency(totalReturn), icon: <TrendingUp size={12}/>, color: getTrendValueColor(totalReturn) },
    { label: '총 수익률', value: formatPercent(totalReturnRate), icon: <PieChart size={12}/>, color: getTrendValueColor(totalReturnRate), monthlyAvg: formatPercent(avgMonthlyTotalROI) },
    { label: '보유 수량', value: `${stock.quantity.toLocaleString()}주`, icon: <Hash size={12}/>, color: 'text-amber-600' },
    { label: '매수 평단', value: formatCurrency(stock.avgPurchasePrice), icon: <History size={12}/>, color: 'text-slate-400' },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500"
      onClick={onClose}
    >
      <div 
        className="bg-white/95 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.15)] w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] border border-white/60 animate-in zoom-in-95 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="px-10 py-6 border-b border-white/40 flex items-center justify-between bg-white/40">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 text-white p-3.5 rounded-2xl shadow-xl shadow-indigo-100">
              <TrendingUp size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{stock.name}</h2>
                <span className="bg-white border border-slate-100 text-indigo-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">{stock.symbol}</span>
              </div>
              <p className="text-slate-400 font-bold text-[9px] uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                <span>{stock.market} MARKET</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-slate-200"></div>)}
                </div>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/70 hover:bg-white rounded-xl transition-all shadow-sm border border-slate-100"><X size={20} className="text-slate-400"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide space-y-8">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white/60 p-4 rounded-2xl border border-white shadow-sm transition-all hover:bg-white hover:shadow-md group flex flex-col justify-between min-h-[100px]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-indigo-500 transition-colors">
                    <span className="p-1.5 bg-slate-50 rounded-lg">{stat.icon}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest">{stat.label}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-lg font-black tabular-nums tracking-tighter ${stat.color}`}>{stat.value}</div>
                  
                  {stat.monthlyAvg !== undefined ? (
                    <div className="mt-1 flex items-center justify-end gap-1 opacity-70">
                      <Timer size={8} className="text-slate-400" />
                      <span className={`text-[10px] font-bold tabular-nums ${stat.color}`}>{stat.monthlyAvg}</span>
                    </div>
                  ) : (
                    <div className="h-4" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Section */}
            <div className="lg:col-span-2 bg-white/50 border border-white rounded-[2.5rem] p-8 shadow-sm backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">성과 입체 분석</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-[0.2em]">Evaluation / Return / Quantity Combined</p>
                </div>
              </div>
              
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <defs>
                      <linearGradient id="colorEval" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.02)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} 
                      dy={10}
                    />
                    {/* 좌측 Y축: 금액 (평가액, 수익) */}
                    <YAxis 
                      yAxisId="left" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 800, fill: '#6366f1' }} 
                      tickFormatter={(val) => new Intl.NumberFormat('ko-KR', { notation: 'compact' }).format(val)}
                      label={{ value: '금액', angle: -90, position: 'insideLeft', style: { fontSize: '10px', fontWeight: 900, fill: '#94a3b8' } }}
                    />
                    {/* 우측 Y축: 수량 */}
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 800, fill: '#f59e0b' }} 
                      label={{ value: '수량', angle: 90, position: 'insideRight', style: { fontSize: '10px', fontWeight: 900, fill: '#94a3b8' } }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '20px', 
                        border: 'none', 
                        background: 'rgba(255,255,255,0.98)', 
                        backdropFilter: 'blur(10px)', 
                        boxShadow: '0 20px 40px rgba(0,0,0,0.08)', 
                        padding: '16px' 
                      }}
                      labelStyle={{ fontWeight: 900, marginBottom: '6px', color: '#1e293b', fontSize: '12px' }}
                      itemStyle={{ fontSize: '11px', fontWeight: 700, padding: '2px 0' }}
                      formatter={(value: any, name: string) => {
                        if (name === '보유 수량') return [`${value.toLocaleString()}주`, name];
                        return [formatCurrency(Number(value)), name];
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    />
                    
                    {/* 총 평가금액 (영역) */}
                    <Area 
                      yAxisId="left" 
                      name="총 평가금액"
                      type="monotone" 
                      dataKey="evaluation" 
                      fill="url(#colorEval)" 
                      stroke="#6366f1" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                    />
                    
                    {/* 총 수익 (막대) */}
                    <Bar 
                      yAxisId="left" 
                      name="총 수익"
                      dataKey="totalReturn" 
                      barSize={40}
                      fill={totalReturn >= 0 ? "#10b981" : "#ef4444"}
                      radius={[6, 6, 0, 0]}
                    />

                    {/* 보유 수량 (우측 Y축 선) */}
                    <Line 
                      yAxisId="right" 
                      name="보유 수량"
                      type="step" 
                      dataKey="quantity" 
                      stroke="#f59e0b" 
                      strokeWidth={3} 
                      dot={{ r: 5, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trading History Section */}
            <div className="bg-white/40 border border-white rounded-[2.5rem] p-6 shadow-sm backdrop-blur-md overflow-hidden relative">
              <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg">
                  <History size={16} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">거래 내역</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-[0.2em]">Transaction Timeline</p>
                </div>
              </div>

              <div className="space-y-5 relative before:absolute before:inset-0 before:left-[10px] before:w-px before:bg-slate-100/80 before:z-0 ml-1">
                {tradeHistory.map((trade) => (
                  <div key={trade.id} className="relative z-10 flex items-center gap-3 group">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0 transition-transform group-hover:scale-125 z-10 ${trade.type === '매수' ? 'bg-rose-500 text-white' : 'bg-blue-500 text-white'}`}>
                      {trade.type === '매수' ? <Plus size={8} strokeWidth={5} /> : <Minus size={8} strokeWidth={5} />}
                    </div>
                    
                    <div className="flex-1 bg-white/60 p-3.5 rounded-2xl border border-white/60 flex items-center justify-between group-hover:bg-white group-hover:shadow-md group-hover:border-indigo-100 transition-all min-w-0">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-black text-slate-800 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis block">
                          {trade.date}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                          <span className={`text-[9px] font-black uppercase tracking-widest flex-shrink-0 ${trade.type === '매수' ? 'text-rose-500' : 'text-blue-500'}`}>{trade.type}</span>
                          <span className="w-0.5 h-0.5 rounded-full bg-slate-200"></span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight flex-shrink-0">{trade.quantity}주</span>
                        </div>
                      </div>
                      <div className="text-right pl-3 flex-shrink-0">
                        <div className="text-[12px] font-black text-slate-900 tabular-nums tracking-tighter">
                          {formatCurrency(trade.amount)}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 mt-0.5 tabular-nums">
                          @ {formatCurrency(trade.price)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockDetailModal;
