
import { Transaction, TransactionType, AssetHolding } from '../types';

/**
 * 특정 종목의 모든 거래 내역을 분석하여 현재 상태를 반환합니다. (이동평균법 적용)
 */
export const calculateHoldingStatus = (transactions: Transaction[]) => {
  // 날짜순 정렬
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let currentQuantity = 0;
  let avgPrice = 0;
  let totalCostBasis = 0;
  let realizedProfit = 0;

  sorted.forEach(t => {
    if (t.type === TransactionType.BUY) {
      const newCost = t.quantity * t.price;
      const prevTotalCost = currentQuantity * avgPrice;
      
      currentQuantity += t.quantity;
      // 새로운 평단가 계산: (기존총액 + 신규총액) / 전체수량
      avgPrice = currentQuantity > 0 ? (prevTotalCost + newCost) / currentQuantity : 0;
    } else {
      // 매도 시
      const profit = (t.price - avgPrice) * t.quantity;
      realizedProfit += profit;
      currentQuantity -= t.quantity;
      // 매도 후에도 평단가는 유지됨 (수량만 줄어듦)
      if (currentQuantity <= 0) {
        currentQuantity = 0;
        avgPrice = 0;
      }
    }
  });

  return {
    quantity: currentQuantity,
    avgPrice: avgPrice,
    realizedProfit: realizedProfit
  };
};

/**
 * 특정 시점 기준의 보유 수량을 계산합니다. (배당금 계산용)
 */
export const getQuantityAtDate = (transactions: Transaction[], targetDate: string) => {
  const targetTime = new Date(targetDate).getTime();
  return transactions
    .filter(t => new Date(t.date).getTime() <= targetTime)
    .reduce((acc, t) => {
      return t.type === TransactionType.BUY ? acc + t.quantity : acc - t.quantity;
    }, 0);
};
