
import { AssetHolding, AccountType, MarketType, AssetType } from './types';

export const INITIAL_HOLDINGS: AssetHolding[] = [
  {
    id: '1',
    type: AssetType.STOCK,
    account: '삼성증권 ISA',
    accountCategory: AccountType.ISA,
    market: MarketType.KOREA,
    symbol: '005930',
    name: '삼성전자',
    quantity: 50,
    avgPurchasePrice: 72000,
    currentPrice: 74500,
    dividendsReceived: 120000,
    dividendYield: 2.1, // 연 2.1%
    purchaseDate: '2024-01-15',
    lastUpdated: new Date().toISOString()
  },
  {
    id: '2',
    type: AssetType.STOCK,
    account: '삼성증권 ISA',
    accountCategory: AccountType.ISA,
    market: MarketType.KOREA,
    symbol: 'TIGER 미국배당다우존스',
    name: 'TIGER 미국배당다우존스',
    quantity: 584,
    avgPurchasePrice: 12945,
    currentPrice: 13350,
    dividendsReceived: 194540,
    dividendYield: 3.8, // 연 3.8%
    purchaseDate: '2023-11-20',
    lastUpdated: new Date().toISOString()
  },
  {
    id: '3',
    type: AssetType.STOCK,
    account: '키움 해외주식',
    accountCategory: AccountType.MAIN_OVERSEAS,
    market: MarketType.USA,
    symbol: 'SCHD',
    name: 'Schwab US Dividend Equity ETF',
    quantity: 216,
    avgPurchasePrice: 72.5,
    currentPrice: 81.24,
    dividendsReceived: 450.25,
    dividendYield: 3.45,
    purchaseDate: '2023-10-05',
    lastUpdated: new Date().toISOString()
  },
  {
    id: '4',
    type: AssetType.STOCK,
    account: '키움 해외주식',
    accountCategory: AccountType.MAIN_OVERSEAS,
    market: MarketType.USA,
    symbol: 'NVDA',
    name: 'NVIDIA Corp',
    quantity: 12,
    avgPurchasePrice: 450.12,
    currentPrice: 875.34,
    dividendsReceived: 12.5,
    dividendYield: 0.02,
    purchaseDate: '2024-02-10',
    lastUpdated: new Date().toISOString()
  },
  {
    id: '5',
    type: AssetType.STOCK,
    account: '미래에셋 연금',
    accountCategory: AccountType.PENSION,
    market: MarketType.KOREA,
    symbol: 'SOL 미국배당다우존스(H)',
    name: 'SOL 미국배당다우존스(H)',
    quantity: 1522,
    avgPurchasePrice: 11241,
    currentPrice: 11300,
    dividendsReceived: 415611,
    dividendYield: 3.2,
    purchaseDate: '2023-12-01',
    lastUpdated: new Date().toISOString()
  },
  {
    id: '6',
    type: AssetType.BOND,
    account: '미래에셋 연금',
    accountCategory: AccountType.PENSION,
    market: MarketType.KOREA,
    symbol: 'KR103502G997',
    name: '국고채권 03500-2909(24-6)',
    quantity: 5000,
    avgPurchasePrice: 10250,
    currentPrice: 10310,
    dividendsReceived: 0,
    purchaseDate: '2024-06-15',
    lastUpdated: new Date().toISOString(),
    bondConfig: {
      purchaseDate: '2024-06-15',
      maturityDate: '2029-09-15',
      couponRate: 3.5,
      faceValue: 10000,
      interestCycle: 3
    }
  },
  {
    id: '7',
    type: AssetType.BOND,
    account: '키움 해외주식',
    accountCategory: AccountType.MAIN_OVERSEAS,
    market: MarketType.USA,
    symbol: 'US-T-10Y',
    name: 'US Treasury 10Y Note',
    quantity: 100,
    avgPurchasePrice: 98.5,
    currentPrice: 99.12,
    dividendsReceived: 0,
    purchaseDate: '2024-01-10',
    lastUpdated: new Date().toISOString(),
    bondConfig: {
      purchaseDate: '2024-01-10',
      maturityDate: '2034-02-15',
      couponRate: 4.125,
      faceValue: 100,
      interestCycle: 6
    }
  }
];
