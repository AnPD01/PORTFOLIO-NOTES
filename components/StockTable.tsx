
import React, { useState } from 'react';
import { AssetHolding, AssetType, CashBalance, MarketType, TransactionType } from '../types';
import { Trash2, Landmark, Plus, ChevronDown, CircleDollarSign, TrendingUp, ScrollText, Globe, AlertTriangle, X } from 'lucide-react';
import StockDetailModal from './StockDetailModal';
import BondDetailModal from './BondDetailModal';
import CashManagementModal from './CashManagementModal';
import AdjustHoldingModal from './AdjustHoldingModal';
import { calculateHoldingStatus } from '../services/portfolioService';

const EXCHANGE_RATE = 1350;

interface StockTableProps {
  holdings: AssetHolding[];
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  onDelete?: (id: string) => void;
  cashBalance: CashBalance;
  onUpdateCash: (amount: number, currency: 'KRW' | 'USD') => void;
  onAdjustHolding: (id: string, type: string, quantity: number, price: number, date: string) => void;
  realizedProfit?: number;
  portfolioTotalEval: number;
  autoIncome?: { krw: number, usd: number };
}

const StockTable: React.FC<StockTableProps> = ({ 
  holdings, title, isOpen, onToggle, onDelete,
  cashBalance, onUpdateCash, onAdjustHolding, realizedProfit = 0,
  autoIncome = { krw: 0, usd: 0 }
}) => {
  const [selectedAsset, setSelectedAsset] = useState<AssetHolding | null>(null);
  const [adjustingAsset, setAdjustingAsset] = useState<AssetHolding | null>(null);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<AssetHolding | null>(null);

  const isOverseasAccount = title.includes('해외') || (holdings.length > 0 && holdings.every(h => h.market === MarketType.USA));
  const accountCurrency = isOverseasAccount ? 'USD' : 'KRW';
  const accountSymbol = isOverseasAccount ? '$' : '₩';

  const formatNum = (num: number) => {
    if (isOverseasAccount) return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    return new Intl.NumberFormat('ko-KR').format(Math.round(num));
  };

  const now = new Date();

  const accountSummary = holdings.reduce((acc, asset) => {
    // 실시간 계산
    const { quantity, avgPrice, realizedProfit: holdingRealizedProfit } = calculateHoldingStatus(asset.transactions || []);
    
    let rate = 1;
    if (isOverseasAccount && asset.market === MarketType.KOREA) rate = 1 / EXCHANGE_RATE;
    if (!isOverseasAccount && asset.market === MarketType.USA) rate = EXCHANGE_RATE;

    const buyAmt = (quantity * avgPrice) * rate;
    const evalAmt = (quantity * asset.currentPrice) * rate;
    
    let automatedIncome = 0;
    const pDate = new Date(asset.purchaseDate);
    const daysHeld = Math.floor((now.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24));

    if (asset.type === AssetType.BOND && asset.bondConfig) {
      if (daysHeld > 0) automatedIncome = (asset.bondConfig.faceValue * quantity * (asset.bondConfig.couponRate / 100) / 365) * daysHeld;
    } else if (asset.type === AssetType.STOCK && asset.dividendYield) {
      if (daysHeld > 0) automatedIncome = (evalAmt * (asset.dividendYield / 100) / 365) * daysHeld;
    }

    acc.totalPurchase += buyAmt;
    acc.totalEval += (evalAmt + (automatedIncome * rate));
    acc.totalDividends += ((asset.dividendsReceived + automatedIncome) * rate);
    acc.realizedDividendsOnly += (asset.dividendsReceived * rate);
    return acc;
  }, { totalPurchase: 0, totalEval: 0, totalDividends: 0, realizedDividendsOnly: 0 });

  const currentCashInAccountCurrency = isOverseasAccount ? (cashBalance.usd + autoIncome.usd) : (cashBalance.krw + autoIncome.krw);
  const unrealizedPL = accountSummary.totalEval - accountSummary.totalPurchase;
  const unrealizedPLRate = accountSummary.totalPurchase > 0 ? (unrealizedPL / accountSummary.totalPurchase) * 100 : 0;
  const divYield = accountSummary.totalPurchase > 0 ? (accountSummary.realizedDividendsOnly / accountSummary.totalPurchase) * 100 : 0;
  const totalReturnRate = accountSummary.totalPurchase > 0 ? ((unrealizedPL + accountSummary.totalDividends + realizedProfit) / accountSummary.totalPurchase) * 100 : 0;

  return (
    <>
      <div className={`rounded-[2rem] overflow-hidden mb-5 border transition-all duration-700 bg-white ${isOpen ? 'shadow-2xl border-indigo-100' : 'shadow-sm border-slate-100'}`}>
        <div onClick={onToggle} className={`px-8 py-5 cursor-pointer relative group ${isOpen ? 'bg-indigo-50/10' : 'bg-white'}`}>
          <div className="flex flex-col xl:flex-row justify-between gap-5">
            <div className="flex items-center gap-4 min-w-[220px]">
              <div className={`p-3 rounded-2xl ${isOpen ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'bg-slate-100 text-slate-400'}`}>
                {isOverseasAccount ? <Globe size={18} /> : <Landmark size={18} />}
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-[16px]">{title || '미지정'}</h3>
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{accountCurrency} ACCOUNT</span>
              </div>
            </div>
            
            <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3">
               {[
                 { label: '매입액', value: `${accountSymbol}${formatNum(accountSummary.totalPurchase)}` },
                 { label: '평가액', value: `${accountSymbol}${formatNum(accountSummary.totalEval)}` },
                 { label: '수익률', value: `${unrealizedPLRate.toFixed(2)}%`, color: unrealizedPLRate >= 0 ? 'text-blue-500' : 'text-rose-500' },
                 { label: '배당수익률', value: `${divYield.toFixed(2)}%`, color: 'text-emerald-500' },
                 { label: '종합수익률', value: `${totalReturnRate.toFixed(2)}%`, color: totalReturnRate >= 0 ? 'text-blue-500' : 'text-rose-500' },
               ].map((item, idx) => (
                 <div key={idx} className="flex flex-col"><span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{item.label}</span><span className={`text-[13px] font-black tabular-nums tracking-tighter ${item.color || 'text-slate-900'}`}>{item.value}</span></div>
               ))}
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full text-left min-w-[1050px]">
              <thead>
                <tr className="text-slate-400 uppercase text-[7.5px] tracking-[0.2em] font-black border-b border-slate-50 bg-slate-50/30">
                  <th className="px-8 py-3">종목 정보</th>
                  <th className="px-4 py-3 text-right">매입액</th>
                  <th className="px-4 py-3 text-right">보유수량</th>
                  <th className="px-4 py-3 text-right">평가액</th>
                  <th className="px-4 py-3 text-right">수익률</th>
                  <th className="px-4 py-3 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {holdings.map((asset) => {
                  const { quantity, avgPrice } = calculateHoldingStatus(asset.transactions || []);
                  const currencySymbol = asset.market === MarketType.USA ? '$' : '₩';
                  const buyAmt = quantity * avgPrice;
                  const evalAmt = quantity * asset.currentPrice;
                  const plRate = buyAmt > 0 ? ((evalAmt - buyAmt) / buyAmt) * 100 : 0;

                  return (
                    <tr key={asset.id} onClick={() => setSelectedAsset(asset)} className="transition-all hover:bg-slate-50/50 cursor-pointer">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${asset.type === AssetType.BOND ? 'bg-violet-50 text-violet-500' : 'bg-indigo-50 text-indigo-500'}`}>
                            {asset.type === AssetType.BOND ? <ScrollText size={14} /> : <TrendingUp size={14} />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-[12px] text-slate-800">{asset.name}</span>
                            <span className="text-[6.5px] font-black text-slate-400 tracking-widest">{asset.symbol}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-black text-[13px] text-slate-500 tabular-nums tracking-tighter">{currencySymbol}{formatNum(buyAmt)}</td>
                      <td className="px-4 py-4 text-right font-bold text-[11px] text-slate-600 tabular-nums">{quantity.toLocaleString()}{asset.type === AssetType.BOND ? '좌' : '주'}</td>
                      <td className="px-4 py-4 text-right font-black text-[13px] text-slate-800 tabular-nums">{currencySymbol}{formatNum(evalAmt)}</td>
                      <td className={`px-4 py-4 text-right text-[13px] font-black ${plRate >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>{plRate.toFixed(2)}%</td>
                      <td className="px-4 py-4 text-center flex items-center justify-center gap-2">
                         <button onClick={(e) => { e.stopPropagation(); setAdjustingAsset(asset); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"><Plus size={14}/></button>
                         <button onClick={(e) => { e.stopPropagation(); setAssetToDelete(asset); }} className="p-2 text-rose-300 hover:text-rose-600"><Trash2 size={14}/></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCashModalOpen && <CashManagementModal accountName={title} currentCash={{krw: cashBalance.krw + autoIncome.krw, usd: cashBalance.usd + autoIncome.usd}} onClose={() => setIsCashModalOpen(false)} onUpdate={onUpdateCash} />}
      {adjustingAsset && <AdjustHoldingModal stock={adjustingAsset} onClose={() => setAdjustingAsset(null)} onAdjust={onAdjustHolding} />}
      {selectedAsset?.type === AssetType.STOCK && <StockDetailModal stock={selectedAsset} onClose={() => setSelectedAsset(null)} />}
    </>
  );
};

export default StockTable;
