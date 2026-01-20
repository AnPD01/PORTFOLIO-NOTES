
import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, Keyboard, TrendingUp, Calendar, Coins, Edit3, Globe } from 'lucide-react';
import { AccountType, MarketType, StockHolding, AssetType, TransactionType } from '../types';
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
    account: existingAccounts[0] || '기본 계좌',
    newAccountName: '',
    isNewAccount: false,
    accountCategory: AccountType.OTHER,
    market: MarketType.KOREA,
    symbol: '',
    name: '',
    quantity: 1,
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
        try { const results = await searchStocks(searchQuery); setSearchResults(results); } 
        catch (e) { console.error(e); } finally { setIsSearching(false); }
      }, 600);
    } else { setSearchResults([]); setIsSearching(false); }
    return () => { if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery]);

  const handleSelectStock = (stock: StockSearchResult) => {
    setFormData(prev => ({
      ...prev,
      market: stock.market,
      symbol: stock.symbol,
      name: stock.name,
      currentPrice: stock.currentPriceEstimate,
      avgPrice: stock.currentPriceEstimate,
      dividendYield: stock.dividendYield 
    }));
    setShowManualEntry(true);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.symbol) return;
    
    // 거래 내역 기반 모델 생성
    const initialTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: formData.purchaseDate,
      type: TransactionType.BUY,
      quantity: Number(formData.quantity),
      price: Number(formData.avgPrice)
    };

    const newStock: StockHolding = {
      id: Math.random().toString(36).substr(2, 9),
      type: AssetType.STOCK,
      account: formData.isNewAccount ? (formData.newAccountName || '새 계좌') : formData.account,
      accountCategory: formData.accountCategory,
      market: formData.market,
      symbol: formData.symbol,
      name: formData.name, 
      
      // 초기 거래 데이터 배열
      transactions: [initialTransaction],

      // 파생 필드 (초기값)
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
             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><TrendingUp size={20} /></div>
             <div><h3 className="text-xl font-black text-slate-800 tracking-tight">주식 추가</h3></div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-2xl transition-all"><X size={20} className="text-slate-400" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide bg-white">
          {!showManualEntry && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">종목 검색</label>
              <div className="relative">
                <input autoFocus type="text" placeholder="예: 삼성전자, 테슬라..." className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-100 font-bold" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">{isSearching ? <Loader2 size={24} className="animate-spin" /> : <Search size={24} />}</div>
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((stock, idx) => (
                    <button key={idx} onClick={() => handleSelectStock(stock)} className="w-full flex items-center justify-between p-5 bg-white border border-slate-100 rounded-[1.2rem] hover:border-indigo-300 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs ${stock.market === MarketType.USA ? 'bg-indigo-500' : 'bg-emerald-500'}`}>{stock.market === MarketType.USA ? 'US' : 'KR'}</div>
                        <div className="text-left"><div className="font-black text-slate-800">{stock.name}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stock.symbol}</div></div>
                      </div>
                      <div className="text-right"><div className="text-sm font-black text-slate-700">{stock.market === MarketType.USA ? '$' : '₩'}{new Intl.NumberFormat('ko-KR').format(stock.currentPriceEstimate)}</div></div>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setShowManualEntry(true)} className="w-full flex items-center justify-center gap-3 py-5 rounded-[1.5rem] bg-slate-100 text-slate-500 font-black text-sm hover:bg-slate-200 transition-all"><Keyboard size={18} /> 직접 입력</button>
            </div>
          )}

          {showManualEntry && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <button type="button" onClick={() => setShowManualEntry(false)} className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">← 다시 검색</button>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">종목명</label>
                <input type="text" required placeholder="삼성전자" className="w-full px-5 py-4 border border-indigo-200 bg-indigo-50/20 text-slate-900 rounded-2xl font-bold" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">매수일</label><input type="date" required className="w-full px-5 py-4 border border-slate-200 rounded-2xl text-sm font-bold" value={formData.purchaseDate} onChange={e => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))} /></div>
                 <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">수량</label><input type="number" step="any" required className="w-full px-5 py-4 border border-slate-200 rounded-2xl text-sm font-bold" value={formData.quantity || ''} onChange={e => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))} /></div>
              </div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">매입 단가 ({currencySymbol})</label><input type="number" step="any" required className="w-full px-5 py-4 border border-slate-200 rounded-2xl text-sm font-bold" value={formData.avgPrice || ''} onChange={e => setFormData(prev => ({ ...prev, avgPrice: Number(e.target.value) }))} /></div>
              <button type="submit" className="w-full py-5 rounded-[1.5rem] bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 shadow-2xl active:scale-95 transition-all">포트폴리오에 추가</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddStockModal;
