
import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ScrollText,
  RotateCcw,
  Download,
  Upload,
  Cloud,
  CloudOff,
  CloudSync,
  LogOut,
  Settings,
  X
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
import { GoogleDriveService, CloudData } from './services/googleDriveService';

const EXCHANGE_RATE = 1350;
const STORAGE_KEYS = {
  HOLDINGS: 'portfolio_holdings_v1',
  PROFITS: 'portfolio_realized_profits_v1',
  CASH: 'portfolio_cash_balances_v1',
  GOOGLE_CLIENT_ID: 'portfolio_google_client_id'
};

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 구글 드라이브 관련 상태
  const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem(STORAGE_KEYS.GOOGLE_CLIENT_ID) || '');
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [showCloudSettings, setShowCloudSettings] = useState(false);
  const [driveService, setDriveService] = useState<GoogleDriveService | null>(null);

  // 1. 데이터 상태
  const [holdings, setHoldings] = useState<AssetHolding[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HOLDINGS);
    return saved ? JSON.parse(saved) : INITIAL_HOLDINGS;
  });

  const [realizedProfits, setRealizedProfits] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFITS);
    return saved ? JSON.parse(saved) : {};
  });

  const [cashBalances, setCashBalances] = useState<Record<string, CashBalance>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CASH);
    if (saved) return JSON.parse(saved);
    return {
      '삼성증권 ISA': { krw: 5420000, usd: 0 },
      '키움 해외주식': { krw: 1250, usd: 120 },
      '미래에셋 연금': { krw: 3200000, usd: 0 }
    };
  });

  // 로컬 스토리지 자동 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HOLDINGS, JSON.stringify(holdings));
    localStorage.setItem(STORAGE_KEYS.PROFITS, JSON.stringify(realizedProfits));
    localStorage.setItem(STORAGE_KEYS.CASH, JSON.stringify(cashBalances));
  }, [holdings, realizedProfits, cashBalances]);

  // 구글 클라이언트 ID 저장 시 서비스 초기화
  useEffect(() => {
    if (googleClientId) {
      localStorage.setItem(STORAGE_KEYS.GOOGLE_CLIENT_ID, googleClientId);
      const service = new GoogleDriveService(googleClientId);
      service.initGapi();
      setDriveService(service);
    }
  }, [googleClientId]);

  const handleCloudConnect = () => {
    if (!driveService) {
      alert("먼저 구글 클라이언트 ID를 설정해주세요.");
      setShowCloudSettings(true);
      return;
    }
    driveService.initTokenClient((resp) => {
      setIsCloudConnected(true);
      handlePullFromCloud(); // 연결 시 자동으로 데이터 확인
    });
    driveService.requestToken();
  };

  const handlePushToCloud = async () => {
    if (!driveService || !isCloudConnected) return;
    setIsCloudSyncing(true);
    try {
      await driveService.uploadData({
        holdings,
        realizedProfits,
        cashBalances,
        lastSynced: new Date().toISOString()
      });
      alert("클라우드에 데이터가 백업되었습니다.");
    } catch (e) {
      alert("클라우드 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    if (!driveService || !isCloudConnected) return;
    setIsCloudSyncing(true);
    try {
      const fileId = await driveService.findDataFile();
      if (fileId) {
        if (window.confirm("클라우드에 저장된 데이터가 있습니다. 불러오시겠습니까? (현재 로컬 데이터가 덮어씌워집니다)")) {
          const data = await driveService.downloadData(fileId);
          if (data) {
            setHoldings(data.holdings);
            setRealizedProfits(data.realizedProfits);
            setCashBalances(data.cashBalances);
            alert("클라우드 데이터를 성공적으로 동기화했습니다.");
          }
        }
      }
    } catch (e) {
      console.error(e);
      alert("클라우드 데이터를 확인하는 중 오류가 발생했습니다.");
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const [advice, setAdvice] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isBondModalOpen, setIsBondModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'totalAsset' | 'unrealizedProfit' | 'tradingProfit' | 'dividendIncome' | 'totalReturn' | 'totalCash'>('totalAsset');
  const [timeScale, setTimeScale] = useState<'monthly' | 'yearly'>('monthly');
  const [openAccount, setOpenAccount] = useState<string | null>(holdings[0]?.account || null);

  const handleExportData = () => {
    const data = { holdings, realizedProfits, cashBalances, version: '1.0', exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfolio-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.holdings && data.cashBalances) {
          setHoldings(data.holdings);
          setRealizedProfits(data.realizedProfits || {});
          setCashBalances(data.cashBalances);
          alert("데이터가 성공적으로 복구되었습니다.");
        } else {
          alert("올바른 백업 파일 형식이 아닙니다.");
        }
      } catch (err) {
        alert("파일을 읽는 중 오류가 발생했습니다.");
      }
    };
    reader.readAsText(file);
  };

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
      const pDate = new Date(h.purchaseDate);
      const daysHeld = Math.floor((now.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (h.type === AssetType.BOND && h.bondConfig) {
        if (daysHeld > 0) automatedIncome = (h.bondConfig.faceValue * h.quantity * (h.bondConfig.couponRate / 100) / 365) * daysHeld;
      } else if (h.type === AssetType.STOCK && h.dividendYield) {
        if (daysHeld > 0) automatedIncome = (currentVal * (h.dividendYield / 100) / 365) * daysHeld;
      }

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

    // Fix: Explicitly cast entries and values to handle potentially loose TypeScript inference from Object methods
    const totalCashKRW = (Object.entries(cashBalances) as [string, CashBalance][]).reduce((sum: number, [account, cash]) => {
      const autoIncome = autoCalculatedIncomeByAccount[account] || { krw: 0, usd: 0 };
      return sum + (cash.krw + autoIncome.krw) + ((cash.usd + autoIncome.usd) * EXCHANGE_RATE);
    }, 0);

    const totalRealizedTrading = (Object.values(realizedProfits) as number[]).reduce((sum: number, val: number) => sum + val, 0);
    const unrealizedPL = evaluation - purchase;
    const totalReturn = unrealizedPL + totalRealizedTrading + totalDividendsOrInterest;
    
    return {
      totalPurchaseAmount: purchase,
      totalEvaluationAmount: evaluation + totalCashKRW,
      totalUnrealizedProfit: unrealizedPL,
      totalRealizedProfit: totalRealizedTrading,
      totalDividends: totalDividendsOrInterest,
      totalReturnAmount: totalReturn,
      totalReturnRate: purchase > 0 ? (totalReturn / purchase) * 100 : 0,
      totalCash: totalCashKRW,
      autoCalculatedIncomeByAccount
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
      if (type === 'buy' && newQty > 0) newAvg = (h.quantity * h.avgPurchasePrice + qty * price) / newQty;
      return { ...h, quantity: newQty, avgPurchasePrice: newAvg, lastUpdated: new Date().toISOString() };
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

  const handleResetData = () => {
    if (window.confirm("모든 데이터를 초기화하시겠습니까? (백업하지 않은 데이터는 삭제됩니다)")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  useEffect(() => {
    if (holdings.length > 0 && !advice) handleAnalyzePortfolio();
  }, []);

  const formatKRW = (num: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(num);

  const groupedHoldings = useMemo(() => {
    const groups: Record<string, AssetHolding[]> = {};
    holdings.forEach(h => {
      if (!groups[h.account]) groups[h.account] = [];
      groups[h.account].push(h);
    });
    Object.keys(cashBalances).forEach(acc => { if (!groups[acc]) groups[acc] = []; });
    return groups;
  }, [holdings, cashBalances]);

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
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1.5 rounded-[1.4rem] mr-2">
              <button 
                onClick={handleCloudConnect}
                className={`p-3 transition-all rounded-xl hover:bg-white hover:shadow-sm ${isCloudConnected ? 'text-indigo-600' : 'text-slate-400'}`}
                title="클라우드 동기화"
              >
                {isCloudSyncing ? <CloudSync size={18} className="animate-spin" /> : isCloudConnected ? <Cloud size={18} /> : <CloudOff size={18} />}
              </button>
              <button 
                onClick={handleExportData}
                className="p-3 text-slate-400 hover:text-indigo-600 transition-all rounded-xl hover:bg-white hover:shadow-sm"
                title="데이터 백업 (JSON)"
              >
                <Download size={18} />
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-slate-400 hover:text-emerald-600 transition-all rounded-xl hover:bg-white hover:shadow-sm"
                title="데이터 복구 (JSON)"
              >
                <Upload size={18} />
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportData} />
              </button>
              <button 
                onClick={() => setShowCloudSettings(true)}
                className="p-3 text-slate-400 hover:text-slate-900 transition-all rounded-xl hover:bg-white hover:shadow-sm"
                title="설정"
              >
                <Settings size={18} />
              </button>
            </div>
            <button 
              onClick={() => setIsStockModalOpen(true)}
              className="flex items-center gap-2.5 px-8 py-4 bg-indigo-600 text-white rounded-[1.4rem] hover:bg-indigo-700 transition-all font-black text-xs shadow-2xl shadow-indigo-100 border-b-4 border-indigo-800"
            >
              <Plus size={18} />
              <span>자산 추가</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 sm:px-10 py-10">
        <div className="flex justify-end mb-6 gap-3">
          {isCloudConnected && (
            <button 
              onClick={handlePushToCloud}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              <CloudSync size={14} /> 클라우드에 현재 상태 백업
            </button>
          )}
          <div className="flex items-center gap-3 px-5 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isCloudConnected ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest tabular-nums">
              {isCloudConnected ? '클라우드 연동 중' : '로컬 전용 모드'}
            </span>
          </div>
        </div>

        {/* 대시보드 및 나머지 UI 동일... */}
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
              onDelete={(id) => setHoldings(prev => prev.filter(h => h.id !== id))}
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

      {/* Cloud Settings Modal */}
      {showCloudSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white">
            <div className="px-8 py-7 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings size={20} className="text-slate-400" />
                <h3 className="text-xl font-black text-slate-800 tracking-tight">클라우드 설정</h3>
              </div>
              <button onClick={() => setShowCloudSettings(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Google Cloud Client ID</label>
                <input 
                  type="password" 
                  placeholder="클라이언트 ID를 입력하세요" 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                />
                <p className="text-[9px] text-slate-400 leading-relaxed px-1">
                  Google Drive 연동을 위해 발급받은 Client ID가 필요합니다. 
                  <a href="https://console.cloud.google.com/" target="_blank" className="text-indigo-600 underline ml-1">Google Console</a>에서 생성 가능합니다.
                </p>
              </div>
              <div className="pt-4 flex flex-col gap-3">
                {!isCloudConnected ? (
                  <button 
                    onClick={handleCloudConnect}
                    className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-100"
                  >
                    Google Drive 연결하기
                  </button>
                ) : (
                  <button 
                    onClick={() => { setIsCloudConnected(false); setDriveService(null); }}
                    className="w-full py-5 bg-rose-50 text-rose-600 rounded-[1.5rem] font-black text-sm hover:bg-rose-100"
                  >
                    연결 해제
                  </button>
                )}
                <button 
                  onClick={handleResetData}
                  className="w-full py-4 text-slate-400 text-xs font-bold hover:text-rose-500 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={14} /> 모든 데이터 초기화
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isStockModalOpen && <AddStockModal onClose={() => setIsStockModalOpen(false)} onAdd={(a) => { setHoldings(p => [...p, a]); if(!cashBalances[a.account]) setCashBalances(p => ({...p, [a.account]: {krw:0, usd:0}})); setIsStockModalOpen(false); }} existingAccounts={Object.keys(cashBalances)} />}
      {isBondModalOpen && <AddBondModal onClose={() => setIsBondModalOpen(false)} onAdd={(a) => { setHoldings(p => [...p, a]); if(!cashBalances[a.account]) setCashBalances(p => ({...p, [a.account]: {krw:0, usd:0}})); setIsBondModalOpen(false); }} existingAccounts={Object.keys(cashBalances)} />}
    </div>
  );
};

export default App;
