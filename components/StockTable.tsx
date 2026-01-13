
import React, { useState } from 'react';
import { AssetHolding, AssetType, CashBalance, MarketType } from '../types';
import { Trash2, Landmark, Plus, ChevronDown, CircleDollarSign, TrendingUp, ScrollText, BarChart2, Globe } from 'lucide-react';
import StockDetailModal from './StockDetailModal';
import BondDetailModal from './BondDetailModal';
import CashManagementModal from './CashManagementModal';
import AdjustHoldingModal from './AdjustHoldingModal';

const EXCHANGE_RATE = 1350;

interface StockTableProps {
  holdings: AssetHolding[];
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  onDelete?: (id: string) => void;
  cashBalance: CashBalance;
  onUpdateCash: (amount: number, currency: 'KRW' | 'USD') => void;
  onAdjustHolding: (id: string, type: 'buy' | 'sell', quantity: number, price: number) => void;
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

  const isOverseasAccount = title.includes('해외') || (holdings.length > 0 && holdings.every(h => h.market === MarketType.USA));
  const accountCurrency = isOverseasAccount ? 'USD' : 'KRW';
  const accountSymbol = isOverseasAccount ? '$' : '₩';

  const formatNum = (num: number) => {
    if (isOverseasAccount) {
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    }
    return new Intl.NumberFormat('ko-KR').format(Math.round(num));
  };

  const now = new Date();

  const accountSummary = holdings.reduce((acc, asset) => {
    let rate = 1;
    if (isOverseasAccount && asset.market === MarketType.KOREA) rate = 1 / EXCHANGE_RATE;
    if (!isOverseasAccount && asset.market === MarketType.USA) rate = EXCHANGE_RATE;

    const buyAmt = (asset.quantity * asset.avgPurchasePrice) * rate;
    const evalAmt = (asset.quantity * asset.currentPrice) * rate;
    
    // 개별 종목 자동 수익 계산
    let automatedIncome = 0;
    const pDate = new Date(asset.purchaseDate);
    const daysHeld = Math.floor((now.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24));

    if (asset.type === AssetType.BOND && asset.bondConfig) {
      if (daysHeld > 0) {
        automatedIncome = (asset.bondConfig.faceValue * asset.quantity * (asset.bondConfig.couponRate / 100) / 365) * daysHeld;
      }
    } else if (asset.type === AssetType.STOCK && asset.dividendYield) {
      if (daysHeld > 0) {
        automatedIncome = (asset.quantity * asset.currentPrice * (asset.dividendYield / 100) / 365) * daysHeld;
      }
    }

    acc.totalPurchase += buyAmt;
    acc.totalEval += (evalAmt + (automatedIncome * rate));
    acc.totalDividends += ((asset.dividendsReceived + automatedIncome) * rate);
    return acc;
  }, { totalPurchase: 0, totalEval: 0, totalDividends: 0 });

  // 실시간 예수금: (입금 잔액 + 자동 발생 수익)
  const currentCashInAccountCurrency = isOverseasAccount 
    ? (cashBalance.usd + autoIncome.usd) 
    : (cashBalance.krw + autoIncome.krw);

  const unrealizedPL = accountSummary.totalEval - accountSummary.totalPurchase;
  const unrealizedPLRate = accountSummary.totalPurchase > 0 ? (unrealizedPL / accountSummary.totalPurchase) * 100 : 0;
  
  const tradingProfitRate = accountSummary.totalPurchase > 0 ? (realizedProfit / accountSummary.totalPurchase) * 100 : 0;
  const divYield = accountSummary.totalPurchase > 0 ? (accountSummary.totalDividends / accountSummary.totalPurchase) * 100 : 0;
  
  const totalComprehensiveReturn = unrealizedPL + accountSummary.totalDividends + realizedProfit;
  const totalReturnRate = accountSummary.totalPurchase > 0 ? (totalComprehensiveReturn / accountSummary.totalPurchase) * 100 : 0;

  return (
    <>
      <div className={`rounded-[2.5rem] overflow-hidden mb-8 border transition-all duration-700 bg-white ${isOpen ? 'shadow-2xl border-indigo-100 ring-1 ring-indigo-50' : 'shadow-sm border-slate-100 hover:border-slate-200'}`}>
        <div 
          onClick={onToggle}
          className={`px-8 py-8 cursor-pointer transition-all duration-500 relative group ${isOpen ? 'bg-indigo-50/10' : 'bg-white'}`}
        >
          <div className="flex flex-col xl:flex-row items-start xl:items-stretch justify-between gap-8">
            <div className="flex items-center gap-5 min-w-[200px] xl:border-r xl:border-slate-100 xl:pr-8">
              <div className={`p-4 rounded-2xl transition-all duration-500 shadow-xl ${isOpen ? 'bg-indigo-600 text-white shadow-indigo-100 scale-105' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 shadow-slate-50'}`}>
                {isOverseasAccount ? <Globe size={24} /> : <Landmark size={24} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-900 text-lg tracking-tighter leading-none">{title}</h3>
                  <div className={`p-1 rounded-full bg-slate-50 text-slate-300 transition-transform duration-700 ease-in-out ${isOpen ? 'rotate-180 bg-indigo-100 text-indigo-600' : ''}`}>
                    <ChevronDown size={10} strokeWidth={4} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.3em]">Asset Intelligence</p>
                  <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md ${isOverseasAccount ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                    {accountCurrency}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col gap-5">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: '평가액', value: `${accountSymbol}${formatNum(accountSummary.totalEval)}`, color: 'text-slate-900' },
                  { label: '수익률', value: `${unrealizedPLRate >= 0 ? '+' : ''}${unrealizedPLRate.toFixed(2)}%`, color: unrealizedPLRate >= 0 ? 'text-rose-500' : 'text-blue-500' },
                  { label: '매매수익', value: `${accountSymbol}${formatNum(realizedProfit)}`, color: realizedProfit >= 0 ? 'text-rose-500' : 'text-blue-500' },
                  { label: '매매수익률', value: `${tradingProfitRate >= 0 ? '+' : ''}${tradingProfitRate.toFixed(2)}%`, color: tradingProfitRate >= 0 ? 'text-rose-500' : 'text-blue-500' },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col border-l border-slate-50/50 pl-3 first:border-l-0 first:pl-0">
                    <span className="text-[8px] text-slate-400 font-black mb-1 uppercase tracking-widest">{item.label}</span>
                    <span className={`text-[13px] font-black tabular-nums tracking-tighter ${item.color}`}>{item.value}</span>
                  </div>
                ))}
                <div 
                  onClick={(e) => { e.stopPropagation(); setIsCashModalOpen(true); }}
                  className="flex flex-col cursor-pointer group/cash border-l border-slate-50/50 pl-3 hover:opacity-70 transition-all"
                >
                  <span className="text-[8px] text-slate-400 font-black mb-1 uppercase tracking-widest flex items-center gap-1.5 group-hover/cash:text-amber-500">
                    예수금 <CircleDollarSign size={10} className="text-amber-400" />
                  </span>
                  <span className="text-[13px] font-black text-amber-600 tabular-nums tracking-tighter">{accountSymbol}{formatNum(currentCashInAccountCurrency)}</span>
                </div>
              </div>

              <div className="h-px bg-slate-50/80 w-full" />

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: '배당금', value: `${accountSymbol}${formatNum(accountSummary.totalDividends)}`, color: 'text-emerald-600' },
                  { label: '배당수익률', value: `${divYield.toFixed(2)}%`, color: 'text-emerald-500' },
                  { label: '종합수익', value: `${accountSymbol}${formatNum(totalComprehensiveReturn)}`, color: totalComprehensiveReturn >= 0 ? 'text-rose-500' : 'text-blue-500' },
                  { label: '종합수익률', value: `${totalReturnRate >= 0 ? '+' : ''}${totalReturnRate.toFixed(2)}%`, color: totalReturnRate >= 0 ? 'text-rose-500' : 'text-blue-500' },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col border-l border-slate-50/50 pl-3 first:border-l-0 first:pl-0">
                    <span className="text-[8px] text-slate-400 font-black mb-1 uppercase tracking-widest">{item.label}</span>
                    <span className={`text-[13px] font-black tabular-nums tracking-tighter ${item.color}`}>{item.value}</span>
                  </div>
                ))}
                <div className="hidden md:flex flex-col border-l border-slate-50/50 pl-3 opacity-0 pointer-events-none">
                  <span className="text-[8px] mb-1">EMPTY</span>
                  <span className="text-[13px]"> - </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`grid transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'grid-rows-[1fr] opacity-100 scale-100' : 'grid-rows-[0fr] opacity-0 scale-[0.99] overflow-hidden'}`}>
          <div className="overflow-hidden border-t border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[950px]">
                <thead>
                  <tr className="text-slate-400 uppercase text-[8px] tracking-[0.2em] font-black border-b border-slate-50 bg-slate-50/30">
                    <th className="px-8 py-4">종목 정보</th>
                    <th className="px-4 py-4 text-right">보유현황</th>
                    <th className="px-4 py-4 text-right">평가액</th>
                    <th className="px-4 py-4 text-right">수익률</th>
                    <th className="px-4 py-4 text-right">매매수익</th>
                    <th className="px-4 py-4 text-right">배당수익</th>
                    <th className="px-4 py-4 text-right">종합수익</th>
                    <th className="w-20 px-4 py-4 text-center">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {holdings.map((asset) => {
                    const currencySymbol = asset.market === MarketType.USA ? '$' : '₩';
                    const buyAmt = asset.quantity * asset.avgPurchasePrice;
                    const evalAmt = asset.quantity * asset.currentPrice;
                    
                    // 개별 행 자동 수익 계산
                    let automatedIncome = 0;
                    const pDate = new Date(asset.purchaseDate);
                    const daysHeld = Math.floor((now.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24));

                    if (asset.type === AssetType.BOND && asset.bondConfig) {
                      if (daysHeld > 0) automatedIncome = (asset.bondConfig.faceValue * asset.quantity * (asset.bondConfig.couponRate / 100) / 365) * daysHeld;
                    } else if (asset.type === AssetType.STOCK && asset.dividendYield) {
                      if (daysHeld > 0) automatedIncome = (evalAmt * (asset.dividendYield / 100) / 365) * daysHeld;
                    }

                    const pl = evalAmt - buyAmt;
                    const totalIncome = asset.dividendsReceived + automatedIncome;
                    const comprehensiveReturn = pl + totalIncome;
                    const plRate = buyAmt > 0 ? (pl / buyAmt) * 100 : 0;

                    const rowFormat = (val: number) => {
                      if (asset.market === MarketType.USA) {
                        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
                      }
                      return new Intl.NumberFormat('ko-KR').format(Math.round(val));
                    };

                    return (
                      <tr 
                        key={asset.id} 
                        onClick={() => setSelectedAsset(asset)}
                        className="transition-all group hover:bg-slate-50/50 cursor-pointer"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl transition-all duration-500 group-hover:scale-110 ${asset.type === AssetType.BOND ? 'bg-violet-50 text-violet-500 shadow-sm shadow-violet-50' : 'bg-indigo-50 text-indigo-500 shadow-sm shadow-indigo-50'}`}>
                              {asset.type === AssetType.BOND ? <ScrollText size={16} /> : <TrendingUp size={16} />}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-[13px] text-slate-800 tracking-tighter group-hover:text-indigo-600 transition-colors">
                                  {asset.name}
                                </span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAdjustingAsset(asset);
                                  }}
                                  className="p-1 rounded-md bg-slate-100 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all border border-slate-200"
                                >
                                  <Plus size={10} strokeWidth={4} />
                                </button>
                              </div>
                              <span className="text-[7px] font-black px-1.5 py-0.5 mt-1 bg-slate-100 text-slate-400 rounded-md uppercase tracking-[0.2em] w-fit">
                                {asset.symbol}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-right">
                          <div className="font-bold text-[12px] text-slate-600 tabular-nums">
                            {new Intl.NumberFormat('ko-KR').format(asset.quantity)}{asset.type === AssetType.BOND ? '좌' : '주'}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-right font-black text-[14px] text-slate-800 tabular-nums">
                          {currencySymbol}{rowFormat(evalAmt)}
                        </td>
                        <td className="px-4 py-5 text-right tabular-nums">
                          <div className={`text-[14px] font-black ${plRate >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                            {plRate >= 0 ? '+' : ''}{plRate.toFixed(2)}%
                          </div>
                        </td>
                        <td className="px-4 py-5 text-right tabular-nums">
                          <div className={`text-[14px] font-black ${pl >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                            {currencySymbol}{(pl >= 0 ? '+' : '') + rowFormat(pl)}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-right font-black text-[14px] text-emerald-600 tabular-nums">
                          <div className="flex flex-col items-end">
                             <span>{currencySymbol}{rowFormat(totalIncome)}</span>
                             {automatedIncome > 0 && <span className="text-[8px] opacity-60 font-medium">Auto +{rowFormat(automatedIncome)}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-right tabular-nums">
                          <div className={`text-[14px] font-black ${comprehensiveReturn >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                            {currencySymbol}{rowFormat(comprehensiveReturn)}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <button 
                            type="button"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (onDelete) onDelete(asset.id); 
                            }} 
                            className="p-3 text-slate-300 hover:text-rose-600 transition-all hover:scale-125 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 flex items-center justify-center mx-auto"
                            title="종목 삭제"
                          >
                            <Trash2 size={20} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isCashModalOpen && (
        <CashManagementModal 
          accountName={title} 
          currentCash={{
            krw: cashBalance.krw + autoIncome.krw,
            usd: cashBalance.usd + autoIncome.usd
          }} 
          onClose={() => setIsCashModalOpen(false)} 
          onUpdate={onUpdateCash} 
        />
      )}
      
      {adjustingAsset && (
        <AdjustHoldingModal 
          stock={adjustingAsset} 
          onClose={() => setAdjustingAsset(null)} 
          onAdjust={onAdjustHolding} 
        />
      )}

      {selectedAsset?.type === AssetType.STOCK && <StockDetailModal stock={selectedAsset} onClose={() => setSelectedAsset(null)} />}
      {selectedAsset?.type === AssetType.BOND && <BondDetailModal bond={selectedAsset} onClose={() => setSelectedAsset(null)} />}
    </>
  );
};

export default StockTable;
