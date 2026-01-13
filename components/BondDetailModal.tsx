
import React from 'react';
import { X, ScrollText, Calendar, Wallet, TrendingUp, Info } from 'lucide-react';
import { AssetHolding } from '../types';

interface BondDetailModalProps {
  bond: AssetHolding;
  onClose: () => void;
}

const BondDetailModal: React.FC<BondDetailModalProps> = ({ bond, onClose }) => {
  if (!bond.bondConfig) return null;

  const now = new Date();
  const pDate = new Date(bond.bondConfig.purchaseDate);
  const mDate = new Date(bond.bondConfig.maturityDate);
  
  const daysTotal = Math.floor((mDate.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysHeld = Math.floor((now.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24));
  const progress = Math.min(100, Math.max(0, (daysHeld / daysTotal) * 100));

  const accrInterest = (bond.bondConfig.faceValue * bond.quantity * (bond.bondConfig.couponRate / 100) / 365) * Math.max(0, daysHeld);
  const totalAtMaturity = (bond.bondConfig.faceValue * bond.quantity) + (bond.bondConfig.faceValue * bond.quantity * (bond.bondConfig.couponRate / 100) * (daysTotal / 365));

  const formatKRW = (num: number) => new Intl.NumberFormat('ko-KR').format(Math.round(num)) + '원';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl z-[100] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-white/60 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-amber-50/30">
          <div className="flex items-center gap-4">
            <div className="bg-amber-500 text-white p-4 rounded-2xl shadow-lg">
              <ScrollText size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{bond.name}</h2>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-[0.2em] mt-1">{bond.symbol} • BOND FIXED INCOME</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/50 hover:bg-white rounded-xl transition-all shadow-sm"><X size={20}/></button>
        </div>

        <div className="p-10 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Wallet size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">현재 누적 이자</span>
              </div>
              <div className="text-xl font-black text-emerald-600 tabular-nums">{formatKRW(accrInterest)}</div>
              <p className="text-[9px] text-slate-400 font-bold mt-1 tracking-tight">구매 후 {daysHeld}일 경과</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <TrendingUp size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">만기 예상 원리금</span>
              </div>
              <div className="text-xl font-black text-slate-900 tabular-nums">{formatKRW(totalAtMaturity)}</div>
              <p className="text-[9px] text-slate-400 font-bold mt-1 tracking-tight">세전 수익 기준</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              <span>만기 진행률</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div className="h-full bg-amber-500 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="flex flex-col">
                <span>구매일</span>
                <span className="text-slate-700">{bond.bondConfig.purchaseDate}</span>
              </div>
              <div className="flex flex-col text-right">
                <span>만기일</span>
                <span className="text-slate-700">{bond.bondConfig.maturityDate}</span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/30 border border-indigo-100/50 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info size={14} className="text-indigo-500" />
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">채권 세부 사양</span>
            </div>
            <div className="grid grid-cols-2 gap-y-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase">표면 금리 (Coupon)</span>
                <span className="text-sm font-black text-slate-800">{bond.bondConfig.couponRate}% / 연</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase">이자 지급 주기</span>
                <span className="text-sm font-black text-slate-800">{bond.bondConfig.interestCycle}개월</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase">보유 수량</span>
                <span className="text-sm font-black text-slate-800">{bond.quantity}좌</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase">액면가</span>
                <span className="text-sm font-black text-slate-800">{formatKRW(bond.bondConfig.faceValue)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-10 py-6 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 shadow-xl transition-all">닫기</button>
        </div>
      </div>
    </div>
  );
};

export default BondDetailModal;
