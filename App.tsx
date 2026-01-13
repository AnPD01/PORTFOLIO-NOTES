
import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Wallet,
  BarChart3,
  Target,
  Coins,
  ArrowUpRight,
  Banknote,
  Info,
  ScrollText
} from 'lucide-react';
import { INITIAL_HOLDINGS } from './constants';
import { AssetHolding, MarketType, AssetType, CashBalance } from './types';
import DashboardCard from './components/DashboardCard';
import StockTable from './components/StockTable';
import TrendChart from './components/TrendChart';
import AddStockModal from './components/AddStockModal';
import AddBondModal from './components/AddBondModal';
import AIInsightSection from './components/AIInsightSection';
import { getPortfolioAdvice } from './services/geminiService';

const EXCHANGE_RATE = 1350;

const App: React.FC = () => {
  const [holdings, setHoldings] = useState<AssetHolding[]>(INITIAL_HOLDINGS);
  const [realizedProfits, setRealizedProfits] = useState<Record<string, number>>({});
  const [cashBalances, setCashBalances] = useState<Record<string, CashBalance>>({
    '삼성증권 ISA': { krw: 5420000, usd: 0 },
    '키움 해외주식': { krw: 1250, usd: 120 },
    '미래에셋 연금': { krw: 3200000, usd: 0 }
  });
  const [advice, setAdvice] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isBondModalOpen, setIsBondModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'totalAsset' | 'unrealizedProfit' | 'tradingProfit' | 'dividendIncome' | 'totalReturn' | 'totalCash'>('totalAsset');
  const [timeScale, setTimeScale] = useState<'monthly' | 'yearly'>('monthly');
  const [openAccount, setOpenAccount] = useState<string | null>(INITIAL_HOLDINGS[0]?.account || null);

  const summary = useMemo(() => {
    let purchase: number = 0;
    let evaluation: number = 0;
    let totalDividendsOrInterest: number = 0;
    let autoCalculatedIncomeByAccount: Record<string, { krw: number, usd: number }> = {};

    const now = new Date();

    holdings.forEach((h: AssetHolding) => {
      const rate = h.market === MarketType.USA ? EXCHANGE_RATE : 1;
      
      let currentVal = h.quantity * h.currentPrice;
      let automatedIncome = 0;

      // 자동 수익 계산 (매수일 기준 보유 일수 계산)
      const pDate = new Date(h.purchaseDate);
      const daysHeld = Math.floor((now.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (h.type === AssetType.BOND && h.bondConfig) {
        // 채권 이자: 액면가 * 수량 * (표면금리/100) * (보유일/365)
        if (daysHeld > 0) {
          automatedIncome = (h.bondConfig.faceValue * h.quantity * (h.bondConfig.couponRate / 100) / 365) * daysHeld;
        }
      } else if (h.type === AssetType.STOCK && h.dividendYield) {
        // 주식 배당: 평가액 * (배당률/100) * (보유일/365)
        if (daysHeld > 0) {
          automatedIncome = (currentVal * (h.dividendYield / 100) / 365) * daysHeld;
        }
      }

      // 계좌별 자동 수익 누적 (예수금 반영용)
      if (!autoCalculatedIncomeByAccount[h.account]) autoCalculatedIncomeByAccount[h.account] = { krw: 0, usd: 0 };
      if (h.market === MarketType.USA) {
        autoCalculatedIncomeByAccount[h.account].usd += automatedIncome;
      } else {
        autoCalculatedIncomeByAccount[h.account].krw += automatedIncome;
      }

      purchase += (h.quantity * h.avgPurchasePrice) * rate;
      evaluation += (currentVal + automatedIncome) * rate;
      totalDividendsOrInterest += (h.dividendsReceived + automatedIncome) * rate;
    });

    // 전체 예수금 계산 (계좌 잔액 + 해당 계좌에서 발생한 자동 수익)
    // FIX: Cast Object.entries to explicit type to fix 'unknown' property errors on 'cash'
    const totalCashKRW = (Object.entries(cashBalances) as [string, CashBalance][]).reduce((sum, [account, cash]) => {
      const autoIncome = autoCalculatedIncomeByAccount[account] || { krw: 0, usd: 0 };
      const actualKrw = cash.krw + autoIncome.krw;
      const actualUsd = cash.usd + autoIncome.usd;
      return sum + actualKrw + (actualUsd * EXCHANGE_RATE);
    }, 0);

    const totalRealizedTrading = (Object.values(realizedProfits) as number[]).reduce((sum, val) => sum + val, 0);
    const unrealizedPL = evaluation - purchase;
    const totalReturn = unrealizedPL + totalRealizedTrading + totalDividendsOrInterest;
    const totalReturnRate = purchase > 0 ? (totalReturn / purchase) * 100 : 0;

    return {
      totalPurchaseAmount: purchase,
      totalEvaluationAmount: evaluation + totalCashKRW,
      totalUnrealizedProfit: unrealizedPL,
      totalRealizedProfit: totalRealizedTrading,
      totalDividends: totalDividendsOrInterest,
      totalReturnAmount: totalReturn,
      totalReturnRate: totalReturnRate,
      totalCash: totalCashKRW,
      autoCalculatedIncomeByAccount // 자식 컴포넌트 전달용
    };
  }, [holdings, realizedProfits, cashBalances]);

  const handleUpdateCash = (account: string, amount: number, currency: 'KRW' | 'USD') => {
    setCashBalances(prev => {
      const current = prev[account] || { krw: 0, usd: 0 };
      return {
        ...prev,
        [account]: {
          ...current,
          krw: currency === 'KRW' ? current.krw + amount : current.krw,
          usd: currency === 'USD' ? current.usd + amount : current.usd
        }
      };
    });
  };

  const handleAdjustHolding = (id: string, type: 'buy' | 'sell', qty: number, price: number) => {
    setHoldings(prev => prev.map(h => {
      if (h.id !== id) return h;
      
      const newQty = type === 'buy' ? h.quantity + qty : h.quantity - qty;
      if (newQty < 0) return h;

      let newAvg = h.avgPurchasePrice;
      if (type === 'buy' && newQty > 0) {
        newAvg = (h.quantity * h.avgPurchasePrice + qty * price) / newQty;
      }

      return {
        ...h,
        quantity: newQty,
        avgPurchasePrice: newAvg,
        lastUpdated: new Date().toISOString()
      };
    }));
  };

  const handleAnalyzePortfolio = async () => {
    if (holdings.length === 0) return;
    setIsAnalyzing(true);
    try {
      const result = await getPortfolioAdvice(holdings);
      setAdvice(result || "분석 결과를 가져올 수 없습니다.");
    } catch (error) {
      setAdvice("AI 분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (holdings.length > 0 && !advice) handleAnalyzePortfolio();
  }, []);

  const handleAddAsset = (newAsset: AssetHolding) => {
    setHoldings(prev => [...prev, newAsset]);
    setIsStockModalOpen(false);
    setIsBondModalOpen(false);
  };

  const handleDeleteAsset = (id: string) => {
    const asset = holdings.find(h => h.id === id);
    if (!asset) return;
    const isConfirmed = window.confirm("삭제를 하게되면 지금까지 종목에 대한 기록이 모두 삭제됩니다. 삭제하시겠습니까?");
    if (isConfirmed) {
      setHoldings(prev => prev.filter(h => h.id !== id));
    }
  };

  const formatKRW = (num: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(num);

  const groupedHoldings = useMemo(() => {
    const groups: Record<string, AssetHolding[]> = {};
    holdings.forEach(h => {
      if (!groups[h.account]) groups[h.account] = [];
      groups[h.account].push(h);
    });
    return groups;
  }, [holdings]);

  const trendData = useMemo(() => {
    const baseValue = {
      totalAsset: summary.totalEvaluationAmount,
      unrealizedProfit: summary.totalUnrealizedProfit,
      tradingProfit: summary.totalRealizedProfit,
      dividendIncome: summary.totalDividends,
      totalReturn: summary.totalReturnAmount,
      totalCash: summary.totalCash
    }[selectedMetric];
    const months = ['24.03', '24.04', '24.05', '24.06', '24.07', '24.08', '24.09', '24.10', '24.11', '24.12', '25.01', '25.02'];
    return months.map((date, i) => ({ date, value: Math.round(baseValue * (0.8 + i * 0.02 + Math.random() * 0.1)) }));
  }, [summary, selectedMetric]);

  return (
    <div className="min-h-screen pb-24 font-sans tracking-tight">
      <header className="bg-white/70 backdrop-blur-2xl border-b border-white/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-[1.4rem] text-white shadow-2xl shadow-indigo-200">
              <BarChart3 size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">PORTFOLIO NOTES</h1>
              <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.4em]">Asset Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsBondModalOpen(true)}
              className="flex items-center gap-2.5 px-8 py-4 bg-violet-600 text-white rounded-[1.4rem] hover:bg-violet-700 transition-all font-black text-xs shadow-2xl shadow-violet-100 active:scale-95 border-b-4 border-violet-800 group"
            >
              <ScrollText size={18} className="group-hover:rotate-12 transition-transform" />
              <span>채권 추가</span>
            </button>
            <button 
              onClick={() => setIsStockModalOpen(true)}
              className="flex items-center gap-2.5 px-8 py-4 bg-indigo-600 text-white rounded-[1.4rem] hover:bg-indigo-700 transition-all font-black text-xs shadow-2xl shadow-indigo-100 active:scale-95 border-b-4 border-indigo-800 group"
            >
              <TrendingUp size={18} className="group-hover:scale-110 transition-transform" />
              <span>주식 추가</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 sm:px-10 py-10">
        <div className="flex justify-end mb-6">
          <div className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50/50 rounded-full border border-indigo-100/50 backdrop-blur-sm">
            <Info size={14} className="text-indigo-400" />
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest tabular-nums">현재 기준 환율: ₩{new Intl.NumberFormat('ko-KR').format(EXCHANGE_RATE)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-12">
          <DashboardCard title="자산 총액" value={formatKRW(summary.totalEvaluationAmount)} icon={<Wallet size={20} />} isActive={selectedMetric === 'totalAsset'} onClick={() => setSelectedMetric('totalAsset')} />
          <DashboardCard title="전체 예수금" value={formatKRW(summary.totalCash)} icon={<Banknote size={20} />} isActive={selectedMetric === 'totalCash'} onClick={() => setSelectedMetric('totalCash')} />
          <DashboardCard title="미실현 손익" value={formatKRW(summary.totalUnrealizedProfit)} trend={summary.totalUnrealizedProfit >= 0 ? 'up' : 'down'} icon={<TrendingUp size={20} />} isActive={selectedMetric === 'unrealizedProfit'} onClick={() => setSelectedMetric('unrealizedProfit')} />
          <DashboardCard title="매매 수익" value={formatKRW(summary.totalRealizedProfit)} trend={summary.totalRealizedProfit >= 0 ? 'up' : 'down'} icon={<ArrowUpRight size={20} />} isActive={selectedMetric === 'tradingProfit'} onClick={() => setSelectedMetric('tradingProfit')} />
          <DashboardCard title="배당/이자" value={formatKRW(summary.totalDividends)} icon={<Coins size={20} />} isActive={selectedMetric === 'dividendIncome'} onClick={() => setSelectedMetric('dividendIncome')} />
          <DashboardCard title="종합 수익률" value={summary.totalReturnRate.toFixed(2) + '%'} trend={summary.totalReturnAmount >= 0 ? 'up' : 'down'} icon={<Target size={20} />} isActive={selectedMetric === 'totalReturn'} onClick={() => setSelectedMetric('totalReturn')} />
        </div>

        <div className="glass-panel p-12 rounded-[3.5rem] mb-12 overflow-hidden relative border border-white/60 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-10 relative z-10">
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter">자산 추이 분석</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Historical Growth Pattern</p>
            </div>
            <div className="flex bg-slate-100/60 p-1.5 rounded-2xl backdrop-blur-sm border border-slate-200/50 shadow-inner">
              <button onClick={() => setTimeScale('monthly')} className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${timeScale === 'monthly' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>12개월</button>
              <button onClick={() => setTimeScale('yearly')} className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${timeScale === 'yearly' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>전체</button>
            </div>
          </div>
          <TrendChart data={trendData} title={selectedMetric} subtitle={timeScale} />
        </div>

        <AIInsightSection advice={advice} isAnalyzing={isAnalyzing} onAnalyze={handleAnalyzePortfolio} />

        <div className="space-y-4">
          {Object.entries(groupedHoldings).map(([account, assets]) => (
            <StockTable 
              key={account} 
              title={account} 
              holdings={assets} 
              isOpen={openAccount === account}
              onToggle={() => setOpenAccount(openAccount === account ? null : account)}
              onDelete={handleDeleteAsset}
              cashBalance={cashBalances[account] || { krw: 0, usd: 0 }}
              onUpdateCash={(amount, currency) => handleUpdateCash(account, amount, currency)}
              onAdjustHolding={handleAdjustHolding}
              realizedProfit={realizedProfits[account]}
              portfolioTotalEval={summary.totalEvaluationAmount}
              autoIncome={summary.autoCalculatedIncomeByAccount[account]}
            />
          ))}
        </div>
      </main>

      {isStockModalOpen && <AddStockModal onClose={() => setIsStockModalOpen(false)} onAdd={handleAddAsset} existingAccounts={Object.keys(cashBalances)} />}
      {isBondModalOpen && <AddBondModal onClose={() => setIsBondModalOpen(false)} onAdd={handleAddAsset} existingAccounts={Object.keys(cashBalances)} />}
    </div>
  );
};

export default App;
