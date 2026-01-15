
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
  RotateCcw,
  Download,
  Upload,
  Cloud,
  CloudOff,
  CloudSync,
  Settings,
  X,
  Loader2,
  Inbox,
  ScrollText,
  DollarSign,
  AlertCircle,
  ExternalLink,
  LogIn,
  Copy,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  HelpCircle
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
import { GoogleDriveService } from './services/googleDriveService';

const EXCHANGE_RATE = 1350;
const VITE_GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [holdings, setHoldings] = useState<AssetHolding[]>(INITIAL_HOLDINGS);
  const [realizedProfits, setRealizedProfits] = useState<Record<string, number>>({});
  const [cashBalances, setCashBalances] = useState<Record<string, CashBalance>>({});

  const [googleClientId, setGoogleClientId] = useState(() => (VITE_GOOGLE_CLIENT_ID || localStorage.getItem('google_client_id') || '').trim());
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [showCloudSettings, setShowCloudSettings] = useState(false);
  const [driveService, setDriveService] = useState<GoogleDriveService | null>(null);
  const [isOriginCopied, setIsOriginCopied] = useState(false);
  
  // 스크립트 로드 상태 체크
  const [scriptStatus, setScriptStatus] = useState({ gapi: false, gsi: false });

  useEffect(() => {
    const checkScripts = () => {
      setScriptStatus({
        gapi: !!window.gapi,
        gsi: !!(window.google && window.google.accounts)
      });
    };
    const interval = setInterval(checkScripts, 1000);
    const timer = setTimeout(() => setIsAppLoading(false), 800);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const finalClientId = (VITE_GOOGLE_CLIENT_ID || googleClientId).trim();
    if (finalClientId && scriptStatus.gapi) {
      if (!VITE_GOOGLE_CLIENT_ID) {
        localStorage.setItem('google_client_id', finalClientId);
      }
      const service = new GoogleDriveService(finalClientId);
      service.initGapi().catch(err => console.error("GAPI 초기화 실패:", err));
      setDriveService(service);
    }
  }, [googleClientId, scriptStatus.gapi]);

  const handleCloudConnect = () => {
    const finalClientId = (VITE_GOOGLE_CLIENT_ID || googleClientId).trim();
    if (!finalClientId) {
      alert("구글 클라이언트 ID가 설정되지 않았습니다.");
      setShowCloudSettings(true);
      return;
    }

    if (!scriptStatus.gsi) {
      alert("구글 인증 라이브러리가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const service = driveService || new GoogleDriveService(finalClientId);
    if (!driveService) setDriveService(service);

    try {
      service.initTokenClient((resp) => {
        setIsCloudConnected(true);
        handlePullFromCloud(); 
      });
      service.requestToken();
    } catch (error) {
      console.error(error);
      alert("로그인 창을 여는 중 오류가 발생했습니다. (400 오류 시 설정창의 가이드를 확인하세요)");
    }
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
      alert("클라우드 업로드 중 오류가 발생했습니다. 세션이 만료되었을 수 있으니 다시 로그인해주세요.");
      setIsCloudConnected(false);
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
        if (window.confirm("클라우드에 저장된 데이터가 있습니다. 불러오시겠습니까?")) {
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
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleAddAssetGuard = (action: () => void) => {
    if (!isCloudConnected) {
      if (window.confirm("데이터 유실 방지를 위해 먼저 Google Drive에 연결해야 합니다.\n설정 화면으로 이동하시겠습니까?")) {
        setShowCloudSettings(true);
      }
      return;
    }
    action();
  };

  const copyOriginToClipboard = () => {
    navigator.clipboard.writeText(window.location.origin);
    setIsOriginCopied(true);
    setTimeout(() => setIsOriginCopied(false), 2000);
  };

  const [advice, setAdvice] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isBondModalOpen, setIsBondModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'totalAsset' | 'unrealizedProfit' | 'tradingProfit' | 'dividendIncome' | 'totalReturn' | 'totalCash'>('totalAsset');
  const [timeScale, setTimeScale] = useState<'monthly' | 'yearly'>('monthly');
  const [openAccount, setOpenAccount] = useState<string | null>(null);

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
    if (window.confirm("설정된 Client ID와 모든 동기화 세션을 초기화하시겠습니까? (로컬 데이터는 유지됩니다)")) {
      localStorage.removeItem('google_client_id');
      setGoogleClientId('');
      setDriveService(null);
      setIsCloudConnected(false);
      alert("초기화되었습니다. 다시 Client ID를 입력해주세요.");
    }
  };

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
    const currentValue = {
      totalAsset: summary.totalEvaluationAmount,
      unrealizedProfit: summary.totalUnrealizedProfit,
      tradingProfit: summary.totalRealizedProfit,
      dividendIncome: summary.totalDividends,
      totalReturn: summary.totalReturnAmount,
      totalCash: summary.totalCash
    }[selectedMetric];
    
    const todayStr = new Date().toISOString().split('T')[0].substring(2).replace(/-/g, '.');
    return [{ date: todayStr, value: Math.round(currentValue) }];
  }, [summary, selectedMetric]);

  if (isAppLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="bg-indigo-600 p-5 rounded-[2rem] text-white shadow-2xl animate-bounce mb-8">
          <BarChart3 size={48} />
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin text-indigo-600" size={24} />
            <span className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">PORTFOLIO NOTES</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">포트폴리오를 구성하는 중입니다...</p>
        </div>
      </div>
    );
  }

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
            <div className="hidden sm:flex bg-slate-100 p-1.5 rounded-[1.4rem] mr-2">
              <button onClick={handleCloudConnect} className={`p-3 transition-all rounded-xl hover:bg-white hover:shadow-sm ${isCloudConnected ? 'text-indigo-600' : 'text-slate-400'}`}>
                {isCloudSyncing ? <CloudSync size={18} className="animate-spin" /> : isCloudConnected ? <Cloud size={18} /> : <CloudOff size={18} />}
              </button>
              <button onClick={() => setShowCloudSettings(true)} className="p-3 text-slate-400 hover:text-slate-900 transition-all rounded-xl hover:bg-white hover:shadow-sm"><Settings size={18} /></button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => handleAddAssetGuard(() => setIsStockModalOpen(true))} className={`flex items-center gap-2 px-6 py-3.5 rounded-[1.2rem] transition-all font-black text-[11px] uppercase tracking-wider border active:scale-95 ${isCloudConnected ? 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100 opacity-80'}`}><TrendingUp size={16} /><span>주식 추가</span></button>
              <button onClick={() => handleAddAssetGuard(() => setIsBondModalOpen(true))} className={`flex items-center gap-2 px-6 py-3.5 rounded-[1.2rem] transition-all font-black text-[11px] uppercase tracking-wider border active:scale-95 ${isCloudConnected ? 'bg-violet-50 text-violet-600 border-violet-100 hover:bg-violet-100' : 'bg-slate-50 text-slate-400 border-slate-100 opacity-80'}`}><ScrollText size={16} /><span>채권 추가</span></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 sm:px-10 py-10">
        <div className="flex justify-end mb-6 gap-3">
          {isCloudConnected && (
            <button onClick={handlePushToCloud} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
              <CloudSync size={14} /> CLOUD BACKUP
            </button>
          )}

          <div className="flex items-center gap-3 px-5 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <DollarSign size={14} className="text-amber-500" />
            <span className="text-[10px] font-black text-slate-700 tracking-widest tabular-nums uppercase">
              {EXCHANGE_RATE.toLocaleString()} KRW/USD
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-12">
          <DashboardCard title="자산 총액" value={formatKRW(summary.totalEvaluationAmount)} icon={<Wallet size={20} />} isActive={selectedMetric === 'totalAsset'} onClick={() => setSelectedMetric('totalAsset')} trend="neutral" />
          <DashboardCard title="전체 예수금" value={formatKRW(summary.totalCash)} icon={<Banknote size={20} />} isActive={selectedMetric === 'totalCash'} onClick={() => setSelectedMetric('totalCash')} trend="neutral" />
          <DashboardCard title="미실현 손익" value={formatKRW(summary.totalUnrealizedProfit)} trend={summary.totalUnrealizedProfit >= 0 ? 'up' : 'down'} icon={<TrendingUp size={20} />} isActive={selectedMetric === 'unrealizedProfit'} onClick={() => setSelectedMetric('unrealizedProfit')} />
          <DashboardCard title="매매 수익" value={formatKRW(summary.totalRealizedProfit)} trend={summary.totalRealizedProfit >= 0 ? 'up' : 'down'} icon={<ArrowUpRight size={20} />} isActive={selectedMetric === 'tradingProfit'} onClick={() => setSelectedMetric('tradingProfit')} />
          <DashboardCard title="배당/이자" value={formatKRW(summary.totalDividends)} icon={<Coins size={20} />} isActive={selectedMetric === 'dividendIncome'} onClick={() => setSelectedMetric('dividendIncome')} trend="neutral" />
          <DashboardCard title="종합 수익률" value={summary.totalReturnRate.toFixed(2) + '%'} trend={summary.totalReturnAmount >= 0 ? 'up' : 'down'} icon={<Target size={20} />} isActive={selectedMetric === 'totalReturn'} onClick={() => setSelectedMetric('totalReturn')} />
        </div>

        {holdings.length > 0 ? (
          <>
            <div className="glass-panel p-10 rounded-[3rem] mb-12 overflow-hidden relative border border-white/60 shadow-2xl">
              <TrendChart data={trendData} title={selectedMetric} subtitle="(실시간)" />
            </div>
            <AIInsightSection advice={advice} isAnalyzing={isAnalyzing} onAnalyze={handleAnalyzePortfolio} />
            <div className="space-y-4">
              {Object.entries(groupedHoldings).map(([account, assets]) => (
                <StockTable key={account} title={account} holdings={assets} isOpen={openAccount === account} onToggle={() => setOpenAccount(openAccount === account ? null : account)} onDelete={(id) => setHoldings(prev => prev.filter(h => h.id !== id))} cashBalance={cashBalances[account] || { krw: 0, usd: 0 }} onUpdateCash={(amount, currency) => handleUpdateCash(account, amount, currency)} onAdjustHolding={handleAdjustHolding} realizedProfit={realizedProfits[account]} portfolioTotalEval={summary.totalEvaluationAmount} autoIncome={summary.autoCalculatedIncomeByAccount[account]} />
              ))}
            </div>
          </>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center bg-white/40 backdrop-blur-md rounded-[3rem] border border-white/60 shadow-2xl border-dashed text-center">
             <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-300 mb-8 border border-slate-200/50"><Inbox size={32} /></div>
             <h3 className="text-xl font-black text-slate-800 tracking-tight">자산 데이터가 없습니다</h3>
             <p className="text-slate-400 mt-3 max-w-sm font-medium leading-relaxed text-sm">기록된 자산이 없습니다. 상단의 버튼을 눌러 당신의 포트폴리오를 구성해보세요.</p>
          </div>
        )}
      </main>

      {showCloudSettings && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-white animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="px-8 py-7 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Cloud size={20} /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">구글 연동 설정</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Connection Diagnostics</p>
                </div>
              </div>
              <button onClick={() => setShowCloudSettings(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20} className="text-slate-400" /></button>
            </div>
            
            <div className="p-8 space-y-6 overflow-y-auto scrollbar-hide">
              {/* 라이브러리 상태 체크 */}
              <div className="grid grid-cols-2 gap-3">
                 <div className={`p-4 rounded-2xl border flex items-center gap-3 ${scriptStatus.gapi ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    {scriptStatus.gapi ? <ShieldCheck size={18} className="text-emerald-500" /> : <ShieldAlert size={18} className="text-rose-500" />}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-slate-400">GAPI Status</span>
                      <span className="text-xs font-bold text-slate-700">{scriptStatus.gapi ? '준비됨' : '로드 중...'}</span>
                    </div>
                 </div>
                 <div className={`p-4 rounded-2xl border flex items-center gap-3 ${scriptStatus.gsi ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    {scriptStatus.gsi ? <ShieldCheck size={18} className="text-emerald-500" /> : <ShieldAlert size={18} className="text-rose-500" />}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-slate-400">GSI Status</span>
                      <span className="text-xs font-bold text-slate-700">{scriptStatus.gsi ? '준비됨' : '로드 중...'}</span>
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Google Cloud Client ID</label>
                <input 
                  type="text" 
                  placeholder="클라이언트 ID를 입력하세요" 
                  className="w-full px-6 py-5 border border-slate-200 bg-slate-50 text-slate-900 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value.trim())}
                />
              </div>

              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle size={16} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">400 오류 자가 진단</span>
                  </div>
                  <button onClick={copyOriginToClipboard} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-indigo-600 shadow-sm active:scale-95 transition-all">
                    {isOriginCopied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    Origin 복사
                  </button>
                </div>
                
                <ul className="space-y-3">
                  {[
                    "1. 구글 클라우드 콘솔에서 '승인된 자바스크립트 원본'에 현재 주소를 등록했나요?",
                    "2. 등록한 주소 끝에 슬래시(/)가 포함되어 있지는 않나요? (반드시 제거 필요)",
                    "3. Client ID 앞뒤에 공백이 포함되어 있지는 않나요?",
                    "4. 현재 브라우저 탭에서 팝업이 차단되어 있지는 않나요?"
                  ].map((text, idx) => (
                    <li key={idx} className="text-[11px] text-slate-600 font-medium leading-relaxed flex items-start gap-2">
                       <div className="w-1 h-1 rounded-full bg-indigo-300 mt-1.5 shrink-0" />
                       {text}
                    </li>
                  ))}
                </ul>
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[10px] font-bold text-indigo-700 break-all select-all">
                   {window.location.origin}
                </div>
              </div>

              <div className="space-y-3 shrink-0">
                {!isCloudConnected ? (
                  <button onClick={handleCloudConnect} disabled={!googleClientId || !scriptStatus.gsi} className={`w-full py-5 flex items-center justify-center gap-3 rounded-[1.5rem] font-black text-sm transition-all shadow-xl active:scale-95 ${!googleClientId || !scriptStatus.gsi ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}`}>
                    <LogIn size={20} />구글 계정으로 다시 로그인
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-sm"><CloudSync size={20} /></div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">연결됨</p>
                        <p className="text-sm font-bold text-slate-800">동기화 활성화 상태</p>
                      </div>
                    </div>
                    <button onClick={() => setIsCloudConnected(false)} className="w-full py-4 text-rose-500 text-xs font-black hover:bg-rose-50 rounded-xl transition-all">연결 해제</button>
                  </div>
                )}
                <button onClick={handleResetData} className="w-full py-4 text-slate-400 text-xs font-bold hover:text-rose-500 transition-all flex items-center justify-center gap-2"><RotateCcw size={14} /> 설정 리셋 (ID 초기화)</button>
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
