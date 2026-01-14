
import { AssetHolding, AssetType, MarketType, AccountType } from './types';

// 작업 단계 테스트를 위한 더미 데이터 구성 (계좌 2개, 각 주식 2개/채권 2개)
export const INITIAL_HOLDINGS: AssetHolding[] = [
  // 계좌 1: 미래에셋 국내계좌 (국내 주식/채권)
  {
    id: 'dummy-stock-1',
    type: AssetType.STOCK,
    account: '미래에셋 국내계좌',
    accountCategory: AccountType.MAIN_DOMESTIC,
    market: MarketType.KOREA,
    symbol: '005930',
    name: '삼성전자',
    quantity: 100,
    avgPurchasePrice: 72000,
    currentPrice: 78500,
    dividendsReceived: 150000,
    dividendYield: 2.1,
    purchaseDate: '2023-01-15',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'dummy-stock-2',
    type: AssetType.STOCK,
    account: '미래에셋 국내계좌',
    accountCategory: AccountType.MAIN_DOMESTIC,
    market: MarketType.KOREA,
    symbol: '000660',
    name: 'SK하이닉스',
    quantity: 50,
    avgPurchasePrice: 145000,
    currentPrice: 182000,
    dividendsReceived: 80000,
    dividendYield: 1.2,
    purchaseDate: '2023-06-20',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'dummy-bond-1',
    type: AssetType.BOND,
    account: '미래에셋 국내계좌',
    accountCategory: AccountType.MAIN_DOMESTIC,
    market: MarketType.KOREA,
    symbol: 'KR103502G997',
    name: '국고채03250-2503(22-1)',
    quantity: 1000,
    avgPurchasePrice: 9850,
    currentPrice: 9920,
    dividendsReceived: 0,
    purchaseDate: '2023-10-05',
    lastUpdated: new Date().toISOString(),
    bondConfig: {
      purchaseDate: '2023-10-05',
      maturityDate: '2025-03-10',
      couponRate: 3.25,
      faceValue: 10000,
      interestCycle: 3
    }
  },
  {
    id: 'dummy-bond-2',
    type: AssetType.BOND,
    account: '미래에셋 국내계좌',
    accountCategory: AccountType.MAIN_DOMESTIC,
    market: MarketType.KOREA,
    symbol: 'KR103502G333',
    name: '국고채03125-2712(22-12)',
    quantity: 500,
    avgPurchasePrice: 9600,
    currentPrice: 9750,
    dividendsReceived: 0,
    purchaseDate: '2024-01-10',
    lastUpdated: new Date().toISOString(),
    bondConfig: {
      purchaseDate: '2024-01-10',
      maturityDate: '2027-12-10',
      couponRate: 3.125,
      faceValue: 10000,
      interestCycle: 3
    }
  },

  // 계좌 2: 키움 해외계좌 (미국 주식/채권)
  {
    id: 'dummy-stock-3',
    type: AssetType.STOCK,
    account: '키움 해외계좌',
    accountCategory: AccountType.MAIN_OVERSEAS,
    market: MarketType.USA,
    symbol: 'AAPL',
    name: 'Apple Inc',
    quantity: 20,
    avgPurchasePrice: 175.5,
    currentPrice: 192.3,
    dividendsReceived: 45.5,
    dividendYield: 0.52,
    purchaseDate: '2023-03-12',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'dummy-stock-4',
    type: AssetType.STOCK,
    account: '키움 해외계좌',
    accountCategory: AccountType.MAIN_OVERSEAS,
    market: MarketType.USA,
    symbol: 'MSFT',
    name: 'Microsoft Corp',
    quantity: 15,
    avgPurchasePrice: 310.2,
    currentPrice: 420.5,
    dividendsReceived: 32.0,
    dividendYield: 0.71,
    purchaseDate: '2023-05-15',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'dummy-bond-3',
    type: AssetType.BOND,
    account: '키움 해외계좌',
    accountCategory: AccountType.MAIN_OVERSEAS,
    market: MarketType.USA,
    symbol: 'TLT',
    name: 'iShares 20+ Year Treasury Bond ETF',
    quantity: 50,
    avgPurchasePrice: 92.5,
    currentPrice: 94.8,
    dividendsReceived: 12.5,
    purchaseDate: '2023-11-20',
    lastUpdated: new Date().toISOString(),
    bondConfig: {
      purchaseDate: '2023-11-20',
      maturityDate: '2043-12-31',
      couponRate: 4.25,
      faceValue: 100,
      interestCycle: 1
    }
  },
  {
    id: 'dummy-bond-4',
    type: AssetType.BOND,
    account: '키움 해외계좌',
    accountCategory: AccountType.MAIN_OVERSEAS,
    market: MarketType.USA,
    symbol: 'US2Y',
    name: 'US Treasury 2 Year Note',
    quantity: 100,
    avgPurchasePrice: 99.2,
    currentPrice: 99.8,
    dividendsReceived: 0,
    purchaseDate: '2024-02-01',
    lastUpdated: new Date().toISOString(),
    bondConfig: {
      purchaseDate: '2024-02-01',
      maturityDate: '2026-02-01',
      couponRate: 4.875,
      faceValue: 100,
      interestCycle: 6
    }
  }
];
