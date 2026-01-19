
import { GoogleGenAI, Type } from "@google/genai";
import { AssetHolding, MarketType } from "../types";

export interface PriceUpdateResult {
  symbol: string;
  price: number;
  currency: string;
  regularMarketPrice: number;
  previousClose: number;
}

const CORS_PROXY = "https://corsproxy.io/?";

/**
 * Yahoo Finance API를 통해 개별 종목의 가격 정보를 가져옵니다.
 * 한국 주식의 경우 .KS(코스피) 시도 후 실패 시 .KQ(코스닥)로 재시도하는 로직을 포함합니다.
 */
async function fetchYahooPrice(symbol: string, market: MarketType): Promise<PriceUpdateResult | null> {
  const isKoreanNumeric = /^\d{6}$/.test(symbol);
  
  // 시도할 심볼 목록 생성
  let symbolsToTry: string[] = [symbol];
  if (isKoreanNumeric) {
    symbolsToTry = [`${symbol}.KS`, `${symbol}.KQ`];
  } else if (market === MarketType.KOREA && !symbol.includes('.')) {
    symbolsToTry = [`${symbol}.KS`, `${symbol}.KQ`];
  }

  for (const targetSymbol of symbolsToTry) {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${targetSymbol}?interval=1d&range=1d`;
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(yahooUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) continue;

      const data = await response.json();
      const meta = data?.chart?.result?.[0]?.meta;

      if (meta && meta.regularMarketPrice) {
        return {
          symbol: symbol, // 원본 심볼 반환
          price: meta.regularMarketPrice,
          currency: meta.currency,
          regularMarketPrice: meta.regularMarketPrice,
          previousClose: meta.chartPreviousClose || meta.regularMarketPrice
        };
      }
    } catch (error) {
      console.warn(`Yahoo Fetch Error for ${targetSymbol}:`, error);
    }
  }

  return null;
}

/**
 * 포트폴리오의 모든 종목 시세를 Yahoo Finance API로 일괄 업데이트합니다.
 */
export const updatePortfolioPrices = async (holdings: AssetHolding[]) => {
  if (holdings.length === 0) return { prices: [], sources: [] };
  
  const results: PriceUpdateResult[] = [];
  
  // 병렬 처리를 통해 속도 향상
  const fetchPromises = holdings.map(async (h) => {
    const data = await fetchYahooPrice(h.symbol, h.market);
    if (data) {
      results.push(data);
    }
  });

  await Promise.all(fetchPromises);
  
  return { 
    prices: results, 
    sources: [{ 
      web: { 
        uri: "https://finance.yahoo.com", 
        title: "Yahoo Finance (Official Market Data)" 
      } 
    }] 
  };
};

/**
 * 포트폴리오 분석 및 투자 조언 (Gemini Pro 사용)
 */
export const getPortfolioAdvice = async (holdings: AssetHolding[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const portfolioText = holdings.map(h => 
    `${h.name}(${h.symbol}): ${h.quantity}주, 평단가 ${h.avgPurchasePrice}, 현재가 ${h.currentPrice}, 누적배당 ${h.dividendsReceived}`
  ).join('\n');

  const prompt = `
    다음은 나의 주식 및 채권 포트폴리오 현황이야. 
    이 포트폴리오를 분석해서 투자 조언을 해줘. 
    특히 배당 수익과 채권 이자, 그리고 전체적인 자산 배분(국내/해외/계좌종류) 관점에서 분석해줘.
    
    포트폴리오:
    ${portfolioText}

    한국어로 답변해줘. 마크다운 형식을 사용해.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "당신은 주식 및 채권 자산 배분을 전문으로 하는 금융 전문가입니다. 사용자의 투자 현황을 분석하고 전략적인 조언을 제공합니다.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI 분석을 가져오는 중 오류가 발생했습니다.";
  }
};

/**
 * 채권 상세 정보 조회
 */
export interface BondInfoResult {
  name: string;
  couponRate: number;
  maturityDate: string;
  faceValue: number;
}

export const lookupBondInfo = async (symbol: string): Promise<BondInfoResult | null> => {
  if (!symbol || symbol.length < 3) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for the detailed specifications of the bond with code/ISIN: "${symbol}".`,
      config: {
        systemInstruction: "You are a professional financial data extractor. Given a bond ISIN or code, return its EXACT details in JSON. 'name' is the full Korean name, 'couponRate' is numeric percentage, 'maturityDate' is YYYY-MM-DD, and 'faceValue' is par value.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            couponRate: { type: Type.NUMBER },
            maturityDate: { type: Type.STRING },
            faceValue: { type: Type.NUMBER }
          },
          required: ['name', 'couponRate', 'maturityDate', 'faceValue']
        }
      }
    });
    return JSON.parse(response.text || "null");
  } catch (error) {
    console.error("Bond Lookup Error:", error);
    return null;
  }
};

/**
 * 종목 검색 및 배당 정보 추출
 */
export interface StockSearchResult {
  symbol: string;
  name: string;
  market: MarketType;
  currentPriceEstimate: number;
  dividendYield: number; 
}

export const searchStocks = async (query: string): Promise<StockSearchResult[]> => {
  if (!query || query.length < 2) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for stocks or ETFs matching: "${query}".`,
      config: {
        systemInstruction: "Return a JSON array of up to 5 stock matches. Symbol for KR should be 6 digits. Market must be 'KOREA' or 'USA'. Include 'dividendYield' in percentage.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              name: { type: Type.STRING },
              market: { type: Type.STRING },
              currentPriceEstimate: { type: Type.NUMBER },
              dividendYield: { type: Type.NUMBER }
            },
            required: ['symbol', 'name', 'market', 'currentPriceEstimate', 'dividendYield']
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Stock Search Error:", error);
    return [];
  }
};
