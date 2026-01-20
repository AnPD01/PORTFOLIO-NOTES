
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

export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL'
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  quantity: number;
  price: number;
}

export interface AssetHolding {
  id: string;
  type: AssetType;
  account: string; 
  accountCategory: AccountType;
  market: MarketType;
  symbol: string;
  name: string;
  
  // 데이터 원천: 모든 수량과 평단가는 이 배열에서 계산됩니다.
  transactions: Transaction[];

  // 하단 필드들은 하위 호환성 및 계산 편의를 위해 유지하되, UI 렌더링 시에는 계산된 값을 우선합니다.
  quantity: number; 
  avgPurchasePrice: number;
  currentPrice: number;
  
  dividendsReceived: number; 
  dividendYield?: number;    
  purchaseDate: string;      
  lastUpdated: string;
  
  bondConfig?: {
    purchaseDate: string;
    maturityDate: string;
    couponRate: number; 
    faceValue: number;  
    interestCycle: number; 
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
