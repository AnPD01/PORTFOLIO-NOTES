
import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, Info, Keyboard, TrendingUp, Calendar, Percent } from 'lucide-react';
import { AccountType, MarketType, StockHolding, AssetType } from '../types';
import { searchStocks, StockSearchResult } from '../services/geminiService';

interface AddStockModalProps {
  onClose: () => void;
  onAdd: (stock: StockHolding) => void;
  existingAccounts: string[];
}

const AddStockModal: React.FC<AddStockModalProps> = ({ onClose, onAdd, existingAccounts }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  const [formData, setFormData] = useState({
    account: existingAccounts[0] || '',
    newAccountName: '',
    isNewAccount: false,
    accountCategory: AccountType.OTHER,
    market: MarketType.KOREA,
    symbol: '',
    name: '',
    quantity: 0,
    avgPrice: 0,
    currentPrice: 0,
    dividends: 0,
    dividendYield: 0,
    purchaseDate: new Date().toISOString().split('T')[0]
  });

  const searchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current);
      
      setIsSearching(true);
      searchTimeoutRef.current = window.setTimeout(async () => {
        const results = await searchStocks(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      }, 600);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
    
    return () => {
      if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const handleSelectStock = (stock: StockSearchResult) => {
    setFormData(prev => ({
      ...prev,
      market: stock.market,
      symbol: stock.symbol,
      name: stock.name,
      currentPrice: stock.currentPriceEstimate
    }));
    setShowManualEntry(true);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newStock: StockHolding = {
      id: Math.random().toString(36).substr(2, 9),
      type: AssetType.STOCK,
      account: formData.isNewAccount ? formData.newAccountName : formData.account,
      accountCategory: formData.accountCategory,
      market: formData.market,
      symbol: formData.symbol,
      name: formData.name || formData.symbol,
      quantity: Number(formData.quantity),
      avgPurchasePrice: Number(formData.avgPrice),
      currentPrice: Number(formData.currentPrice),
      dividendsReceived: Number(formData.dividends),
      dividendYield: Number(formData.dividendYield),
      purchaseDate: formData.purchaseDate,
      lastUpdated: new Date().toISOString()
    };
    onAdd(newStock);
  };

  const currencySymbol = formData.market === MarketType.USA ? '$' : '₩';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-white">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
               <TrendingUp size={20} />
             </div>
             <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">주식 자산 추가</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Portfolio Entry</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-2xl transition-all">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide bg-white">
          {!showManualEntry && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">종목 검색</label>
              <div className="relative group">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="예: 삼성전자, AAPL, 테슬라..." 
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 text-slate-900 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-bold"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  {isSearching ? <Loader2 size={24} className="animate-spin" /> : <Search size={24} />}
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((stock, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectStock(stock)}
                      className="w-full flex items-center justify-between p-5 bg-white border border-slate-100 rounded-[1.2rem] hover:border-indigo-300 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs ${stock.market === MarketType.USA ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                          {stock.market === MarketType.USA ? 'US' : 'KR'}
                        </div>
                        <div className="text-left">
                          <div className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{stock.name}</div>
                          <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{stock.symbol}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-slate-700">{new Intl.NumberFormat('ko-KR').format(stock.currentPriceEstimate)}원</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button 
                onClick={() => setShowManualEntry(true)}
                className="w-full flex items-center justify-center gap-3 py-5 rounded-[1.5rem] bg-slate-900 text-white font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
              >
                <Keyboard size={18} />
                직접 입력 모드로 전환
              </button>
            </div>
          )}

          {showManualEntry && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={() => setShowManualEntry(false)} className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all">← 다시 검색하기</button>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">계좌 정보</label>
                <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, isNewAccount: false }))} className={`flex-1 py-3 text-xs rounded-xl font-black ${!formData.isNewAccount ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>기존 계좌</button>
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, isNewAccount: true }))} className={`flex-1 py-3 text-xs rounded-xl font-black ${formData.isNewAccount ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>새 계좌</button>
                </div>
                {formData.isNewAccount ? (
                  <input type="text" placeholder="계좌명" required className="w-full px-5 py-4 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 text-sm font-bold bg-white" value={formData.newAccountName} onChange={e => setFormData(prev => ({ ...prev, newAccountName: e.target.value }))} />
                ) : (
                  <select className="w-full px-5 py-4 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 text-sm font-bold bg-white" value={formData.account} onChange={e => setFormData(prev => ({ ...prev, account: e.target.value }))}>
                    {existingAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2"><Calendar size={12}/> 매수일</label>
                  <input type="date" required className="w-full px-5 py-4 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50" value={formData.purchaseDate} onChange={e => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2"><Percent size={12}/> 예상 배당률(연)</label>
                  <div className="relative">
                    <input type="number" step="0.01" className="w-full px-5 py-4 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50" value={formData.dividendYield || ''} onChange={e => setFormData(prev => ({ ...prev, dividendYield: Number(e.target.value) }))} placeholder="0.00" />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">보유 수량</label>
                  <input type="number" step="any" required className="w-full px-5 py-4 border border-slate-200 rounded-2xl text-sm font-bold" value={formData.quantity || ''} onChange={e => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">평균 단가</label>
                  <input type="number" step="any" required className="w-full px-5 py-4 border border-slate-200 rounded-2xl text-sm font-bold" value={formData.avgPrice || ''} onChange={e => setFormData(prev => ({ ...prev, avgPrice: Number(e.target.value) }))} />
                </div>
              </div>

              <button type="submit" className="w-full py-5 rounded-[1.5rem] bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 shadow-xl active:scale-95 transition-all">포트폴리오에 추가</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddStockModal;
