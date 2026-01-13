
import React, { useState } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Banknote, Landmark } from 'lucide-react';
import { CashBalance } from '../types';

interface CashManagementModalProps {
  accountName: string;
  currentCash: CashBalance;
  onClose: () => void;
  onUpdate: (amount: number, currency: 'KRW' | 'USD') => void;
}

const CashManagementModal: React.FC<CashManagementModalProps> = ({ 
  accountName, 
  currentCash, 
  onClose, 
  onUpdate 
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<'deposit' | 'withdraw'>('deposit');
  const [currency, setCurrency] = useState<'KRW' | 'USD'>('KRW');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    
    const currentBalance = currency === 'KRW' ? currentCash.krw : currentCash.usd;
    if (type === 'withdraw' && amount > currentBalance) {
      alert(`출금액이 현재 ${currency} 잔액보다 많을 수 없습니다.`);
      return;
    }

    const finalAmount = type === 'deposit' ? amount : -amount;
    onUpdate(finalAmount, currency);
    onClose();
  };

  const formatNum = (num: number) => new Intl.NumberFormat('ko-KR').format(num);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[150] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/40 animate-in zoom-in-95">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl">
              <Landmark size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">예수금 관리</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{accountName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 bg-slate-50/50 space-y-2">
          <div className="flex justify-between items-center px-6 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">원화 잔액</span>
            <span className="text-lg font-black text-slate-900">₩{formatNum(currentCash.krw)}</span>
          </div>
          <div className="flex justify-between items-center px-6 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">달러 잔액</span>
            <span className="text-lg font-black text-slate-900">$ {formatNum(currentCash.usd)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
            <button type="button" onClick={() => setCurrency('KRW')} className={`py-3 text-[11px] rounded-xl font-black transition-all ${currency === 'KRW' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>KOREAN WON (₩)</button>
            <button type="button" onClick={() => setCurrency('USD')} className={`py-3 text-[11px] rounded-xl font-black transition-all ${currency === 'USD' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>US DOLLAR ($)</button>
          </div>

          <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
            <button type="button" onClick={() => setType('deposit')} className={`flex-1 py-3.5 text-xs font-black rounded-xl transition-all ${type === 'deposit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>입금하기</button>
            <button type="button" onClick={() => setType('withdraw')} className={`flex-1 py-3.5 text-xs font-black rounded-xl transition-all ${type === 'withdraw' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>출금하기</button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">금액 입력 ({currency})</label>
            <div className="relative">
              <input type="number" required autoFocus className="w-full px-6 py-5 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-amber-100 font-black text-slate-700 pr-16 text-lg" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">{currency === 'KRW' ? '₩' : '$'}</span>
            </div>
          </div>

          <button type="submit" className={`w-full py-5 rounded-[1.5rem] text-white font-black text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${type === 'deposit' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
            <Banknote size={18} /> {type === 'deposit' ? '완료' : '완료'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CashManagementModal;
