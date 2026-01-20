
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
 * 하이브리드 종목 검색 (Gemini 한국어 이름 + Yahoo 실시간 가격)
 */
export interface StockSearchResult {
  symbol: string;
  name: string;
  market: MarketType;
  currentPriceEstimate: number; 
  dividendYield: number; 
}

export const searchStocks = async (query: string): Promise<StockSearchResult[]> => {
  if (!query || query.length < 1) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    // 1단계: Gemini에게 한국어 종목명과 티커를 찾아달라고 요청 (검색 엔진)
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find official stock symbols and Korean names for the query: "${query}".`,
      config: {
        systemInstruction: "You are a professional stock market data provider. Return a JSON array of up to 5 results. Each object MUST contain: 'symbol' (ticker, use 6 digits for Korea), 'name' (MUST BE OFFICIAL KOREAN NAME, e.g. '삼성전자' or '애플'), 'market' ('KOREA' or 'USA'), and 'dividendYield' (number, use 0 if unknown).",
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
    
    // 2단계: 각 티커에 대해 야후 파이낸스에서 실시간 가격을 가져옴 (병렬 실행)
    const pricePromises = initialResults.map(async (stock: any) => {
      const market = stock.market === 'USA' ? MarketType.USA : MarketType.KOREA;
      const realData = await fetchYahooPrice(stock.symbol, market);
      
      if (realData) {
        finalResults.push({
          symbol: realData.symbol,
          name: stock.name, // Gemini가 찾아준 한국어 이름 사용
          market: market,
          currentPriceEstimate: realData.regularMarketPrice,
          dividendYield: stock.dividendYield || 0
        });
      } else {
        // 야후에서 가격을 못 가져와도 결과는 추가 (단가 0으로라도)
        finalResults.push({
          symbol: stock.symbol,
          name: stock.name,
          market: market,
          currentPriceEstimate: 0,
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
      contents: `다음 포트폴리오를 분석하고 조언을 한국어로 작성해줘:\n${portfolioText}`,
      config: {
        systemInstruction: "당신은 한국 시장과 미국 시장을 잘 아는 금융 전문가입니다. 마크다운 형식으로 답변하십시오.",
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
        systemInstruction: "Extract bond info as JSON: name (Korean), couponRate, maturityDate, faceValue.",
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text || "null");
  } catch (error) {
    return null;
  }
};
