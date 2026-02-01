export interface CalculationResult {
  investment: number;
  buyRate: number;
  sellRate: number;
  feePercent: number;
  usdtReceived: number;
  finalKgs: number;
  netProfit: number;
  roi: number;
}

export interface MarketInsight {
  summary: string;
  tips: string[];
  riskLevel: 'Low' | 'Medium' | 'High';
}

export interface HistoryEntry extends CalculationResult {
  id: string;
  timestamp: number;
}

export interface P2POffer {
  bank: string;
  buyRate: number;
  sellRate: number;
  spread: number;
  efficiency: 'Excellent' | 'Good' | 'Fair';
}