
import React, { useState } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, Info, Hash, Banknote } from 'lucide-react';
import { StockHolding, MarketType } from '../types';

interface AdjustHoldingModalProps {
  stock: StockHolding;
  onClose: () => void;
  onAdjust: (id: string, type: 'buy' | 'sell', quantity: number, price: number) => void;
}

const AdjustHoldingModal: React.FC<AdjustHoldingModalProps> = ({ stock, onClose, onAdjust }) => {
  const [type, setType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState<number>(0);
  const [price, setPrice] = useState<number>(stock.currentPrice);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;
    if (type === 'sell' && quantity > stock.quantity) {
      alert('보유 수량보다 많이 매도할 수 없습니다.');
      return;
    }
    onAdjust(stock.id, type, quantity, price);
    onClose();
  };

  const formatNum = (num: number) => new Intl.NumberFormat('ko-KR').format(num);
  const currencySymbol = stock.market === MarketType.USA ? '$' : '₩';
  const currencyName = stock.market === MarketType.USA ? 'USD' : 'KRW';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white animate-in zoom-in-95 duration-300">
        <div className="px-8 py-7 border-b border-slate-100 flex items-center justify-between bg-white">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tighter">{stock.name}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">거래 기록 관리</p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-2xl transition-all">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-white">
          <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
            <button 
              type="button"
              onClick={() => setType('buy')}
              className={`flex-1 py-3.5 flex items-center justify-center gap-2 rounded-xl text-xs font-black transition-all ${type === 'buy' ? 'bg-white text-rose-500 shadow-md shadow-rose-100' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ArrowUpCircle size={16} /> 매수
            </button>
            <button 
              type="button"
              onClick={() => setType('sell')}
              className={`flex-1 py-3.5 flex items-center justify-center gap-2 rounded-xl text-xs font-black transition-all ${type === 'sell' ? 'bg-white text-blue-500 shadow-md shadow-blue-100' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ArrowDownCircle size={16} /> 매도
            </button>
          </div>

          <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50">
            <div className="flex items-center gap-2 mb-3">
              <Info size={14} className="text-indigo-400" />
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">현재 보유 현황</span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">보유량</span>
                <span className="text-base font-black text-slate-700">{formatNum(stock.quantity)}주</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">평균단가</span>
                <span className="text-base font-black text-slate-700">{currencySymbol}{formatNum(stock.avgPurchasePrice)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                <Hash size={12} className="text-slate-400"/> {type === 'buy' ? '매수' : '매도'} 수량
              </label>
              <div className="relative">
                <input 
                  type="number" step="any" required autoFocus
                  className="w-full px-6 py-5 bg-white text-slate-900 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 font-black text-lg transition-all pr-20 placeholder:text-slate-200"
                  value={quantity || ''}
                  onChange={e => setQuantity(Number(e.target.value))}
                  placeholder="0.00"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Shares</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                <Banknote size={12} className="text-slate-400"/> {type === 'buy' ? '매수' : '매도'} 단가
              </label>
              <div className="relative">
                <input 
                  type="number" step="any" required
                  className="w-full px-6 py-5 bg-white text-slate-900 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 font-black text-lg transition-all pr-20"
                  value={price || ''}
                  onChange={e => setPrice(Number(e.target.value))}
                />
                <div className={`absolute right-5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-[10px] font-black shadow-sm border ${stock.market === MarketType.USA ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                  {currencyName}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              className={`w-full py-5 rounded-[1.5rem] text-white font-black text-base shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 border-b-4 ${type === 'buy' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-100 border-rose-700' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-100 border-blue-700'}`}
            >
              {type === 'buy' ? '매수 기록 저장' : '매도 기록 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdjustHoldingModal;
