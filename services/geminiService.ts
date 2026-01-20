
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
 */
async function fetchYahooPrice(symbol: string, market: MarketType): Promise<PriceUpdateResult | null> {
  const isKoreanNumeric = /^\d{6}$/.test(symbol);
  
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
          symbol: targetSymbol, 
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
 * 종목 검색 및 실시간 가격 추출
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
      contents: `Find official stock symbols/names for: "${query}".`,
      config: {
        systemInstruction: "Return a JSON array of up to 5 objects. Fields: 'symbol' (6 digits for KR), 'name', 'market' ('KOREA' or 'USA'), 'dividendYield' (number). No prices.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              name: { type: Type.STRING },
              market: { type: Type.STRING },
              dividendYield: { type: Type.NUMBER }
            },
            required: ['symbol', 'name', 'market', 'dividendYield']
          }
        }
      }
    });

    const initialResults = JSON.parse(response.text || "[]");
    const finalResults: StockSearchResult[] = [];
    
    const pricePromises = initialResults.map(async (stock: any) => {
      const market = stock.market === 'USA' ? MarketType.USA : MarketType.KOREA;
      const realData = await fetchYahooPrice(stock.symbol, market);
      
      if (realData) {
        finalResults.push({
          symbol: realData.symbol,
          name: stock.name,
          market: market,
          currentPriceEstimate: realData.regularMarketPrice,
          dividendYield: stock.dividendYield || 0
        });
      }
    });

    await Promise.all(pricePromises);
    return finalResults;
  } catch (error) {
    console.error("Stock Search Error:", error);
    return [];
  }
};

export const getPortfolioAdvice = async (holdings: AssetHolding[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const portfolioText = holdings.map(h => 
    `${h.name}(${h.symbol}): ${h.quantity}주, 평단가 ${h.avgPurchasePrice}, 현재가 ${h.currentPrice}`
  ).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `다음 포트폴리오를 분석하고 조언을 한글로 작성해줘:\n${portfolioText}`,
      config: {
        systemInstruction: "금융 전문가로서 마크다운 형식으로 답변하십시오.",
      }
    });
    return response.text;
  } catch (error) {
    return "AI 분석을 가져오는 중 오류가 발생했습니다.";
  }
};

export const lookupBondInfo = async (symbol: string) => {
  if (!symbol || symbol.length < 3) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Bond ISIN/Code: "${symbol}"`,
      config: {
        systemInstruction: "Extract bond info as JSON: name, couponRate, maturityDate, faceValue.",
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text || "null");
  } catch (error) {
    return null;
  }
};
