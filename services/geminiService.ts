// ... 기존 import 문 ...

// (Bond Lookup 함수 부분)
export const lookupBondInfo = async (bondName: string) => {
  // ... (앞부분 생략) ...
  try {
     // [수정됨] process.env -> import.meta.env.VITE_API_KEY 로 변경
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY }); 

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide detailed information about the bond: "${bondName}". Include issuer, credit rating (Korean local rating if available), coupon rate, maturity date.`,
      config: {
        systemInstruction: "You are a bond market expert. Return a JSON object with keys: 'name', 'couponRate' (number), 'maturityDate' (YYYY-MM-DD), 'faceValue' (number).",
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

export interface StockSearchResult {
  symbol: string;
  name: string;
  market: MarketType;
  currentPriceEstimate: number;
}

export const searchStocks = async (query: string): Promise<StockSearchResult[]> => {
  if (!query || query.length < 2) return [];
  
  // [수정됨] process.env -> import.meta.env.VITE_API_KEY 로 변경
  // 기존 주석("Use process.env...")은 무시하세요. Vite에서는 작동하지 않습니다.
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for stocks or ETFs matching the query: "${query}". Return at most 5 best matches. Include Korean stocks and US stocks.`,
      config: {
        systemInstruction: "You are a stock search assistant. Return a JSON array of objects. Each object has: 'symbol', 'name', 'market' (must be 'KOREA' or 'USA'), 'currentPriceEstimate' (number, in local currency). If it's a Korean stock, provide the 6-digit code as symbol. If US, provide the ticker.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              name: { type: Type.STRING },
              market: { type: Type.STRING, enum: ['KOREA', 'USA'] },
              currentPriceEstimate: { type: Type.NUMBER }
            },
            required: ['symbol', 'name', 'market', 'currentPriceEstimate']
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
