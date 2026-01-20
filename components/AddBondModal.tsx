
import React, { useState } from 'react';
import { X, Search, Loader2, ScrollText, Calendar, Percent, Sparkles, Globe } from 'lucide-react';
import { AssetHolding, AccountType, MarketType, AssetType, TransactionType } from '../types';
import { lookupBondInfo } from '../services/geminiService';

interface AddBondModalProps {
  onClose: () => void;
  onAdd: (asset: AssetHolding) => void;
  existingAccounts: string[];
}

const AddBondModal: React.FC<AddBondModalProps> = ({ onClose, onAdd, existingAccounts }) => {
  const [symbol, setSymbol] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [lastFound, setLastFound] = useState(false);
  const [formData, setFormData] = useState({
    account: existingAccounts[0] || '',
    market: MarketType.KOREA,
    name: '',
    quantity: 1,
    purchasePrice: 10000,
    faceValue: 10000,
    couponRate: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    maturityDate: '2027-12-31'
  });

  const handleBondLookup = async () => {
    if (symbol.length < 3) return;
    setIsSearching(true);
    setLastFound(false);
    
    try {
      const info = await lookupBondInfo(symbol);
      if (info) {
        setFormData(prev => ({
          ...prev,
          name: info.name,
          couponRate: info.couponRate,
          maturityDate: info.maturityDate,
          faceValue: info.faceValue,
          purchasePrice: info.faceValue
        }));
        setLastFound(true);
      } else {
        alert("해당 번호의 채권 정보를 찾을 수 없습니다. 직접 입력해주세요.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert("채권명을 입력하거나 조회를 먼저 진행해주세요.");
      return;
    }
    
    // Fix: transactions property is required by AssetHolding. 
    // Initializing with the starting purchase transaction.
    const newBond: AssetHolding = {
      id: Math.random().toString(36).substr(2, 9),
      type: AssetType.BOND,
      account: formData.account,
      accountCategory: AccountType.OTHER,
      market: formData.market,
      symbol: symbol.toUpperCase(),
      name: formData.name,
      
      // Initialize transaction history with the current purchase
      transactions: [{
        id: Math.random().toString(36).substr(2, 9),
        date: formData.purchaseDate,
        type: TransactionType.BUY,
        quantity: Number(formData.quantity),
        price: Number(formData.purchasePrice)
      }],

      quantity: Number(formData.quantity),
      avgPurchasePrice: Number(formData.purchasePrice),
      currentPrice: Number(formData.purchasePrice), 
      dividendsReceived: 0,
      purchaseDate: formData.purchaseDate,
      lastUpdated: new Date().toISOString(),
      bondConfig: {
        purchaseDate: formData.purchaseDate,
        maturityDate: formData.maturityDate,
        couponRate: formData.couponRate,
        faceValue: formData.faceValue,
        interestCycle: 3
      }
    };
    onAdd(newBond);
  };

  const currencySymbol = formData.market === MarketType.USA ? '$' : '₩';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-white animate-in zoom-in-95">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-violet-50 text-violet-600 rounded-xl">
               <ScrollText size={20} />
             </div>
             <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tighter">채권 자산 추가</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">AI-Powered Bond Registry</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-2xl transition-all"><X size={20} className="text-slate-400" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto scrollbar-hide bg-white">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">종목 번호 또는 ISIN</label>
            <div className="flex gap-2">
              <input 
                type="text" required placeholder="예: KR103502G997"
                className="flex-1 px-5 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold uppercase tracking-wider placeholder:text-slate-300 transition-all"
                value={symbol} onChange={e => setSymbol(e.target.value)}
              />
              <button 
                type="button" onClick={handleBondLookup}
                disabled={isSearching}
                className="px-6 py-4 bg-violet-600 text-white rounded-2xl font-black text-xs hover:bg-violet-700 transition-all flex items-center gap-2 shadow-lg shadow-violet-100 disabled:opacity-50"
              >
                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                조회
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                <Globe size={12} className="text-slate-400"/> 발행 시장
              </label>
              <select 
                className="w-full px-5 py-4 border border-slate-200 rounded-2xl text-sm font-bold bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50" 
                value={formData.market} 
                onChange={e => setFormData(prev => ({ ...prev, market: e.target.value as MarketType }))}
              >
                <option value={MarketType.KOREA}>국내 (KRW)</option>
                <option value={MarketType.USA}>미국 (USD)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">보유 계좌</label>
              <select className="w-full px-5 py-4 border border-slate-200 rounded-2xl text-sm font-bold bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50" value={formData.account} onChange={e => setFormData(prev => ({ ...prev, account: e.target.value }))}>
                {existingAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">채권명</label>
            <input 
              type="text" required
              placeholder="조회 시 자동 입력됩니다"
              className={`w-full px-5 py-4 border rounded-2xl text-sm font-bold transition-all text-slate-900 ${lastFound ? 'bg-indigo-50/40 border-indigo-300 ring-2 ring-indigo-50' : 'bg-white border-slate-200'}`} 
              value={formData.name} 
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">구매 수량 (좌)</label>
              <input type="number" required className="w-full px-5 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all" value={formData.quantity} onChange={e => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">구매 단가 ({currencySymbol})</label>
              <input type="number" required step="any" className="w-full px-5 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all" value={formData.purchasePrice} onChange={e => setFormData(prev => ({ ...prev, purchasePrice: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">표면 금리 (%)</label>
              <div className="relative">
                <input 
                  type="number" step="0.01" 
                  className="w-full px-5 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                  value={formData.couponRate} 
                  onChange={e => setFormData(prev => ({ ...prev, couponRate: Number(e.target.value) }))} 
                />
                <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">만기일</label>
              <div className="relative">
                <input type="date" className="w-full px-5 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all" value={formData.maturityDate} onChange={e => setFormData(prev => ({ ...prev, maturityDate: e.target.value }))} />
                <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full py-5 bg-violet-600 text-white rounded-[1.5rem] font-black text-sm hover:bg-violet-700 shadow-xl shadow-violet-100 active:scale-95 transition-all flex items-center justify-center gap-2 border-b-4 border-violet-800">
            <ScrollText size={18} />
            채권 기록 저장하기
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddBondModal;
