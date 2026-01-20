
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  BarChart3,
  Settings,
  X,
  Loader2,
  Inbox,
  ScrollText,
  DollarSign,
  LogIn,
  CheckCircle2,
  Lock,
  ExternalLink,
  RefreshCw,
  Key,
  ShieldQuestion
} from 'lucide-react';
import { INITIAL_HOLDINGS } from './constants';
import { AssetHolding, MarketType, AssetType, CashBalance, TransactionType } from './types';
import StockTable from './components/StockTable';
import TrendChart from './components/TrendChart';
import AddStockModal from './components/AddStockModal';
import AddBondModal from './components/AddBondModal';
import AIInsightSection from './components/AIInsightSection';
import { getPortfolioAdvice, updatePortfolioPrices } from './services/geminiService';
import { GoogleDriveService } from './services/googleDriveService';
import { calculateHoldingStatus } from './services/portfolioService';

const EXCHANGE_RATE = 1350;
const VITE_GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
const AUTO_SYNC_INTERVAL = 300000; 

const App: React.FC = () => {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [holdings, setHoldings] = useState<AssetHolding[]>(INITIAL_HOLDINGS);
  const [cashBalances, setCashBalances] = useState<Record<string, CashBalance>>({});
  
  // 이제 realizedProfits는 거래 내역에서 계산되므로 별도 state로 관리하지 않고 파생값으로 사용 가능하지만,
  // 기존 수동 입력된 실현손익과의 합산을 위해 state로 유지합니다.
  const [manualRealizedProfits, setManualRealizedProfits] = useState<Record<string, number>>({});

  const [googleClientId, setGoogleClientId] = useState(() => (VITE_GOOGLE_CLIENT_ID || localStorage.getItem('google_client_id') || '').trim());
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isStorageReady, setIsStorageReady] = useState(false); 
  const [isPermissionDenied, setIsPermissionDenied] = useState(false); 
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [isPriceSyncing, setIsPriceSyncing] = useState(false);
  const [showCloudSettings, setShowCloudSettings] = useState(false);
  const [driveService, setDriveService] = useState<GoogleDriveService | null>(null);
  
  const skipNextSync = useRef(false);
  const [scriptStatus, setScriptStatus] = useState({ gapi: false, gsi: false });

  // [데이터 마이그레이션] 기존 quantity만 있는 데이터를 transactions 기반으로 변환
  useEffect(() => {
    if (holdings.length > 0) {
      let needsMigration = false;
      const migrated = holdings.map(h => {
        if (!h.transactions || h.transactions.length === 0) {
          needsMigration = true;
          return {
            ...h,
            transactions: [{
              id: 'init-' + Math.random().toString(36).substr(2, 5),
              date: h.purchaseDate || new Date().toISOString().split('T')[0],
              type: TransactionType.BUY,
              quantity: h.quantity,
              price: h.avgPurchasePrice
            }]
          };
        }
        return h;
      });

      if (needsMigration) {
        console.log("Migrating legacy data to transaction-based model...");
        setHoldings(migrated);
      }
    }
  }, [holdings.length]);

  useEffect(() => {
    const checkScripts = () => {
      setScriptStatus({
        gapi: !!window.gapi,
        gsi: !!(window.google && window.google.accounts)
      });
    };
    const interval = setInterval(checkScripts, 500);
    const timer = setTimeout(() => setIsAppLoading(false), 800);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const finalClientId = (VITE_GOOGLE_CLIENT_ID || googleClientId).trim();
    if (finalClientId && scriptStatus.gapi) {
      const service = new GoogleDriveService(finalClientId);
      service.initGapi().catch(err => console.error("GAPI Init Error", err));
      setDriveService(service);
    }
  }, [googleClientId, scriptStatus.gapi]);

  useEffect(() => {
    if (!isCloudConnected || !isStorageReady || !driveService) return;
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    const timer = setTimeout(() => handlePushToCloud(true), 3000);
    return () => clearTimeout(timer);
  }, [holdings, manualRealizedProfits, cashBalances, isCloudConnected, isStorageReady]);

  useEffect(() => {
    if (isStorageReady && holdings.length > 0) {
      handleSyncPrices();
      const interval = setInterval(() => handleSyncPrices(), AUTO_SYNC_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [isStorageReady, holdings.length === 0]);

  const handleCloudConnect = async (forceReset = false) => {
    setIsPermissionDenied(false);
    setIsStorageReady(false);
    if (!googleClientId) { setShowCloudSettings(true); return; }
    if (!scriptStatus.gsi || !scriptStatus.gapi) { alert("구글 서비스 로딩 중입니다."); return; }
    const service = driveService || new GoogleDriveService(googleClientId);
    if (!driveService) setDriveService(service);
    if (forceReset || isPermissionDenied) await service.revokeToken();
    service.initTokenClient(async (resp) => {
      if (!service.hasRequiredScopes(resp)) { setIsPermissionDenied(true); setIsCloudConnected(true); return; }
      setIsCloudConnected(true); setIsPermissionDenied(false);
      try {
        setIsCloudSyncing(true);
        await service.getOrCreateFolder(); 
        setIsStorageReady(true);
        await handlePullFromCloud(true); 
      } catch (e) { setIsPermissionDenied(true); } finally { setIsCloudSyncing(false); }
    });
    service.requestToken();
  };

  // Fix for error: Cannot find name 'handleFullReset'
  const handleFullReset = async () => {
    if (driveService) {
      try {
        await driveService.revokeToken();
      } catch (e) {
        console.warn("Token revocation failed during full reset", e);
      }
    }
    localStorage.removeItem('google_client_id');
    window.location.reload();
  };

  const handleSyncPrices = async () => {
    if (holdings.length === 0) return;
    setIsPriceSyncing(true);
    try {
      const { prices } = await updatePortfolioPrices(holdings);
      setHoldings(prev => prev.map(h => {
        const match = prices.find(p => p.symbol === h.symbol || p.symbol.includes(h.symbol));
        if (match) return { ...h, currentPrice: match.price, lastUpdated: new Date().toISOString() };
        return h;
      }));
      setTimeout(() => handlePushToCloud(true), 1000);
    } catch (e) { console.warn("Price sync failed"); } finally { setIsPriceSyncing(false); }
  };

  const handlePushToCloud = async (isBackground = false) => {
    if (!driveService || !isCloudConnected || !isStorageReady) return;
    if (!isBackground) setIsCloudSyncing(true);
    try {
      await driveService.uploadData({
        holdings,
        realizedProfits: manualRealizedProfits,
        cashBalances,
        lastSynced: new Date().toISOString()
      });
    } catch (e: any) {
      if (e.message === 'PERMISSION_DENIED') { setIsPermissionDenied(true); setIsStorageReady(false); }
    } finally { if (!isBackground) setIsCloudSyncing(false); }
  };

  const handlePullFromCloud = async (isAutoLoad = false) => {
    if (!driveService || !isCloudConnected || !isStorageReady) return;
    setIsCloudSyncing(true);
    try {
      const data = await driveService.loadPortfolioData();
      if (data) {
        if (isAutoLoad || window.confirm("클라우드 데이터를 불러올까요?")) {
          skipNextSync.current = true;
          setHoldings(data.holdings || []);
          setManualRealizedProfits(data.realizedProfits || {});
          setCashBalances(data.cashBalances || {});
        }
      }
    } catch (e) { console.error(e); } finally { setIsCloudSyncing(false); }
  };

  const [advice, setAdvice] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isBondModalOpen, setIsBondModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'totalAsset' | 'unrealizedProfit' | 'tradingProfit' | 'dividendIncome' | 'totalReturn' | 'totalCash'>('totalAsset');
  const [openAccount, setOpenAccount] = useState<string | null>(null);

  const summary = useMemo(() => {
    let purchase: number = 0;
    let evaluation: number = 0;
    let totalDividendsOrInterest: number = 0;
    let autoCalculatedIncomeByAccount: Record<string, { krw: number, usd: number }> = {};
    let realizedProfitsFromTransactions: Record<string, number> = {};

    const now = new Date();

    holdings.forEach((h: AssetHolding) => {
      // 거래 내역 기반 현재 상태 계산
      const { quantity, avgPrice, realizedProfit } = calculateHoldingStatus(h.transactions || []);
      
      const rate = h.market === MarketType.USA ? EXCHANGE_RATE : 1;
      let currentVal = quantity * h.currentPrice;
      let automatedIncome = 0;
      
      const pDate = new Date(h.purchaseDate);
      const daysHeld = Math.floor((now.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (h.type === AssetType.BOND && h.bondConfig) {
        if (daysHeld > 0) automatedIncome = (h.bondConfig.faceValue * quantity * (h.bondConfig.couponRate / 100) / 365) * daysHeld;
      } else if (h.type === AssetType.STOCK && h.dividendYield) {
        if (daysHeld > 0) automatedIncome = (currentVal * (h.dividendYield / 100) / 365) * daysHeld;
      }

      if (!autoCalculatedIncomeByAccount[h.account]) autoCalculatedIncomeByAccount[h.account] = { krw: 0, usd: 0 };
      if (h.market === MarketType.USA) {
        autoCalculatedIncomeByAccount[h.account].usd += automatedIncome;
      } else {
        autoCalculatedIncomeByAccount[h.account].krw += automatedIncome;
      }

      // 거래 기반 실현손익 합산
      realizedProfitsFromTransactions[h.account] = (realizedProfitsFromTransactions[h.account] || 0) + (realizedProfit * rate);

      purchase += (quantity * avgPrice) * rate;
      evaluation += (currentVal + (automatedIncome * rate));
      totalDividendsOrInterest += (h.dividendsReceived + automatedIncome) * rate;
    });

    const totalCashKRW = Object.entries(cashBalances).reduce((sum, [account, cash]) => {
      const autoIncome = autoCalculatedIncomeByAccount[account] || { krw: 0, usd: 0 };
      return sum + (cash.krw + autoIncome.krw) + ((cash.usd + autoIncome.usd) * EXCHANGE_RATE);
    }, 0);

    // 수동 입력 실현손익 + 거래 기반 실현손익
    const totalRealizedTrading = Object.values(manualRealizedProfits).reduce((sum, val) => sum + val, 0) + 
                                 Object.values(realizedProfitsFromTransactions).reduce((sum, val) => sum + val, 0);
    
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
      autoCalculatedIncomeByAccount,
      realizedProfitsFromTransactions
    };
  }, [holdings, manualRealizedProfits, cashBalances]);

  const handleUpdateCash = (account: string, amount: number, currency: 'KRW' | 'USD') => {
    setCashBalances(prev => {
      const current = prev[account] || { krw: 0, usd: 0 };
      return { ...prev, [account]: { ...current, krw: currency === 'KRW' ? current.krw + amount : current.krw, usd: currency === 'USD' ? current.usd + amount : current.usd } };
    });
  };

  const handleAdjustHolding = (id: string, type: 'BUY' | 'SELL', qty: number, price: number, date?: string) => {
    setHoldings(prev => prev.map(h => {
      if (h.id !== id) return h;
      const newTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        date: date || new Date().toISOString().split('T')[0],
        type: type as any,
        quantity: qty,
        price: price
      };
      return {
        ...h,
        transactions: [...(h.transactions || []), newTransaction],
        lastUpdated: new Date().toISOString()
      };
    }));
  };

  const handleAnalyzePortfolio = async () => {
    if (holdings.length === 0) return;
    setIsAnalyzing(true);
    try {
      const result = await getPortfolioAdvice(holdings);
      setAdvice(result || "결과를 가져올 수 없습니다.");
    } catch (e) { setAdvice("오류 발생"); } finally { setIsAnalyzing(false); }
  };

  const groupedHoldings = useMemo(() => {
    const groups: Record<string, AssetHolding[]> = {};
    holdings.forEach(h => { if (!groups[h.account]) groups[h.account] = []; groups[h.account].push(h); });
    Object.keys(cashBalances).forEach(acc => { if (!groups[acc]) groups[acc] = []; });
    return groups;
  }, [holdings, cashBalances]);

  const trendData = useMemo(() => {
    const val = { totalAsset: summary.totalEvaluationAmount, unrealizedProfit: summary.totalUnrealizedProfit, tradingProfit: summary.totalRealizedProfit, dividendIncome: summary.totalDividends, totalReturn: summary.totalReturnAmount, totalCash: summary.totalCash }[selectedMetric];
    const today = new Date().toISOString().split('T')[0].substring(2).replace(/-/g, '.');
    return [{ date: today, value: Math.round(val) }];
  }, [summary, selectedMetric]);

  if (isAppLoading) return ( <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50"><div className="bg-indigo-600 p-5 rounded-[2.5rem] text-white shadow-2xl animate-bounce mb-8"><BarChart3 size={48} /></div><div className="flex items-center gap-3"><Loader2 className="animate-spin text-indigo-600" size={24} /><span className="text-sm font-black text-slate-900 tracking-[0.2em]">PORTFOLIO NOTES</span></div></div> );

  if (!isCloudConnected) return ( <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50/50"><div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"><div className="space-y-10"><div className="flex items-center gap-4"><div className="bg-indigo-600 p-4 rounded-[1.8rem] text-white shadow-2xl"><BarChart3 size={40} /></div><h1 className="text-4xl font-black text-slate-900 tracking-tighter">PORTFOLIO<br/>NOTES</h1></div><div className="space-y-6"><h2 className="text-5xl font-black text-slate-900 leading-[1.1] tracking-tighter">당신의 모든 자산,<br/><span className="text-indigo-600 underline decoration-indigo-200">안전하게</span> 클라우드로.</h2></div></div><div className="bg-white rounded-[3.5rem] shadow-2xl p-10 border border-slate-100 flex flex-col gap-10"><div className="space-y-2"><h3 className="text-3xl font-black text-slate-800 flex items-center gap-3"><Lock size={28} className="text-indigo-600" />보안 로그인</h3></div><input type="text" placeholder="클라이언트 ID" className="w-full px-7 py-5 border border-slate-200 bg-slate-50 rounded-[2rem] font-bold outline-none" value={googleClientId} onChange={(e) => setGoogleClientId(e.target.value.trim())} /><button onClick={() => handleCloudConnect()} className="w-full py-7 bg-indigo-600 text-white rounded-[2.2rem] font-black hover:bg-indigo-700 transition-all shadow-2xl"><LogIn size={24} className="inline mr-3"/>연결하기</button></div></div></div> );

  if (isPermissionDenied || !isStorageReady) return ( <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50"><div className="max-w-xl w-full bg-white rounded-[4rem] shadow-2xl p-12 text-center flex flex-col items-center"><div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-xl"><ShieldQuestion size={40} /></div><h2 className="text-3xl font-black mb-4">드라이브 권한 승인</h2><button onClick={() => handleCloudConnect(true)} className="w-full py-7 bg-indigo-600 text-white rounded-[2.2rem] font-black shadow-2xl mb-4"><Key size={24} className="inline mr-3"/> 권한 승인하기</button><button onClick={() => {localStorage.removeItem('google_client_id'); window.location.reload();}} className="text-slate-400 font-bold text-xs uppercase tracking-widest">설정 초기화</button></div></div> );

  return (
    <div className="min-h-screen pb-24 font-sans tracking-tight">
      <header className="bg-white/70 backdrop-blur-2xl border-b border-white/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-[1.4rem] text-white shadow-2xl"><BarChart3 size={28} /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">PORTFOLIO NOTES</h1>
              <div className="flex items-center gap-2 mt-1.5">
                {isPriceSyncing ? <div className="text-[9px] font-bold text-indigo-500"><RefreshCw size={12} className="animate-spin inline mr-1" /> 동기화 중...</div> : <div className="text-[9px] font-bold text-emerald-500"><CheckCircle2 size={12} className="inline mr-1" /> 클라우드 연결됨</div>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsStockModalOpen(true)} className="flex items-center gap-2 px-6 py-3.5 rounded-[1.2rem] bg-indigo-50 text-indigo-600 border border-indigo-100 font-black text-[11px] hover:bg-indigo-100 transition-all"><TrendingUp size={16} />주식 추가</button>
            <button onClick={() => setIsBondModalOpen(true)} className="flex items-center gap-2 px-6 py-3.5 rounded-[1.2rem] bg-violet-50 text-violet-600 border border-violet-100 font-black text-[11px] hover:bg-violet-100 transition-all"><ScrollText size={16} />채권 추가</button>
            <button onClick={() => setShowCloudSettings(true)} className="p-3 text-slate-400 hover:text-slate-900"><Settings size={18} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 sm:px-10 py-10">
        <div className="flex justify-end mb-6 gap-3">
          <div className="px-5 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center gap-3">
            <DollarSign size={14} className="text-amber-500" /><span className="text-[10px] font-black text-slate-700 tracking-widest">{EXCHANGE_RATE.toLocaleString()} KRW/USD</span>
          </div>
        </div>

        {holdings.length > 0 ? (
          <>
            <div className="glass-panel p-10 rounded-[3rem] mb-12 border border-white/60 shadow-2xl"><TrendChart data={trendData} title={selectedMetric} subtitle="(실시간)" /></div>
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
                  onAdjustHolding={(id, type, qty, price, date) => handleAdjustHolding(id, type as any, qty, price, date)}
                  realizedProfit={(manualRealizedProfits[account] || 0) + (summary.realizedProfitsFromTransactions[account] || 0)} 
                  portfolioTotalEval={summary.totalEvaluationAmount} 
                  autoIncome={summary.autoCalculatedIncomeByAccount[account]} 
                />
              ))}
            </div>
          </>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center bg-white/40 rounded-[3rem] border border-dashed border-slate-300 text-center">
             <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-300 mb-8"><Inbox size={32} /></div>
             <h3 className="text-xl font-black text-slate-800">자산 데이터가 없습니다</h3>
          </div>
        )}
      </main>

      {isStockModalOpen && <AddStockModal onClose={() => setIsStockModalOpen(false)} onAdd={(a) => { setHoldings(p => [...p, a]); setIsStockModalOpen(false); }} existingAccounts={Object.keys(cashBalances)} />}
      {isBondModalOpen && <AddBondModal onClose={() => setIsBondModalOpen(false)} onAdd={(a) => { setHoldings(p => [...p, a]); setIsBondModalOpen(false); }} existingAccounts={Object.keys(cashBalances)} />}
      {showCloudSettings && ( <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[200] flex items-center justify-center p-4"><div className="bg-white rounded-[2.5rem] p-8 w-full max-w-xl"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black">클라우드 설정</h3><button onClick={() => setShowCloudSettings(false)}><X/></button></div><button onClick={handleFullReset} className="w-full py-4 bg-rose-50 text-rose-500 rounded-xl font-black text-xs uppercase tracking-widest">인증 초기화 및 로그아웃</button></div></div> )}
    </div>
  );
};

export default App;
