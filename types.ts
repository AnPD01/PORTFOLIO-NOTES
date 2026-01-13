
export enum MarketType {
  KOREA = 'KOREA',
  USA = 'USA'
}

export enum AssetType {
  STOCK = 'STOCK',
  BOND = 'BOND'
}

export enum AccountType {
  MAIN_OVERSEAS = '주계좌(해외)',
  MAIN_DOMESTIC = '주계좌(국내)',
  ISA = 'ISA',
  PENSION = '연금저축',
  IRP = 'IRP',
  OTHER = '기타'
}

export interface AssetHolding {
  id: string;
  type: AssetType;
  account: string; 
  accountCategory: AccountType;
  market: MarketType;
  symbol: string;
  name: string;
  quantity: number;
  avgPurchasePrice: number;
  currentPrice: number;
  dividendsReceived: number; // 수동 입력/기수령 배당금
  dividendYield?: number;    // 자동 계산용 연 배당수익률 (%)
  purchaseDate: string;      // 수익 계산 기준일 (YYYY-MM-DD)
  lastUpdated: string;
  
  // 채권 전용 설정
  bondConfig?: {
    purchaseDate: string;
    maturityDate: string;
    couponRate: number; // 표면 금리 (%)
    faceValue: number;  // 액면가
    interestCycle: number; // 이자 지급 주기 (개월)
  };
}

export type StockHolding = AssetHolding;

export interface CashBalance {
  krw: number;
  usd: number;
}

export interface PortfolioSummary {
  totalPurchaseAmount: number;
  totalEvaluationAmount: number;
  totalUnrealizedProfit: number;
  totalRealizedProfit: number;
  totalDividends: number;
  totalReturnAmount: number;
  totalReturnRate: number;
  totalCash: number;
}
