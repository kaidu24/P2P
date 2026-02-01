import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  ShieldCheck, 
  RefreshCw, 
  BrainCircuit, 
  Wallet, 
  ArrowRightLeft,
  Sun,
  Moon,
  X,
  Zap,
  Flame,
  History,
  Trash2,
  Save,
  Check,
  Share2,
  Info,
  Banknote,
  Target,
  LayoutGrid,
  Clock,
  Coins,
  CreditCard
} from 'lucide-react';
import { CalculationResult, MarketInsight, HistoryEntry, P2POffer } from './types';
import { getMarketAnalysis, fetchCurrentRates, fetchTopOffers } from './services/geminiService';

const REFRESH_INTERVALS = [
  { label: 'Выкл', value: 0 },
  { label: '30с', value: 30000 },
  { label: '1м', value: 60000 },
  { label: '3м', value: 180000 },
  { label: '5м', value: 300000 },
];

const EXCHANGES = [
  { id: 'Binance', color: 'text-[#F3BA2F]', bg: 'bg-[#F3BA2F]/10' },
  { id: 'Bybit', color: 'text-[#FFB11A]', bg: 'bg-[#FFB11A]/10' },
  { id: 'OKX', color: 'text-[#000000] dark:text-white', bg: 'bg-slate-200 dark:bg-slate-800' },
  { id: 'MEXC', color: 'text-[#00C3FF]', bg: 'bg-[#00C3FF]/10' },
  { id: 'Huobi', color: 'text-[#1B66FF]', bg: 'bg-[#1B66FF]/10' },
];

const STABLECOINS = ['USDT', 'USDC', 'FDUSD', 'DAI'];
const FIATS = ['KGS', 'RUB', 'USD', 'KZT', 'EUR'];

const App: React.FC = () => {
  const [investment, setInvestment] = useState<number>(100000);
  const [buyRate, setBuyRate] = useState<number>(86.50);
  const [sellRate, setSellRate] = useState<number>(87.20);
  const [fee, setFee] = useState<number>(0.1);
  const [selectedExchange, setSelectedExchange] = useState<string>('Binance');
  const [selectedStablecoin, setSelectedStablecoin] = useState<string>('USDT');
  const [selectedFiat, setSelectedFiat] = useState<string>('KGS');
  
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [insight, setInsight] = useState<MarketInsight | null>(null);
  const [offers, setOffers] = useState<P2POffer[]>([]);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showSpreadTooltip, setShowSpreadTooltip] = useState(false);
  
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem('p2p_refresh_interval');
    return saved !== null ? Number(saved) : 180000;
  });
  
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem('p2p_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  const [activeNotification, setActiveNotification] = useState<{ 
    show: boolean; 
    message: string; 
    type: 'success' | 'info' | 'warning';
  }>({ 
    show: false, 
    message: '', 
    type: 'info'
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('p2p_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('p2p_refresh_interval', refreshInterval.toString());
  }, [refreshInterval]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const updateData = useCallback(async (isSilent = false) => {
    if (isFetchingRates) return;
    if (!isSilent) setIsFetchingRates(true);
    
    try {
      const [rates, topOffers] = await Promise.all([
        fetchCurrentRates(selectedExchange, selectedFiat, selectedStablecoin),
        fetchTopOffers(selectedExchange, selectedFiat, selectedStablecoin)
      ]);
      
      setBuyRate(rates.buy);
      setSellRate(rates.sell);
      setOffers(topOffers);
      setLastUpdated(new Date());
      
      if (!isSilent) {
        setActiveNotification({
          show: true,
          message: `${selectedExchange}: ${selectedStablecoin}/${selectedFiat} обновлено`,
          type: 'success'
        });
        setTimeout(() => setActiveNotification(prev => ({ ...prev, show: false })), 3000);
      }
    } catch (error) {
      console.error("Error updating data:", error);
    } finally {
      if (!isSilent) setIsFetchingRates(false);
    }
  }, [isFetchingRates, selectedExchange, selectedFiat, selectedStablecoin]);

  useEffect(() => {
    updateData(true);
  }, [selectedExchange, selectedStablecoin, selectedFiat]);

  useEffect(() => {
    if (refreshInterval === 0) return;
    const interval = setInterval(() => updateData(true), refreshInterval);
    return () => clearInterval(interval);
  }, [updateData, refreshInterval]);

  const calculate = useCallback(() => {
    const usdtReceived = investment / buyRate;
    const finalKgs = (usdtReceived * sellRate) * (1 - fee / 100);
    const netProfit = finalKgs - investment;
    const roi = (netProfit / investment) * 100;

    setResult({
      investment,
      buyRate,
      sellRate,
      feePercent: fee,
      usdtReceived,
      finalKgs,
      netProfit,
      roi
    });
  }, [investment, buyRate, sellRate, fee]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  const saveToHistory = () => {
    if (!result) return;
    const newEntry: HistoryEntry = {
      ...result,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    setHistory(prev => [newEntry, ...prev].slice(0, 15));
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };

  const deleteFromHistory = (id: string) => {
    setHistory(prev => prev.filter(entry => entry.id !== id));
  };

  const restoreFromHistory = (entry: HistoryEntry) => {
    setInvestment(entry.investment);
    setBuyRate(entry.buyRate);
    setSellRate(entry.sellRate);
    setFee(entry.feePercent);
    setIsHistoryOpen(false);
  };

  const shareCalculation = async () => {
    if (!result) return;
    const shareText = `📊 P2P ${selectedStablecoin}/${selectedFiat} Расчет (${selectedExchange}):
💰 Инвестиции: ${result.investment.toLocaleString()} ${selectedFiat}
📥 Закуп: ${result.buyRate} ${selectedFiat}
📤 Продажа: ${result.sellRate} ${selectedFiat}
🛡️ Комиссия: ${result.feePercent}%
📈 Профит: +${result.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${selectedFiat}
💎 ROI: ${result.roi.toFixed(2)}%`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `P2P Расчет ${selectedStablecoin}/${selectedFiat}`, text: shareText });
      } catch (err) { console.error('Sharing failed', err); }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setActiveNotification({ show: true, message: 'Расчет скопирован!', type: 'success' });
        setTimeout(() => setActiveNotification(prev => ({ ...prev, show: false })), 3000);
      } catch (err) { console.error('Clipboard copy failed', err); }
    }
  };

  const currentSpread = useMemo(() => {
    if (buyRate <= 0) return 0;
    return ((sellRate - buyRate) / buyRate) * 100;
  }, [buyRate, sellRate]);

  const spreadColor = useMemo(() => {
    if (currentSpread <= 0) return 'bg-rose-500';
    if (currentSpread < 0.4) return 'bg-amber-500';
    if (currentSpread < 1.0) return 'bg-emerald-500';
    return 'bg-indigo-500';
  }, [currentSpread]);

  const spreadLabel = useMemo(() => {
    if (currentSpread <= 0) return 'Убыток';
    if (currentSpread < 0.4) return 'Слабый';
    if (currentSpread < 1.0) return 'Хороший';
    return 'Отличный';
  }, [currentSpread]);

  const handleAiAnalysis = async () => {
    setLoadingInsight(true);
    try {
      const data = await getMarketAnalysis(buyRate, sellRate, selectedFiat, selectedStablecoin);
      setInsight(data);
    } catch (error) { console.error(error); } 
    finally { setLoadingInsight(false); }
  };

  const applyOffer = (offer: P2POffer) => {
    setBuyRate(offer.buyRate);
    setSellRate(offer.sellRate);
    setActiveNotification({
      show: true,
      message: `Курсы применены`,
      type: 'info'
    });
    setTimeout(() => setActiveNotification(prev => ({ ...prev, show: false })), 2000);
  };

  return (
    <div className="min-h-screen pb-24 bg-slate-50 dark:bg-slate-950 transition-colors duration-500 relative overflow-x-hidden selection:bg-indigo-100 dark:selection:bg-indigo-900/40 text-slate-900 dark:text-slate-100">
      {/* Notifications */}
      <div className={`fixed top-6 right-6 z-[100] transition-all duration-500 transform ${activeNotification.show ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'}`}>
        <div className="flex items-center gap-4 p-5 rounded-3xl shadow-2xl border backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800">
          <div className={`p-3 rounded-2xl text-white ${activeNotification.type === 'success' ? 'bg-emerald-500' : 'bg-indigo-500'}`}><Zap size={24} /></div>
          <div><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">P2P Pro</h4><p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{activeNotification.message}</p></div>
        </div>
      </div>

      {/* History Sidebar */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-slate-900 shadow-2xl z-[150] transform transition-transform duration-500 border-l border-slate-200 dark:border-slate-800 ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3"><History className="text-indigo-500" /><h2 className="text-xl font-black dark:text-white uppercase tracking-tighter">История</h2></div>
            <button onClick={() => setIsHistoryOpen(false)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {history.length === 0 ? (<p className="text-center py-20 opacity-30 font-black uppercase text-xs">История пуста</p>) : (
              history.map(entry => (
                <div key={entry.id} className="group p-5 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 relative">
                  <div className="flex justify-between items-start mb-3"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <button onClick={() => deleteFromHistory(entry.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button>
                  </div>
                  <div className="flex justify-between items-end">
                    <div><div className="text-lg font-black dark:text-white">{entry.investment.toLocaleString()} {selectedFiat}</div><div className="text-[10px] font-bold text-slate-500 uppercase">{entry.buyRate} → {entry.sellRate}</div></div>
                    <div className="text-right"><div className={`text-lg font-black ${entry.netProfit > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>+{entry.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="text-[10px] font-bold text-emerald-600/70">ROI: {entry.roi.toFixed(2)}%</div></div>
                  </div>
                  <button onClick={() => restoreFromHistory(entry)} className="w-full mt-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Восстановить</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-xl"><RefreshCw className="text-white w-5 h-5" /></div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase">P2P <span className="text-emerald-600">Pro</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
               <Clock size={14} className="ml-2 text-slate-400" />
               <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))} className="bg-transparent text-[10px] font-black uppercase outline-none text-slate-600 dark:text-slate-300 pr-2 cursor-pointer">
                 {REFRESH_INTERVALS.map(opt => (<option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900">{opt.label}</option>))}
               </select>
            </div>
            <button onClick={() => setIsHistoryOpen(true)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 relative">
              <History size={20} />
              {history.length > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-indigo-600 text-[8px] flex items-center justify-center text-white font-black rounded-full border-2 border-white dark:border-slate-900">{history.length}</span>}
            </button>
            <button onClick={() => updateData()} disabled={isFetchingRates} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <RefreshCw size={20} className={isFetchingRates ? 'animate-spin' : ''} />
            </button>
            <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 relative group">
            <div className="flex items-center gap-3 mb-8"><Calculator className="text-emerald-600" size={24} /><h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Параметры</h2></div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Инвестиции ({selectedFiat})</label>
                <input type="number" value={investment || ''} onChange={(e) => setInvestment(Number(e.target.value))} className="w-full px-5 py-4 border rounded-3xl outline-none font-black text-xl bg-slate-50/50 dark:bg-slate-800/50 dark:text-white border-slate-100 dark:border-slate-700 focus:border-emerald-500" />
              </div>
              <div className="relative p-5 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2 group cursor-help" onClick={() => setShowSpreadTooltip(!showSpreadTooltip)}>
                    <Flame className={currentSpread > 0.8 ? 'text-orange-500 fill-orange-500' : 'text-slate-400'} size={14} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Текущий Спред</span>
                    <Info size={12} className="text-slate-400" />
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-black uppercase ${currentSpread > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{spreadLabel}</span>
                    <div className="text-sm font-black dark:text-white">{currentSpread.toFixed(2)}%</div>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                   <div className={`h-full transition-all duration-700 ease-out ${spreadColor}`} style={{ width: `${Math.min(100, Math.max(5, (currentSpread / 2) * 100))}%` }} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Закуп {selectedStablecoin}</span><span className="text-sm font-black text-emerald-600">{buyRate} {selectedFiat}</span></div>
                <input type="range" min={buyRate * 0.8} max={buyRate * 1.2} step="0.01" value={buyRate} onChange={(e) => setBuyRate(Number(e.target.value))} className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none accent-emerald-500" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Продажа {selectedStablecoin}</span><span className="text-sm font-black text-blue-600">{sellRate} {selectedFiat}</span></div>
                <input type="range" min={sellRate * 0.8} max={sellRate * 1.2} step="0.01" value={sellRate} onChange={(e) => setSellRate(Number(e.target.value))} className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none accent-blue-500" />
              </div>
              <div className="grid grid-cols-1 gap-3 pt-2">
                <button onClick={saveToHistory} className={`w-full py-4 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${isSavedRecently ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                  {isSavedRecently ? <Check size={18} /> : <Save size={18} />}{isSavedRecently ? 'Сохранено' : 'Сохранить'}
                </button>
                <button onClick={shareCalculation} className="w-full py-4 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Share2 size={18} />Поделиться
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-2 space-y-8">
          {result && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900 shadow-sm relative overflow-hidden">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Чистая Прибыль</p>
                <h3 className="text-4xl font-black text-emerald-600 tracking-tighter">{result.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} {selectedFiat}</h3>
                <div className="mt-4"><div className="bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full text-xs font-black text-emerald-700 dark:text-emerald-400 inline-block">ROI: {result.roi.toFixed(2)}%</div></div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-blue-100 dark:border-blue-900 shadow-sm relative overflow-hidden">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Получено {selectedStablecoin}</p>
                <h3 className="text-4xl font-black text-blue-600 tracking-tighter">{result.usdtReceived.toFixed(2)} {selectedStablecoin}</h3>
                <div className="mt-4"><div className="bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full text-xs font-black text-blue-700 dark:text-blue-400 inline-block">Закуп {buyRate} {selectedFiat}</div></div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex flex-col gap-8 mb-8">
              <div className="flex items-center gap-3"><LayoutGrid className="text-amber-500" /><h2 className="text-xl font-black dark:text-white uppercase tracking-tight">Рыночные Возможности</h2></div>
              
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[100px] flex items-center gap-2">
                    <CreditCard size={14} className="text-indigo-400" />Биржа:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {EXCHANGES.map(ex => (
                      <button key={ex.id} onClick={() => setSelectedExchange(ex.id)} className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedExchange === ex.id ? `${ex.bg} ${ex.color} ring-2 ring-indigo-500/20` : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-500'}`}>
                        {ex.id}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[100px] flex items-center gap-2">
                    <Coins size={14} className="text-emerald-400" />Стейблкоин:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {STABLECOINS.map(coin => (
                      <button key={coin} onClick={() => setSelectedStablecoin(coin)} className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedStablecoin === coin ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500'}`}>
                        {coin}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[100px] flex items-center gap-2">
                    <Banknote size={14} className="text-blue-400" />Фиат:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {FIATS.map(f => (
                      <button key={f} onClick={() => setSelectedFiat(f)} className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedFiat === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-500'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-50 dark:border-slate-800">
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Банк / Метод</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Закуп</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Продажа</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Спред</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {offers.map((offer, idx) => (
                    <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                      <td className="py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${offer.efficiency === 'Excellent' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}><Banknote size={18} /></div>
                          <div><span className="font-black text-slate-700 dark:text-slate-200 block">{offer.bank}</span></div>
                        </div>
                      </td>
                      <td className="py-5 text-center font-black dark:text-white">{offer.buyRate.toFixed(2)}</td>
                      <td className="py-5 text-center font-black dark:text-white">{offer.sellRate.toFixed(2)}</td>
                      <td className="py-5 text-center"><span className={`text-xs font-black ${offer.spread >= 0.8 ? 'text-emerald-500' : 'text-amber-500'}`}>{offer.spread.toFixed(2)}%</span></td>
                      <td className="py-5 text-right"><button onClick={() => applyOffer(offer)} className="p-3 rounded-2xl bg-indigo-600 text-white opacity-0 group-hover:opacity-100 transition-all"><Target size={16} /></button></td>
                    </tr>
                  ))}
                  {offers.length === 0 && !isFetchingRates && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400 font-bold uppercase text-xs">Нет данных для этой пары</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-12 rounded-[3rem] relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div><h2 className="text-3xl font-black flex items-center gap-4 uppercase tracking-tighter"><BrainCircuit className="text-indigo-400" size={36} />Gemini AI Аналитика</h2><p className="text-slate-400 font-bold mt-2">Анализ пары {selectedStablecoin}/{selectedFiat} на {selectedExchange}</p></div>
              <button onClick={handleAiAnalysis} disabled={loadingInsight} className="bg-white text-slate-950 px-8 py-4 rounded-3xl font-black uppercase tracking-widest hover:bg-indigo-50 flex items-center gap-2">{loadingInsight ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}Анализ</button>
            </div>
            {insight && (
              <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${insight.riskLevel === 'Low' ? 'bg-emerald-500' : 'bg-rose-500'}`}>Риск: {insight.riskLevel}</span>
                  <p className="text-xl font-bold italic text-slate-200 mt-4">"{insight.summary}"</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{insight.tips.map((tip, idx) => (<div key={idx} className="p-6 bg-white/5 rounded-[2rem] border border-white/5"><div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center font-black mb-4">{idx + 1}</div><p className="text-sm font-bold text-slate-300">{tip}</p></div>))}</div>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <footer className="max-w-5xl mx-auto px-4 mt-12 pb-12">
        <div className="bg-slate-200/50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] flex items-center gap-6">
           <ShieldCheck className="text-emerald-500" size={32} />
           <p className="text-xs font-bold text-slate-500 uppercase leading-relaxed">Внимание: P2P арбитраж связан с банковскими рисками. Инструмент предоставляется исключительно в ознакомительных целях.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;