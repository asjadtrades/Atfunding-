import React, { useState, useEffect } from 'react';
import { 
  User, Account, Order, Trade, MarketQuote, Candle, Coupon, AccountLog, KycStatus, OrderType, TradeDirection, ChallengeConfig, PayoutRequest, RuleViolation 
} from './types';
import { CHALLENGES, COUPONS, INITIAL_QUOTES, ASSET_PROPERTIES } from './data';
import AuthScreen from './components/AuthScreen';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import TradingTerminal from './components/TradingTerminal';
import { ShieldAlert, Award, FileText, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';

// Help generate beautiful historical candles for all assets
function generateHistoricalCandles(symbol: string, basePrice: number, count: number = 60): Candle[] {
  const list: Candle[] = [];
  let currentPrice = basePrice;
  const now = Math.floor(Date.now() / 1000);
  const timeStep = 10; // 10 second steps
  
  for (let i = count; i > 0; i--) {
    const drift = (Math.random() - 0.495) * (basePrice * 0.0006);
    const open = currentPrice;
    const close = currentPrice + drift;
    const high = Math.max(open, close) + Math.random() * (basePrice * 0.0003);
    const low = Math.min(open, close) - Math.random() * (basePrice * 0.0003);
    
    list.push({
      time: now - i * timeStep,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 300) + 50
    });
    currentPrice = close;
  }
  return list;
}

export default function App() {
  // Current user state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('at_current_user');
    return stored ? JSON.parse(stored) : null;
  });

  // Active view and pending challenge states
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard'>(() => {
    const stored = localStorage.getItem('at_current_view');
    return (stored as 'landing' | 'dashboard') || 'landing';
  });
  const [pendingChallenge, setPendingChallenge] = useState<ChallengeConfig | null>(null);
  const [dashboardTab, setDashboardTab] = useState<'accounts' | 'leaderboard' | 'kyc' | 'certificates' | 'logs' | 'referrals'>('accounts');

  useEffect(() => {
    localStorage.setItem('at_current_view', currentView);
  }, [currentView]);

  // Database lists synchronizing with backend
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accountLogs, setAccountLogs] = useState<AccountLog[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>(COUPONS);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [quotes, setQuotes] = useState<MarketQuote[]>(INITIAL_QUOTES);
  const [ruleViolations, setRuleViolations] = useState<RuleViolation[]>([]);
  const [liveDataUnavailable, setLiveDataUnavailable] = useState(false);

  // Candles history for active chart rendering
  const [candles, setCandles] = useState<Record<string, Candle[]>>(() => {
    const initial: Record<string, Candle[]> = {};
    INITIAL_QUOTES.forEach(q => {
      initial[q.symbol] = generateHistoricalCandles(q.symbol, q.price, 60);
    });
    return initial;
  });

  // UI state
  const [showAuth, setShowAuth] = useState(false);
  const [activeTerminalAccount, setActiveTerminalAccount] = useState<Account | null>(null);
  const [breachedAccountNotification, setBreachedAccountNotification] = useState<{ id: string; reason: string; message: string } | null>(null);
  const [warningAccountNotification, setWarningAccountNotification] = useState<{ id: string; reason: string; message: string } | null>(null);

  // Persistence triggers for current user session
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('at_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('at_current_user');
    }
  }, [currentUser]);

  // Track referral parameters from url query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('atfunding_referred_by', ref);
      console.log('Referral tracked from URL parameter:', ref);
    }
  }, []);

  // REAL TIME FULL-STACK STATE POLL TIMER
  useEffect(() => {
    const fetchBackendState = async () => {
      try {
        const activeSym = localStorage.getItem('active_trading_symbol') || 'EUR/USD';
        const res = await fetch(`/api/state?activeSymbol=${encodeURIComponent(activeSym)}`);
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            setUsers(data.users);
            setAccounts(data.accounts);
            setOrders(data.orders);
            setTrades(data.trades);
            setAccountLogs(data.accountLogs);
            setPayoutRequests(data.payoutRequests);
            setQuotes(data.quotes);
            setRuleViolations(data.ruleViolations || []);
            setLiveDataUnavailable(data.liveDataUnavailable || false);
            if (data.coupons) {
              setCoupons(data.coupons);
            }

            // Update current logged-in user details if modified on server (e.g. KYC approved)
            if (currentUser) {
              const serverUser = data.users.find((u: any) => u.id === currentUser.id);
              if (serverUser && JSON.stringify(serverUser) !== JSON.stringify(currentUser)) {
                setCurrentUser(serverUser);
              }
            }

            // Continuously track active terminal account
            if (activeTerminalAccount) {
              const freshAccount = data.accounts.find((a: any) => a.id === activeTerminalAccount.id);
              if (freshAccount) {
                // Trigger active breach popups in real time
                if (freshAccount.status === 'breached' && activeTerminalAccount.status !== 'breached') {
                  setBreachedAccountNotification({
                    id: freshAccount.id,
                    reason: freshAccount.breachedReason || 'Evaluation suspended',
                    message: 'Your account was suspended due to a risk violation detected on the live trading engine.'
                  });
                  setActiveTerminalAccount(null);
                } else {
                  setActiveTerminalAccount(freshAccount);
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('Error fetching backend state:', e);
      }
    };

    fetchBackendState();
    const interval = setInterval(fetchBackendState, 300);
    return () => clearInterval(interval);
  }, [activeTerminalAccount, currentUser]);

  // Real-time chart candle updates synced with ticks
  useEffect(() => {
    if (quotes.length === 0) return;
    setCandles(prev => {
      const updated = { ...prev };
      quotes.forEach(q => {
        const history = updated[q.symbol] || [];
        if (history.length === 0) {
          updated[q.symbol] = generateHistoricalCandles(q.symbol, q.price, 60);
          return;
        }
        const lastCandle = { ...history[history.length - 1] };
        const now = Math.floor(Date.now() / 1000);

        if (now - lastCandle.time >= 10) {
          updated[q.symbol] = [
            ...history.slice(-59),
            {
              time: now,
              open: q.price,
              high: q.price,
              low: q.price,
              close: q.price,
              volume: Math.floor(Math.random() * 50) + 1
            }
          ];
        } else {
          lastCandle.close = q.price;
          lastCandle.high = Math.max(lastCandle.high, q.price);
          lastCandle.low = Math.min(lastCandle.low, q.price);
          lastCandle.volume += 1;
          const newList = [...history];
          newList[newList.length - 1] = lastCandle;
          updated[q.symbol] = newList;
        }
      });
      return updated;
    });
  }, [quotes]);



  // REDUNDANT LOCALSTORAGE PERSISTENCE HOOKS REMOVED FOR AUTHORITATIVE DATABASE LOGIC

  // LIVE MARKET TICKING SIMULATION & RISK ENGINE DISABLED FOR REAL TRADING ENGINE
  useEffect(() => {
    // Real-time server authoritative updates are polled.
  }, []);

  /* OBSOLETE SIMULATOR BLOCK COMMENTED OUT:
  if (!quote) return trade;

          const props = ASSET_PROPERTIES[trade.asset];
          const multiplier = props?.lotSizeMultiplier || 1;

          // A: Handle pending limit/stop fills
          if (trade.orderType !== 'market' && trade.triggerPrice !== undefined) {
            const currentPrice = quote.price;
            const trigger = trade.triggerPrice;
            let fill = false;

            if (trade.orderType === 'limit') {
              if (trade.direction === 'buy' && currentPrice <= trigger) fill = true;
              if (trade.direction === 'sell' && currentPrice >= trigger) fill = true;
            } else if (trade.orderType === 'stop') {
              if (trade.direction === 'buy' && currentPrice >= trigger) fill = true;
              if (trade.direction === 'sell' && currentPrice <= trigger) fill = true;
            }

            if (fill) {
              tradeChanged = true;
              // Log fill event
              setAccountLogs(prevLogs => [
                {
                  id: `log-${Date.now()}`,
                  accountId: trade.accountId,
                  message: `Pending ${trade.orderType.toUpperCase()} order filled at ${trigger}. Symbol: ${trade.asset}, Lot: ${trade.lotSize}`,
                  type: 'success',
                  timestamp: new Date().toISOString()
                },
                ...prevLogs
              ]);

              return {
                ...trade,
                orderType: 'market',
                entryPrice: trigger,
                currentPrice: currentPrice,
                profitLoss: 0
              };
            }
            return trade;
          }

          // B: Track live open positions profit/loss
          const currentPrice = quote.price;
          const delta = trade.direction === 'buy' 
            ? currentPrice - trade.entryPrice 
            : trade.entryPrice - currentPrice;

          const profitLoss = delta * trade.lotSize * multiplier;

          // C: Check SL/TP triggers
          let shouldClose = false;
          let closeReason = 'manual';
          let exitPrice = currentPrice;

          if (trade.stopLoss !== undefined) {
            if (trade.direction === 'buy' && currentPrice <= trade.stopLoss) {
              shouldClose = true;
              closeReason = 'sl';
              exitPrice = trade.stopLoss;
            } else if (trade.direction === 'sell' && currentPrice >= trade.stopLoss) {
              shouldClose = true;
              closeReason = 'sl';
              exitPrice = trade.stopLoss;
            }
          }

          if (trade.takeProfit !== undefined) {
            if (trade.direction === 'buy' && currentPrice >= trade.takeProfit) {
              shouldClose = true;
              closeReason = 'tp';
              exitPrice = trade.takeProfit;
            } else if (trade.direction === 'sell' && currentPrice <= trade.takeProfit) {
              shouldClose = true;
              closeReason = 'tp';
              exitPrice = trade.takeProfit;
            }
          }

          if (shouldClose) {
            tradeChanged = true;
            const finalProfitLoss = (trade.direction === 'buy' ? exitPrice - trade.entryPrice : trade.entryPrice - exitPrice) * trade.lotSize * multiplier;

            // Log triggers
            setAccountLogs(prevLogs => [
              {
                id: `log-${Date.now()}`,
                accountId: trade.accountId,
                message: `Position closed by ${closeReason.toUpperCase()} at ${exitPrice}. Net profit/loss: $${finalProfitLoss.toFixed(2)}`,
                type: finalProfitLoss >= 0 ? 'success' : 'warning',
                timestamp: new Date().toISOString()
              },
              ...prevLogs
            ]);

            // Adjust account balances
            setAccounts(prevAccs => prevAccs.map(acc => {
              if (acc.id === trade.accountId) {
                return {
                  ...acc,
                  balance: Math.round((acc.balance + finalProfitLoss) * 100) / 100
                };
              }
              return acc;
            }));

            return {
              ...trade,
              currentPrice: exitPrice,
              exitPrice,
              profitLoss: finalProfitLoss,
              status: 'closed',
              reason: closeReason,
              closedAt: new Date().toISOString()
            };
          }

          if (profitLoss !== trade.profitLoss || currentPrice !== trade.currentPrice) {
            tradeChanged = true;
            return {
              ...trade,
              currentPrice,
              profitLoss
            };
          }

          return trade;
        });
        return updatedTrades;
      });

      // 4. Drawdowns & Prop rules checks
      setAccounts(prevAccounts => {
        return prevAccounts.map(account => {
          if (account.status !== 'active') return account;

          // Find open trades for this account
          const openForAcc = trades.filter(t => t.accountId === account.id && t.status === 'open' && t.orderType === 'market');
          const sumPL = openForAcc.reduce((acc, curr) => acc + curr.profitLoss, 0);
          
          // Equity calculations
          const equity = account.balance + sumPL;
          const peak = Math.max(account.peakBalance, equity);

          // Drawdowns calculation
          const todayDrawdownVal = account.startOfDayBalance - equity;
          const cumulativeDrawdownVal = account.initialBalance - equity;

          let status = account.status;
          let phase = account.phase;

          // Check for Drawdown Breach
          const hitDailyDrawdown = todayDrawdownVal > account.dailyDrawdownLimitValue;
          const hitMaxDrawdown = cumulativeDrawdownVal > account.maxDrawdownLimitValue;

          if (hitDailyDrawdown || hitMaxDrawdown) {
            status = 'breached';
            
            // Auto close all open trades
            setTrades(prevT => prevT.map(t => {
              if (t.accountId === account.id && t.status === 'open') {
                return {
                  ...t,
                  status: 'closed',
                  reason: 'breach_close',
                  closedAt: new Date().toISOString(),
                  exitPrice: t.currentPrice
                };
              }
              return t;
            }));

            let breachMsg = '';
            let breachReasonName = '';
            if (hitDailyDrawdown) {
              breachMsg = `Daily drawdown limit exceeded ($${todayDrawdownVal.toFixed(2)} vs Max $${account.dailyDrawdownLimitValue.toFixed(2)}).`;
              breachReasonName = 'Daily Drawdown Limit Exceeded';
            } else {
              breachMsg = `Maximum cumulative drawdown limit exceeded ($${cumulativeDrawdownVal.toFixed(2)} vs Max $${account.maxDrawdownLimitValue.toFixed(2)}).`;
              breachReasonName = 'Max Cumulative Drawdown Exceeded';
            }

            // Log critical breach
            setAccountLogs(prevLogs => [
              {
                id: `log-${Date.now()}`,
                accountId: account.id,
                message: `CRITICAL RISK BREACH: ${breachMsg} Account disabled.`,
                type: 'danger',
                timestamp: new Date().toISOString()
              },
              ...prevLogs
            ]);

            // Set breach modal state
            setBreachedAccountNotification({
              id: account.id,
              reason: breachReasonName,
              message: breachMsg
            });

            // Exit active trading terminal immediately if this account is active
            if (activeTerminalAccount?.id === account.id) {
              setActiveTerminalAccount(null);
            }
          }

          // B: Validate Phase Target Met (Only if not breached and has open trades resolved)
          const targetPercent = phase === 'phase1' ? 8 : phase === 'phase2' ? 5 : 0;
          const targetRequired = account.initialBalance * (targetPercent / 100);
          const currentProfit = account.balance - account.initialBalance;

          if (status === 'active' && targetPercent > 0 && currentProfit >= targetRequired && openForAcc.length === 0) {
            // Evaluates pass ONLY when all trades are fully closed
            if (phase === 'phase1') {
              status = 'passed_phase1';
              phase = 'phase2';
              
              setAccountLogs(prevLogs => [
                {
                  id: `log-${Date.now()}`,
                  accountId: account.id,
                  message: `Phase 1 evaluation target met successfully (+${currentProfit.toFixed(2)}). Account updated to Phase 2.`,
                  type: 'success',
                  timestamp: new Date().toISOString()
                },
                ...prevLogs
              ]);
            } else if (phase === 'phase2') {
              status = 'passed_phase2';
              phase = 'funded';

              setAccountLogs(prevLogs => [
                {
                  id: `log-${Date.now()}`,
                  accountId: account.id,
                  message: `Phase 2 evaluation target met successfully (+${currentProfit.toFixed(2)}). Institutional funding credential UNLOCKED!`,
                  type: 'success',
                  timestamp: new Date().toISOString()
                },
                ...prevLogs
              ]);
            }
          }

          return {
            ...account,
            peakBalance: peak,
            status,
            phase
          };
        });
      });

    }, 1000);

    return () => clearInterval(interval);
  }, [trades, activeTerminalAccount]);
  */

  // Sync helper to fetch the state instantly after actions
  const syncStateWithServer = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setAccounts(data.accounts);
        setOrders(data.orders);
        setTrades(data.trades);
        setAccountLogs(data.accountLogs);
        setPayoutRequests(data.payoutRequests);
        setQuotes(data.quotes);
        setRuleViolations(data.ruleViolations || []);
        if (data.coupons) {
          setCoupons(data.coupons);
        }

        if (currentUser) {
          const freshUser = data.users.find((u: any) => u.id === currentUser.id);
          if (freshUser) {
            setCurrentUser(freshUser);
            localStorage.setItem('at_current_user', JSON.stringify(freshUser));
          }
        }

        if (activeTerminalAccount) {
          const freshAcc = data.accounts.find((a: any) => a.id === activeTerminalAccount.id);
          if (freshAcc) {
            setActiveTerminalAccount(freshAcc.status === 'breached' ? null : freshAcc);
          }
        }
      }
    } catch (e) {
      console.error('Error syncing state:', e);
    }
  };

  // PROP ACTIONS (SERVER DRIVEN)
  const handlePlaceTrade = async (
    asset: string,
    direction: TradeDirection, 
    lotSize: number, 
    stopLoss?: number, 
    takeProfit?: number, 
    orderType: OrderType = 'market', 
    triggerPrice?: number,
    leverage?: number
  ) => {
    if (!activeTerminalAccount) return;

    // Normalize asset symbol to standard format (e.g. 'GOLD' -> 'XAUUSD')
    const normalizedAsset = asset === 'EUR/USD' ? 'EURUSD'
      : asset === 'GBP/USD' ? 'GBPUSD'
      : asset === 'USD/JPY' ? 'USDJPY'
      : asset === 'BTC/USD' ? 'BTCUSD'
      : asset === 'GOLD' ? 'XAUUSD'
      : asset;

    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: activeTerminalAccount.id,
          asset: normalizedAsset,
          direction,
          lotSize,
          stopLoss,
          takeProfit,
          orderType,
          triggerPrice,
          leverage
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Trade Execution Error: ${err.error || 'Unknown error'}`);
        return;
      }

      await syncStateWithServer();
    } catch (e) {
      console.error('Failed to place trade:', e);
      alert('Failed to place trade due to network error.');
    }
  };

  const handleCloseTrade = async (tradeId: string) => {
    try {
      const res = await fetch(`/api/trades/${tradeId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Close Trade Error: ${err.error || 'Unknown error'}`);
        return;
      }

      const data = await res.json();
      
      // Handle the rule notification displays if returned
      const targetTrade = trades.find(t => t.id === tradeId);
      if (targetTrade) {
        const timeOpenMs = Date.now() - new Date(targetTrade.createdAt).getTime();
        const isTooEarly = timeOpenMs < 2 * 60 * 1000;
        if (isTooEarly) {
          const account = accounts.find(a => a.id === targetTrade.accountId);
          const warnings = account?.warningsCount || 0;
          if (warnings === 0) {
            setWarningAccountNotification({
              id: targetTrade.accountId,
              reason: 'Early Close Rule Violation (1st Warning)',
              message: 'You closed the position before the required minimum duration of 2 minutes (120 seconds). This is your first warning.'
            });
          } else {
            setBreachedAccountNotification({
              id: targetTrade.accountId,
              reason: 'Minimum Trade Duration Violated',
              message: 'Your account has been breached because you violated the 2-minute minimum position holding duration rule.'
            });
          }
        }
      }

      await syncStateWithServer();
    } catch (e) {
      console.error('Failed to close trade:', e);
    }
  };

  const handleCancelOrder = async (tradeId: string) => {
    try {
      const res = await fetch(`/api/trades/${tradeId}/cancel`, {
        method: 'POST'
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Cancel Order Error: ${err.error || 'Unknown error'}`);
        return;
      }

      await syncStateWithServer();
    } catch (e) {
      console.error('Failed to cancel order:', e);
    }
  };

  const handleModifyTrade = async (tradeId: string, stopLoss?: number, takeProfit?: number) => {
    try {
      const res = await fetch(`/api/trades/${tradeId}/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stopLoss, takeProfit })
      });

      if (!res.ok) {
        const err = await res.json();
        console.error(`Modify Trade Error: ${err.error || 'Unknown error'}`);
        return;
      }

      await syncStateWithServer();
    } catch (e) {
      console.error('Failed to modify trade:', e);
    }
  };

  // CHECKOUT & ORDERS WORKFLOWS
  const handleCreateOrder = async (newOrder: Order) => {
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Order Creation Error: ${err.error || 'Unknown error'}`);
        return;
      }

      await syncStateWithServer();
    } catch (e) {
      console.error('Failed to create order:', e);
    }
  };

  const handleApproveOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/approve`, {
        method: 'POST'
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Approve Order Error: ${err.error || 'Unknown error'}`);
        return;
      }

      await syncStateWithServer();
    } catch (e) {
      console.error('Failed to approve order:', e);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/reject`, {
        method: 'POST'
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Reject Order Error: ${err.error || 'Unknown error'}`);
        return;
      }

      await syncStateWithServer();
    } catch (e) {
      console.error('Failed to reject order:', e);
    }
  };

  // KYC WORKFLOWS
  const handleSubmitKyc = async (idType: string, idFile: string, selfieFile: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          idType,
          idFile,
          selfieFile
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`KYC Error: ${err.error || 'Unknown error'}`);
        return;
      }

      const data = await res.json();
      setCurrentUser(data.user);
      localStorage.setItem('at_current_user', JSON.stringify(data.user));

      await syncStateWithServer();
    } catch (e) {
      console.error('Failed to submit KYC:', e);
    }
  };

  const handleSavePayoutWalletAddress = async (address: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/${currentUser.id}/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutWalletAddress: address })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Wallet Save Error: ${err.error || 'Unknown error'}`);
        return;
      }

      const data = await res.json();
      setCurrentUser(data.user);
      localStorage.setItem('at_current_user', JSON.stringify(data.user));

      await syncStateWithServer();
    } catch (e) {
      console.error('Failed to save payout wallet address:', e);
    }
  };

  const handleApproveKyc = async (userId: string) => {
    try {
      const res = await fetch(`/api/kyc/${userId}/approve`, {
        method: 'POST'
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`KYC Approve Error: ${err.error || 'Unknown error'}`);
        return;
      }

      await syncStateWithServer();
    } catch (e) {
      console.error('Failed to approve KYC:', e);
    }
  };

  const handleRejectKyc = async (userId: string) => {
    try {
      const res = await fetch(`/api/kyc/${userId}/reject`, {
        method: 'POST'
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`KYC Reject Error: ${err.error || 'Unknown error'}`);
        return;
      }

      await syncStateWithServer();
    } catch (e) {
      console.error('Failed to reject KYC:', e);
    }
  };

  // MANUALLY TRIGGER AUDIT ACTIONS (ADMIN ACTIONS)
  const handleUpdateAccountStatus = async (accountId: string, status: Account['status'], phase: Account['phase'], breachedReason?: string) => {
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, phase, breachedReason })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Account Update Error: ${err.error || 'Unknown error'}`);
        return;
      }

      await syncStateWithServer();
    } catch (e) {
      console.error('Failed to update account status:', e);
    }
  };

  // COUPONS WORKFLOW
  const handleAddCoupon = async (newCoupon: Coupon) => {
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCoupon)
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Coupon Error: ${err.error || 'Unknown error'}`);
        return;
      }
      await syncStateWithServer();
    } catch (e) {
      console.error('Failed to add coupon:', e);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    try {
      const res = await fetch(`/api/coupons/${encodeURIComponent(code)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Delete Coupon Error: ${err.error || 'Unknown error'}`);
        return;
      }
      await syncStateWithServer();
    } catch (e) {
      console.error('Failed to delete coupon:', e);
    }
  };

  // PAYOUTS WORKFLOW
  const handleCreatePayoutRequest = async (req: PayoutRequest) => {
    try {
      const res = await fetch('/api/payout/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Payout Error: ${err.error || 'Unknown error'}`);
        return;
      }

      await syncStateWithServer();
    } catch (e) {
      console.error('Failed to create payout request:', e);
    }
  };

  const handleUpdatePayoutStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/payout/${id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Update Payout Error: ${err.error || 'Unknown error'}`);
        return;
      }

      await syncStateWithServer();
    } catch (e) {
      console.error('Failed to update payout status:', e);
    }
  };

  // FORCE SYNC SIMULATION TRIGGER
  const handleForceSync = async () => {
    await syncStateWithServer();
  };

  return (
    <div className="bg-[#05070B] text-gray-100 min-h-screen relative font-sans">
      
      {/* INFINITE RUNNING COUPON TICKER BANNER */}
      {!activeTerminalAccount && (
        <>
          <style>{`
            @keyframes marquee-scroll {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
            .animate-ticker-marquee {
              display: inline-block;
              white-space: nowrap;
              animation: marquee-scroll 25s linear infinite;
            }
          `}</style>
          <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black py-2 overflow-hidden whitespace-nowrap font-mono text-xs font-black border-b border-amber-600/50 relative z-50 flex items-center select-none shadow-md">
            <div className="animate-ticker-marquee inline-block uppercase tracking-wider">
              ⚡ SAVE 30% ON ALL CHALLENGE EVALUATIONS NOW • USE CODE <span className="bg-black text-amber-400 px-2.5 py-0.5 rounded border border-amber-500/60 font-sans font-black text-xs select-all">SAVE30</span> AT SECURE CHECKOUT • GAIN ACCESS TO CAPITAL UP TO $200,000 • MAXIMUM DRAWDOWN LIMIT 10% • 15-MIN TRADING INTERVAL • TRADE WITH ULTRALOW INSTITUTIONAL SPREADS! ⚡&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              ⚡ SAVE 30% ON ALL CHALLENGE EVALUATIONS NOW • USE CODE <span className="bg-black text-amber-400 px-2.5 py-0.5 rounded border border-amber-500/60 font-sans font-black text-xs select-all">SAVE30</span> AT SECURE CHECKOUT • GAIN ACCESS TO CAPITAL UP TO $200,000 • MAXIMUM DRAWDOWN LIMIT 10% • 15-MIN TRADING INTERVAL • TRADE WITH ULTRALOW INSTITUTIONAL SPREADS! ⚡&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            </div>
          </div>
        </>
      )}
      
      {/* NAVIGATION PANEL */}
      {!activeTerminalAccount && (
        <nav className="border-b border-gray-900/80 bg-[#0A0D14]/90 backdrop-blur-sm h-16 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={() => { 
                setActiveTerminalAccount(null); 
                setShowAuth(false); 
                setCurrentView('landing');
              }}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <span className="font-sans font-bold text-black text-lg">AT</span>
              </div>
              <span className="font-sans text-xl font-bold tracking-wider text-white">
                AT<span className="text-amber-400">Funding</span>
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => { 
                  setActiveTerminalAccount(null); 
                  setShowAuth(false); 
                  setCurrentView('landing');
                }}
                className={`text-xs font-semibold transition-colors cursor-pointer hidden md:block ${currentView === 'landing' ? 'text-amber-400 font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                Institutional Home
              </button>

              {currentUser ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setActiveTerminalAccount(null);
                      setDashboardTab('accounts');
                      setCurrentView('dashboard');
                    }}
                    className={`border text-xs font-semibold py-2 px-4 rounded-lg transition-all cursor-pointer ${currentView === 'dashboard' ? 'bg-amber-500 text-black border-amber-500' : 'bg-[#111622] border-gray-800 text-gray-200 hover:text-white hover:border-amber-500'}`}
                  >
                    {currentUser.role === 'admin' ? 'Admin Portal' : 'Trader Dashboard'}
                  </button>
                  <button
                    onClick={() => {
                      setCurrentUser(null);
                      setActiveTerminalAccount(null);
                      setCurrentView('landing');
                    }}
                    className="text-xs text-red-400 hover:underline cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setPendingChallenge(null);
                    setShowAuth(true);
                  }}
                  className="bg-gradient-to-r from-amber-500 to-yellow-600 text-black text-xs font-bold py-2 px-5 rounded-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  Access Portal
                </button>
              )}
            </div>
          </div>
        </nav>
      )}

      {/* VIEW ROUTER */}
      {activeTerminalAccount ? (
        // Render MT5 trading terminal
        <TradingTerminal
          currentUser={currentUser!}
          activeAccount={activeTerminalAccount}
          quotes={quotes}
          trades={trades}
          candles={candles}
          accountLogs={accountLogs}
          ruleViolations={ruleViolations}
          onPlaceTrade={handlePlaceTrade}
          onCloseTrade={handleCloseTrade}
          onCancelOrder={handleCancelOrder}
          onModifyTrade={handleModifyTrade}
          onBackToDashboard={() => {
            setActiveTerminalAccount(null);
            setCurrentView('dashboard');
          }}
          liveDataUnavailable={liveDataUnavailable}
        />
      ) : showAuth ? (
        // Render Login/Signup screen
        <AuthScreen
          onLogin={async (user) => {
            setCurrentUser(user);
            setShowAuth(false);
            try {
              await syncStateWithServer();
            } catch (err) {
              console.error('Failed to sync state after login:', err);
            }
            if (pendingChallenge) {
              setCurrentView('landing');
            } else {
              setCurrentView('dashboard');
            }
          }}
          registeredUsers={users}
        />
      ) : currentUser && currentView === 'dashboard' ? (
        currentUser.role === 'admin' ? (
          // Render Admin Panel
          <AdminPanel
            currentUser={currentUser}
            onLogout={() => {
              setCurrentUser(null);
              setActiveTerminalAccount(null);
              setCurrentView('landing');
            }}
            users={users}
            accounts={accounts}
            orders={orders}
            trades={trades}
            coupons={coupons}
            ruleViolations={ruleViolations}
            onApproveOrder={handleApproveOrder}
            onRejectOrder={handleRejectOrder}
            onApproveKyc={handleApproveKyc}
            onRejectKyc={handleRejectKyc}
            onUpdateAccountStatus={handleUpdateAccountStatus}
            onAddCoupon={handleAddCoupon}
            onDeleteCoupon={handleDeleteCoupon}
            onRefreshData={handleForceSync}
            payoutRequests={payoutRequests}
            onUpdatePayoutStatus={handleUpdatePayoutStatus}
          />
        ) : (
          // Render Trader Dashboard
          <Dashboard
            currentUser={currentUser}
            initialTab={dashboardTab}
            onLogout={() => {
              setCurrentUser(null);
              setActiveTerminalAccount(null);
              setCurrentView('landing');
            }}
            accounts={accounts}
            accountLogs={accountLogs}
            onLaunchTerminal={(acc) => setActiveTerminalAccount(acc)}
            onSubmitKyc={handleSubmitKyc}
            onSavePayoutWalletAddress={handleSavePayoutWalletAddress}
            onRefreshData={handleForceSync}
            onShowBreachDetails={(acc) => {
              setBreachedAccountNotification({
                id: acc.id,
                reason: 'Account Rules Breached',
                message: 'Your trading account was suspended because risk management parameters or stop-loss limits were breached.'
              });
            }}
            payoutRequests={payoutRequests}
            onCreatePayoutRequest={handleCreatePayoutRequest}
            trades={trades}
          />
        )
      ) : (
        // Render Landing Marketing page
        <LandingPage
          currentUser={currentUser}
          pendingChallenge={pendingChallenge}
          onClearPendingChallenge={() => setPendingChallenge(null)}
          onSelectChallenge={(challenge) => {
            setPendingChallenge(challenge);
            setShowAuth(true);
          }}
          onOpenAuth={() => setShowAuth(true)}
          onCreateOrder={handleCreateOrder}
          activeOrders={orders}
          accounts={accounts}
          onNavigateToDashboard={() => setCurrentView('dashboard')}
          coupons={coupons}
        />
      )}

      {/* BREACHED RULES WARNING OVERLAY MODAL */}
      {breachedAccountNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#0A0E17] border border-red-500/30 rounded-2xl max-w-md w-full p-6 text-center space-y-6 shadow-2xl shadow-red-950/20 relative">
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setBreachedAccountNotification(null)}
                className="p-1 text-gray-500 hover:text-white rounded-lg hover:bg-gray-900 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 animate-bounce">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Account Rules Breached</h3>
              <p className="text-xs text-red-400 font-semibold uppercase tracking-wider font-mono">
                {breachedAccountNotification.reason}
              </p>
              <p className="text-xs text-gray-400 leading-relaxed pt-2">
                You have breached the account rules. Please contact our support team immediately to assist you with a fresh evaluation challenge.
              </p>
            </div>

            <div className="bg-[#111622] p-4 rounded-xl border border-gray-800 text-xs text-left space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">Account ID:</span>
                <span className="text-white font-semibold">{breachedAccountNotification.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Risk Policy:</span>
                <span className="text-amber-500 font-semibold">Strict Limits Violations</span>
              </div>
              <div className="border-t border-gray-800/80 pt-2 mt-2 text-[11px] text-gray-400 leading-normal">
                <span className="text-red-400 font-semibold">Details:</span> {breachedAccountNotification.message}
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-left space-y-3">
              <h4 className="text-xs font-bold text-white text-center uppercase tracking-wider">Connect to Support team</h4>
              <p className="text-[10px] text-gray-400 text-center leading-normal">
                Click below to instantly contact our agents on Instagram or via Email to resolve or get help:
              </p>
              
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href="https://www.instagram.com/atfunding"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-bold text-xs text-center transition-opacity"
                >
                  <span>Instagram Official</span>
                </a>
                <a
                  href="https://www.instagram.com/atfundingteam"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-lg bg-gradient-to-r from-pink-600 to-red-500 hover:opacity-90 text-white font-bold text-xs text-center transition-opacity"
                >
                  <span>Instagram Support</span>
                </a>
              </div>

              <div className="text-center font-mono text-[10px] text-gray-500 space-y-0.5 pt-2 border-t border-gray-800/60">
                <p>Official Page: <a href="https://www.instagram.com/atfunding" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">@atfunding</a></p>
                <p>Support Account: <a href="https://www.instagram.com/atfundingteam" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">@atfundingteam</a></p>
                <p>Gmail: <a href="mailto:asjadtrades07@gmail.com" className="text-amber-400 hover:underline">asjadtrades07@gmail.com</a></p>
              </div>
            </div>

            <button
              onClick={() => setBreachedAccountNotification(null)}
              className="w-full bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer shadow-lg shadow-red-950/20"
            >
              Understand & Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* 1ST WARNING OVERLAY MODAL */}
      {warningAccountNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#0A0E17] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 text-center space-y-6 shadow-2xl shadow-amber-950/20 relative">
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setWarningAccountNotification(null)}
                className="p-1 text-gray-500 hover:text-white rounded-lg hover:bg-gray-900 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mx-auto w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-500 animate-pulse">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">⚠️ RULE VIOLATION WARNING</h3>
              <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider font-mono">
                {warningAccountNotification.reason}
              </p>
              <div className="bg-amber-500/10 text-amber-300 p-3.5 rounded-xl border border-amber-500/20 text-xs leading-relaxed font-sans text-center">
                <strong>Aap 2 minute se pehle nikal gaye!</strong>
                <p className="mt-1 text-gray-300 text-[11px]">
                  Agli baar agar aapne 2 minute se pehle trade close kiya, to aapka account <span className="text-red-400 font-bold">BREACH</span> (suspend) kar diya jayega.
                </p>
              </div>
            </div>

            <div className="bg-[#111622] p-4 rounded-xl border border-gray-800 text-xs text-left space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">Account ID:</span>
                <span className="text-white font-semibold">{warningAccountNotification.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Warning Status:</span>
                <span className="text-amber-500 font-semibold">1st Warning (First & Final Warning)</span>
              </div>
              <div className="border-t border-gray-800/80 pt-2 mt-2 text-[11px] text-gray-400 leading-normal">
                <span className="text-amber-400 font-semibold">Violated Rule:</span> Positions must be held for a minimum of 2 minutes (120 seconds).
              </div>
            </div>

            <button
              onClick={() => setWarningAccountNotification(null)}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:opacity-90 text-black py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer shadow-lg shadow-amber-500/20"
            >
              I Understand & Will Follow
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
