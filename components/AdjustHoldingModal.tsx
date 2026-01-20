
import React, { useState } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, Info, Hash, Banknote, Calendar } from 'lucide-react';
import { StockHolding, MarketType, TransactionType } from '../types';

interface AdjustHoldingModalProps {
  stock: StockHolding;
  onClose: () => void;
  onAdjust: (id: string, type: 'BUY' | 'SELL', quantity: number, price: number, date: string) => void;
}

const AdjustHoldingModal: React.FC<AdjustHoldingModalProps> = ({ stock, onClose, onAdjust }) => {
  const [type, setType] = useState<TransactionType>(TransactionType.BUY);
  const [quantity, setQuantity] = useState<number>(0);
  const [price, setPrice] = useState<number>(stock.currentPrice);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;
    
    // 현재 수량 계산 (SELL 시 검증용)
    const currentQty = (stock.transactions || []).reduce((acc, t) => {
      return t.type === TransactionType.BUY ? acc + t.quantity : acc - t.quantity;
    }, 0);

    if (type === TransactionType.SELL && quantity > currentQty) {
      alert('보유 수량보다 많이 매도할 수 없습니다.');
      return;
    }
    onAdjust(stock.id, type, quantity, price, date);
    onClose();
  };

  const formatNum = (num: number) => new Intl.NumberFormat('ko-KR').format(num);
  const currencySymbol = stock.market === MarketType.USA ? '$' : '₩';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white">
        <div className="px-8 py-7 border-b border-slate-100 flex items-center justify-between">
          <div><h3 className="text-xl font-black text-slate-800 tracking-tighter">{stock.name}</h3></div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-2xl transition-all"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
            <button type="button" onClick={() => setType(TransactionType.BUY)} className={`flex-1 py-3.5 flex items-center justify-center gap-2 rounded-xl text-xs font-black transition-all ${type === TransactionType.BUY ? 'bg-white text-rose-500 shadow-md' : 'text-slate-500'}`}><ArrowUpCircle size={16} /> 매수</button>
            <button type="button" onClick={() => setType(TransactionType.SELL)} className={`flex-1 py-3.5 flex items-center justify-center gap-2 rounded-xl text-xs font-black transition-all ${type === TransactionType.SELL ? 'bg-white text-blue-500 shadow-md' : 'text-slate-500'}`}><ArrowDownCircle size={16} /> 매도</button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2"><Calendar size={12}/> 거래일</label>
              <input type="date" required className="w-full px-5 py-4 border border-slate-200 rounded-2xl font-bold" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1"><Hash size={12} className="inline mr-1"/> 수량</label>
                <input type="number" step="any" required className="w-full px-5 py-4 border border-slate-200 rounded-2xl font-black" value={quantity || ''} onChange={e => setQuantity(Number(e.target.value))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1"><Banknote size={12} className="inline mr-1"/> 단가 ({currencySymbol})</label>
                <input type="number" step="any" required className="w-full px-5 py-4 border border-slate-200 rounded-2xl font-black" value={price || ''} onChange={e => setPrice(Number(e.target.value))} />
              </div>
            </div>
          </div>

          <button type="submit" className={`w-full py-5 rounded-[1.5rem] text-white font-black text-base shadow-2xl transition-all active:scale-95 ${type === TransactionType.BUY ? 'bg-rose-500' : 'bg-blue-500'}`}>
            기록 저장
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdjustHoldingModal;
