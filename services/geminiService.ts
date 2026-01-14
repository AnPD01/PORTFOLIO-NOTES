
import { GoogleGenAI, Type } from "@google/genai";
import { AssetHolding, MarketType } from "../types";

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
      contents: `Search for the detailed specifications of the bond with code/ISIN: "${symbol}". You must find the 'Coupon Rate' (annual interest rate) accurately.`,
      config: {
        systemInstruction: "You are a professional financial data extractor. Given a bond ISIN or code, return its EXACT details in JSON. 'name' is the full Korean name, 'couponRate' is the annual interest rate as a numeric percentage (e.g., 4.25), 'maturityDate' is YYYY-MM-DD, and 'faceValue' is the par value (default 10000).",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            couponRate: { type: Type.NUMBER },
            maturityDate: { type: Type.STRING },
            faceValue: { type: Type.NUMBER }
          },
          propertyOrdering: ['name', 'couponRate', 'maturityDate', 'faceValue']
        }
      }
    });
    return JSON.parse(response.text || "null");
  } catch (error) {
    console.error("Bond Lookup Error:", error);
    return null;
  }
};

export interface StockSearchResult {
  symbol: string;
  name: string;
  market: MarketType;
  currentPriceEstimate: number;
  dividendYield: number; // 전년도 배당수익률 추가
}

export const searchStocks = async (query: string): Promise<StockSearchResult[]> => {
  if (!query || query.length < 2) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for stocks or ETFs matching the query: "${query}". Return at most 5 best matches. For each stock, you MUST find the actual official dividend yield of the previous year.`,
      config: {
        systemInstruction: "You are a stock search assistant. Return a JSON array of objects. Each object has: 'symbol', 'name', 'market' (must be 'KOREA' or 'USA'), 'currentPriceEstimate' (number, in local currency), and 'dividendYield' (number, the annual dividend yield of the previous year in percentage, e.g., 2.5). If it's a Korean stock, provide the 6-digit code as symbol. If US, provide the ticker.",
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
            propertyOrdering: ['symbol', 'name', 'market', 'currentPriceEstimate', 'dividendYield']
          }
        }
      }
    });

    const results = JSON.parse(response.text || "[]");
    return results;
  } catch (error) {
    console.error("Stock Search Error:", error);
    return [];
  }
};
