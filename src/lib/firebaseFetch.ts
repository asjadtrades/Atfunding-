import { CHALLENGES, COUPONS, INITIAL_QUOTES, ASSET_PROPERTIES } from '../data';
import { MarketQuote, User, Account, Order, Trade, AccountLog, PayoutRequest, RuleViolation, AffiliateProfile, AffiliateCommission, AffiliatePayoutRequest, Coupon, KycStatus } from '../types';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

let currentQuotes: MarketQuote[] = JSON.parse(JSON.stringify(INITIAL_QUOTES));

// Helper for currency conversions
function getQuoteToUSDExchangeRate(symbol: string): number {
  const symbolClean = symbol.toUpperCase().replace('/', '');
  const defaults: Record<string, number> = {
    USDJPY: 156.45,
    USDCHF: 0.89,
    USDCAD: 1.37,
    GBPUSD: 1.265,
    EURUSD: 1.0845,
    AUDUSD: 0.665,
    NZDUSD: 0.612,
  };

  const getQuotePrice = (sym: string) => {
    const q = currentQuotes.find(c => c.symbol.toUpperCase().replace('/', '') === sym);
    return q ? q.price : (defaults[sym] || 1.0);
  };

  if (symbolClean.endsWith('JPY')) {
    return 1.0 / getQuotePrice('USDJPY');
  }
  if (symbolClean.endsWith('CHF')) {
    return 1.0 / getQuotePrice('USDCHF');
  }
  if (symbolClean.endsWith('CAD')) {
    return 1.0 / getQuotePrice('USDCAD');
  }
  if (symbolClean.endsWith('GBP')) {
    return getQuotePrice('GBPUSD');
  }
  if (symbolClean.endsWith('EUR')) {
    return getQuotePrice('EURUSD');
  }
  if (symbolClean.endsWith('AUD')) {
    return getQuotePrice('AUDUSD');
  }
  if (symbolClean.endsWith('NZD')) {
    return getQuotePrice('NZDUSD');
  }
  return 1.0;
}

// ----------------------------------------------------
// SEEDING DEFAULT DATABASE DATA
// ----------------------------------------------------
async function seedDefaultData() {
  try {
    const checkDoc = doc(db, 'system', 'config');
    const snap = await getDoc(checkDoc);
    if (snap.exists()) {
      return; // Already seeded
    }

    console.log('[Firebase Seeding] Initializing default collections...');

    await setDoc(checkDoc, { seeded: true, createdAt: new Date().toISOString() });

    // Seed admin credentials
    await setDoc(doc(db, 'system', 'adminCredentials'), {
      email: "atgrowfund@gmail.com",
      password: "asjadx"
    });

    const defaultUsers: User[] = [
      {
        id: "admin-atgrowfund",
        email: "asjadtrades07@gmail.com",
        name: "ATFunding Admin",
        role: "admin",
        kycStatus: "approved",
        createdAt: "2026-06-30T05:31:50.119Z"
      },
      {
        id: "user-default",
        email: "trader@atfunding.com",
        name: "Alpha Trader",
        role: "user",
        kycStatus: "none",
        createdAt: "2026-06-30T05:31:50.119Z"
      }
    ];
    for (const u of defaultUsers) {
      await setDoc(doc(db, 'users', u.id), u);
    }

    const defaultAccounts: Account[] = [
      {
        id: "ACC-149302",
        userId: "user-default",
        userEmail: "trader@atfunding.com",
        userName: "Alpha Trader",
        challengeConfigId: "os-5k",
        challengeName: "ATFunding 5K Challenge (One-Step)",
        challengeSize: 5000,
        type: "one_step",
        status: "active",
        breachedReason: "",
        phase: "phase1",
        balance: 5000,
        initialBalance: 5000,
        peakBalance: 5000,
        startOfDayBalance: 5000,
        dailyDrawdownLimitValue: 200,
        maxDrawdownLimitValue: 400,
        payoutSharePercent: 80,
        createdAt: "2026-07-06T14:32:21.052Z",
        warningsCount: 0
      }
    ];
    for (const a of defaultAccounts) {
      await setDoc(doc(db, 'accounts', a.id), a);
    }

    for (const c of COUPONS) {
      await setDoc(doc(db, 'coupons', c.code), c);
    }

    const challengeCommissions = {
      "os-5k": 10,
      "os-10k": 20,
      "ts-5k": 7.5,
      "ts-10k": 15,
      "inst-1k": 1,
      "inst-2k": 2,
      "ppl-5k": 2.5,
      "ppl-10k": 5
    };
    await setDoc(doc(db, 'system', 'challengeCommissions'), challengeCommissions);

    console.log('[Firebase Seeding] Seeding completed.');
  } catch (e) {
    console.error('[Firebase Seeding Error]', e);
  }
}

// ----------------------------------------------------
// SIMULATED PRICE TICK & RISK ENGINE LOOP
// ----------------------------------------------------
function runSimulatedTickLoop() {
  setInterval(async () => {
    // 1. Tick quotes with random walks
    currentQuotes.forEach(q => {
      const changeRange = q.price * 0.0008; // Max 0.08% change per tick
      const change = (Math.random() - 0.495) * changeRange;
      q.price = parseFloat((q.price + change).toFixed(5));
      q.high = Math.max(q.high, q.price);
      q.low = Math.min(q.low, q.price);
      q.change = parseFloat((((q.price - q.prevPrice) / q.prevPrice) * 100).toFixed(2));
    });

    // 2. Process open trades and risk rules from Firestore
    try {
      const tradesSnap = await getDocs(query(collection(db, 'trades'), where('status', '==', 'open')));
      const openTrades = tradesSnap.docs.map(d => d.data() as Trade);

      for (const trade of openTrades) {
        const q = currentQuotes.find(quote => quote.symbol.toUpperCase().replace('/', '') === trade.asset.toUpperCase().replace('/', ''));
        if (!q) continue;

        const currentPrice = q.price;
        const props = ASSET_PROPERTIES[trade.asset.toUpperCase().replace('/', '')];
        if (!props) continue;

        // Calculate PnL in USD
        let pnlQuote = 0;
        const pipsDiff = (currentPrice - trade.entryPrice) / props.pipSize;
        const pipValue = props.pipSize * props.contractSize;

        if (trade.direction === 'buy') {
          pnlQuote = pipsDiff * pipValue * trade.lotSize;
        } else {
          pnlQuote = -pipsDiff * pipValue * trade.lotSize;
        }

        const exchangeRate = getQuoteToUSDExchangeRate(trade.asset);
        const profitUSD = parseFloat((pnlQuote * exchangeRate).toFixed(2));

        // Stop Loss / Take Profit Hit Check
        let shouldClose = false;
        let closePrice = currentPrice;
        let closeReason = '';

        if (trade.stopLoss) {
          if (trade.direction === 'buy' && currentPrice <= trade.stopLoss) {
            shouldClose = true;
            closePrice = trade.stopLoss;
            closeReason = 'SL hit';
          } else if (trade.direction === 'sell' && currentPrice >= trade.stopLoss) {
            shouldClose = true;
            closePrice = trade.stopLoss;
            closeReason = 'SL hit';
          }
        }

        if (trade.takeProfit) {
          if (trade.direction === 'buy' && currentPrice >= trade.takeProfit) {
            shouldClose = true;
            closePrice = trade.takeProfit;
            closeReason = 'TP hit';
          } else if (trade.direction === 'sell' && currentPrice <= trade.takeProfit) {
            shouldClose = true;
            closePrice = trade.takeProfit;
            closeReason = 'TP hit';
          }
        }

        if (shouldClose) {
          await setDoc(doc(db, 'trades', trade.id), {
            ...trade,
            status: 'closed',
            exitPrice: closePrice,
            closedAt: new Date().toISOString(),
            reason: closeReason,
            profitLoss: profitUSD
          });

          // Update Account
          const accRef = doc(db, 'accounts', trade.accountId);
          const accSnap = await getDoc(accRef);
          if (accSnap.exists()) {
            const acc = accSnap.data() as Account;
            const newBalance = parseFloat((acc.balance + profitUSD).toFixed(2));
            await updateDoc(accRef, {
              balance: newBalance,
              peakBalance: Math.max(acc.peakBalance, newBalance)
            });

            // Log closure
            const logRef = doc(collection(db, 'accountLogs'));
            await setDoc(logRef, {
              id: logRef.id,
              accountId: acc.id,
              message: `Position #${trade.id.slice(0, 8)} automatically closed (${closeReason}) at ${closePrice}. Net Profit/Loss: $${profitUSD.toLocaleString()}`,
              type: profitUSD >= 0 ? 'success' : 'warning',
              timestamp: new Date().toISOString()
            });
          }
        } else {
          // Live sync floating profit with Firestore so user sees real-time trading updates across browsers
          await updateDoc(doc(db, 'trades', trade.id), {
            currentPrice,
            profitLoss: profitUSD
          });
        }
      }

      // 3. Evaluate Accounts Drawdowns
      const accountsSnap = await getDocs(query(collection(db, 'accounts'), where('status', '==', 'active')));
      const activeAccounts = accountsSnap.docs.map(d => d.data() as Account);

      for (const acc of activeAccounts) {
        // Compute floating profit of all open trades of this account
        const accTradesSnap = await getDocs(query(collection(db, 'trades'), where('accountId', '==', acc.id), where('status', '==', 'open')));
        const accTrades = accTradesSnap.docs.map(d => d.data() as Trade);
        const floatingPnl = accTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
        const equity = acc.balance + floatingPnl;

        if (equity > acc.peakBalance) {
          await updateDoc(doc(db, 'accounts', acc.id), {
            peakBalance: parseFloat(equity.toFixed(2))
          });
        }

        const dailyDrawdown = acc.startOfDayBalance - equity;
        const maxDrawdown = acc.initialBalance - equity;

        let breached = false;
        let breachReason = '';

        if (dailyDrawdown > acc.dailyDrawdownLimitValue) {
          breached = true;
          breachReason = `Daily drawdown limit of $${acc.dailyDrawdownLimitValue.toLocaleString()} breached. Floating equity hit $${equity.toLocaleString()} starting from day balance of $${acc.startOfDayBalance.toLocaleString()}`;
        } else if (maxDrawdown > acc.maxDrawdownLimitValue) {
          breached = true;
          breachReason = `Max drawdown limit of $${acc.maxDrawdownLimitValue.toLocaleString()} breached. Floating equity hit $${equity.toLocaleString()} starting from initial balance of $${acc.initialBalance.toLocaleString()}`;
        }

        if (breached) {
          await updateDoc(doc(db, 'accounts', acc.id), {
            status: 'breached',
            breachedReason: breachReason
          });

          // Close all open positions of this account
          for (const t of accTrades) {
            await setDoc(doc(db, 'trades', t.id), {
              ...t,
              status: 'closed',
              exitPrice: t.currentPrice || t.entryPrice,
              closedAt: new Date().toISOString(),
              reason: 'breach_close'
            });
          }

          // Create breach log
          const logRef = doc(collection(db, 'accountLogs'));
          await setDoc(logRef, {
            id: logRef.id,
            accountId: acc.id,
            message: `🚨 ACCOUNT BREACHED: ${breachReason}`,
            type: 'danger',
            timestamp: new Date().toISOString()
          });
        }
      }

    } catch (e) {
      console.error('[Firebase Tick Engine Error]', e);
    }
  }, 2000);
}

// ----------------------------------------------------
// FETCH INTERCEPTOR FOR CLIENT-SIDE FIRESTORE DB
// ----------------------------------------------------
export function initFirebaseFetch() {
  if (typeof window === 'undefined') return;

  // Run initial seed
  seedDefaultData();

  // Run real-time background market quotes loop
  runSimulatedTickLoop();

  const originalFetch = window.fetch;

  const myFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlString = input.toString();

    // Only intercept /api/ requests
    if (!urlString.includes('/api/')) {
      return originalFetch(input, init);
    }

    console.log(`[Firebase API Router] Intercepting fetch: ${urlString}`);

    // Small latency for natural database simulation
    await new Promise(resolve => setTimeout(resolve, 80));

    const url = new URL(urlString, window.location.origin);
    const path = url.pathname;
    const method = init?.method?.toUpperCase() || 'GET';
    const body = init?.body ? JSON.parse(init.body as string) : null;

    try {
      // ----------------------------------------------------
      // GET /api/state
      // ----------------------------------------------------
      if (path === '/api/state' && method === 'GET') {
        const usersSnap = await getDocs(collection(db, 'users'));
        const accountsSnap = await getDocs(collection(db, 'accounts'));
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const tradesSnap = await getDocs(collection(db, 'trades'));
        const accountLogsSnap = await getDocs(collection(db, 'accountLogs'));
        const payoutRequestsSnap = await getDocs(collection(db, 'payoutRequests'));
        const couponsSnap = await getDocs(collection(db, 'coupons'));
        const affiliateProfilesSnap = await getDocs(collection(db, 'affiliateProfiles'));
        const commissionsSnap = await getDocs(collection(db, 'commissions'));
        const affiliatePayoutRequestsSnap = await getDocs(collection(db, 'affiliatePayoutRequests'));

        const challengeCommsSnap = await getDoc(doc(db, 'system', 'challengeCommissions'));
        const challengeComms = challengeCommsSnap.exists() ? challengeCommsSnap.data() : {};

        return new Response(JSON.stringify({
          users: usersSnap.docs.map(doc => doc.data()),
          accounts: accountsSnap.docs.map(doc => doc.data()),
          orders: ordersSnap.docs.map(doc => doc.data()),
          trades: tradesSnap.docs.map(doc => doc.data()),
          accountLogs: accountLogsSnap.docs.map(doc => doc.data()),
          payoutRequests: payoutRequestsSnap.docs.map(doc => doc.data()),
          quotes: currentQuotes,
          ruleViolations: [],
          coupons: couponsSnap.docs.map(doc => doc.data()),
          affiliateProfiles: affiliateProfilesSnap.docs.map(doc => doc.data()),
          commissions: commissionsSnap.docs.map(doc => doc.data()),
          affiliatePayoutRequests: affiliatePayoutRequestsSnap.docs.map(doc => doc.data()),
          challengeCommissions: challengeComms,
          liveDataUnavailable: false
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // ----------------------------------------------------
      // POST /api/auth/login
      // ----------------------------------------------------
      if (path === '/api/auth/login' && method === 'POST') {
        const { email, password } = body;
        const normalizedEmail = email.toLowerCase().trim();

        // Admin config check from DB
        const adminCredentialsSnap = await getDoc(doc(db, 'system', 'adminCredentials'));
        let adminConfig = { email: "atgrowfund@gmail.com", password: "asjadx" };
        if (adminCredentialsSnap.exists()) {
          adminConfig = adminCredentialsSnap.data() as typeof adminConfig;
        }

        if (normalizedEmail === adminConfig.email && password === adminConfig.password) {
          const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
          const adminUser = usersSnap.docs.length > 0 ? usersSnap.docs[0].data() : {
            id: "admin-atgrowfund",
            email: "asjadtrades07@gmail.com",
            name: "ATFunding Admin",
            role: "admin",
            kycStatus: "approved",
            createdAt: new Date().toISOString()
          };
          return new Response(JSON.stringify({ success: true, user: adminUser }), { status: 200 });
        }

        const userQuerySnap = await getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail)));
        if (userQuerySnap.docs.length > 0) {
          const matchedUser = userQuerySnap.docs[0].data();
          return new Response(JSON.stringify({ success: true, user: matchedUser }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: 'User not found. Please register.' }), { status: 404 });
      }

      // ----------------------------------------------------
      // POST /api/auth/signup
      // ----------------------------------------------------
      if (path === '/api/auth/signup' && method === 'POST') {
        const { email, name, password } = body;
        const normalizedEmail = email.toLowerCase().trim();

        const userQuerySnap = await getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail)));
        if (userQuerySnap.docs.length > 0) {
          return new Response(JSON.stringify({ error: 'Email already registered.' }), { status: 400 });
        }

        const newUser: User = {
          id: `usr-${Math.floor(100000 + Math.random() * 900000)}`,
          email: normalizedEmail,
          name: name || 'Trader',
          role: normalizedEmail === 'atgrowfund@gmail.com' ? 'admin' : 'user',
          kycStatus: 'none',
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', newUser.id), newUser);

        return new Response(JSON.stringify({ success: true, user: newUser }), { status: 200 });
      }

      // ----------------------------------------------------
      // POST /api/orders/create
      // ----------------------------------------------------
      if (path === '/api/orders/create' && method === 'POST') {
        const rawOrder = body.order || body || {};
        const emailToUse = (rawOrder.userEmail || '').toLowerCase().trim();
        const accountId = `ACC-${Math.floor(100000 + Math.random() * 900000)}`;

        const order: Order = {
          id: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
          userId: rawOrder.userId || `usr-${Math.floor(100000 + Math.random() * 900000)}`,
          userEmail: emailToUse,
          userName: rawOrder.userName || 'Trader',
          referredBy: rawOrder.referredBy || undefined,
          surname: rawOrder.surname || '',
          phoneNumber: rawOrder.phoneNumber || '',
          city: rawOrder.city || '',
          zipCode: rawOrder.zipCode || '',
          country: rawOrder.country || '',
          challengeConfigId: rawOrder.challengeConfigId,
          challengeName: rawOrder.challengeName,
          challengeSize: rawOrder.challengeSize,
          amount: rawOrder.amount || 0,
          couponUsed: rawOrder.couponUsed || '',
          discount: rawOrder.discount || 0,
          finalPrice: rawOrder.finalPrice || 0,
          transactionId: rawOrder.transactionId || '',
          screenshotUrl: rawOrder.screenshotUrl || '',
          recipientAddress: rawOrder.recipientAddress || '',
          isReset: !!rawOrder.isReset,
          resetAccountId: rawOrder.resetAccountId,
          cardNo: rawOrder.cardNo,
          cardExp: rawOrder.cardExp,
          cardCvv: rawOrder.cardCvv,
          cardName: rawOrder.cardName,
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        // All accounts and resets now require manual admin approval and activation.
        if (order.isReset && order.resetAccountId) {
          const accSnap = await getDoc(doc(db, 'accounts', order.resetAccountId));
          if (accSnap.exists()) {
            await updateDoc(doc(db, 'accounts', order.resetAccountId), {
              status: 'pending_payment'
            });

            const logRef = doc(collection(db, 'accountLogs'));
            await setDoc(logRef, {
              id: logRef.id,
              accountId: order.resetAccountId,
              message: `Account reset order submitted. Pending manual admin verification and activation.`,
              type: 'info',
              timestamp: new Date().toISOString()
            });
          }
        } else {
          const dailyLimit = Math.round(order.challengeSize * 0.05);
          const maxLimit = Math.round(order.challengeSize * 0.10);
          const newAccount: Account = {
            id: accountId,
            userId: order.userId,
            userEmail: order.userEmail,
            userName: order.userName,
            challengeConfigId: order.challengeConfigId,
            challengeName: order.challengeName,
            challengeSize: order.challengeSize,
            type: order.challengeConfigId.includes('os') ? 'one_step' : 'two_step',
            status: 'pending_payment',
            phase: 'phase1',
            balance: order.challengeSize,
            initialBalance: order.challengeSize,
            peakBalance: order.challengeSize,
            startOfDayBalance: order.challengeSize,
            dailyDrawdownLimitValue: dailyLimit,
            maxDrawdownLimitValue: maxLimit,
            payoutSharePercent: 80,
            createdAt: new Date().toISOString(),
            warningsCount: 0
          };
          await setDoc(doc(db, 'accounts', accountId), newAccount);

          const logRef = doc(collection(db, 'accountLogs'));
          await setDoc(logRef, {
            id: logRef.id,
            accountId: accountId,
            message: `Account created successfully with ID ${accountId}. Pending manual admin verification and activation.`,
            type: 'info',
            timestamp: new Date().toISOString()
          });
          order.accountId = accountId;
        }

        await setDoc(doc(db, 'orders', order.id), order);

        const freshAccSnap = await getDoc(doc(db, 'accounts', accountId));
        return new Response(JSON.stringify({
          success: true,
          order,
          account: freshAccSnap.exists() ? freshAccSnap.data() : null
        }), { status: 200 });
      }

      // ----------------------------------------------------
      // POST /api/admin/orders/:id/approve
      // ----------------------------------------------------
      if (path.startsWith('/api/admin/orders/') && path.endsWith('/approve') && method === 'POST') {
        const orderId = path.split('/')[4];
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
          const ord = orderSnap.data() as Order;
          await updateDoc(orderRef, { status: 'approved' });

          if (ord.isReset && ord.resetAccountId) {
            const accSnap = await getDoc(doc(db, 'accounts', ord.resetAccountId));
            if (accSnap.exists()) {
              const acc = accSnap.data() as Account;
              await updateDoc(doc(db, 'accounts', acc.id), {
                status: 'active',
                breachedReason: '',
                balance: acc.initialBalance,
                peakBalance: acc.initialBalance,
                startOfDayBalance: acc.initialBalance,
                resetsCount: (acc.resetsCount || 0) + 1
              });

              const logRef = doc(collection(db, 'accountLogs'));
              await setDoc(logRef, {
                id: logRef.id,
                accountId: acc.id,
                message: `Account reset approved by Administrator. Balance refreshed. Evaluation resumed.`,
                type: 'success',
                timestamp: new Date().toISOString()
              });
            }
          } else if (ord.accountId) {
            await updateDoc(doc(db, 'accounts', ord.accountId), { status: 'active' });

            const logRef = doc(collection(db, 'accountLogs'));
            await setDoc(logRef, {
              id: logRef.id,
              accountId: ord.accountId,
              message: `Challenge activated successfully by administrator audit! Evaluation started.`,
              type: 'success',
              timestamp: new Date().toISOString()
            });
          }

          // Generate affiliate commissions if referred
          if (ord.referredBy) {
            const challengeCommsSnap = await getDoc(doc(db, 'system', 'challengeCommissions'));
            const challengeComms = challengeCommsSnap.exists() ? challengeCommsSnap.data() : {};
            const commVal = challengeComms[ord.challengeConfigId] || 5;

            const commissionId = `comm-${Date.now()}`;
            await setDoc(doc(db, 'commissions', commissionId), {
              id: commissionId,
              affiliateUserId: ord.referredBy,
              referredUserId: ord.userId,
              referredUserEmail: ord.userEmail,
              orderId: ord.id,
              challengeName: ord.challengeName,
              challengeSize: ord.challengeSize,
              purchaseAmount: ord.finalPrice,
              commissionAmount: commVal,
              status: 'pending',
              createdAt: new Date().toISOString()
            });
          }

          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
      }

      // ----------------------------------------------------
      // POST /api/admin/orders/:id/reject
      // ----------------------------------------------------
      if (path.startsWith('/api/admin/orders/') && path.endsWith('/reject') && method === 'POST') {
        const orderId = path.split('/')[4];
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
          const ord = orderSnap.data() as Order;
          const reqReason = body.reason || body.rejectionReason || 'Order rejected / Payment verification failed.';
          await updateDoc(orderRef, { status: 'rejected', rejectionReason: reqReason });

          if (ord.accountId) {
            await updateDoc(doc(db, 'accounts', ord.accountId), {
              status: 'breached',
              breachedReason: reqReason,
              rejectionReason: reqReason
            });

            const logRef = doc(collection(db, 'accountLogs'));
            await setDoc(logRef, {
              id: logRef.id,
              accountId: ord.accountId,
              message: `Payment verification rejected: ${reqReason}`,
              type: 'danger',
              timestamp: new Date().toISOString()
            });
          }
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
      }

      // ----------------------------------------------------
      // POST /api/trades
      // ----------------------------------------------------
      if (path === '/api/trades' && method === 'POST') {
        const { accountId, asset, direction, lotSize, stopLoss, takeProfit } = body;
        const accSnap = await getDoc(doc(db, 'accounts', accountId));

        if (!accSnap.exists() || accSnap.data()?.status !== 'active') {
          return new Response(JSON.stringify({ error: 'Account is not active' }), { status: 400 });
        }

        const q = currentQuotes.find(quote => quote.symbol.toUpperCase().replace('/', '') === asset.toUpperCase().replace('/', ''));
        if (!q) {
          return new Response(JSON.stringify({ error: 'Asset not found' }), { status: 400 });
        }

        const newTrade: Trade = {
          id: `TRD-${Math.floor(100000 + Math.random() * 900000)}`,
          accountId,
          asset,
          direction,
          lotSize,
          entryPrice: q.price,
          currentPrice: q.price,
          createdAt: new Date().toISOString(),
          status: 'open',
          profitLoss: 0,
          stopLoss: stopLoss || undefined,
          takeProfit: takeProfit || undefined,
          orderType: 'market'
        };

        await setDoc(doc(db, 'trades', newTrade.id), newTrade);

        const logRef = doc(collection(db, 'accountLogs'));
        await setDoc(logRef, {
          id: logRef.id,
          accountId,
          message: `Position opened: ${direction.toUpperCase()} ${lotSize} Lots of ${asset} at ${q.price}`,
          type: 'info',
          timestamp: new Date().toISOString()
        });

        return new Response(JSON.stringify({ success: true, trade: newTrade }), { status: 200 });
      }

      // ----------------------------------------------------
      // POST /api/trades/:id/close
      // ----------------------------------------------------
      if (path.startsWith('/api/trades/') && path.endsWith('/close') && method === 'POST') {
        const tradeId = path.split('/')[3];
        const tradeRef = doc(db, 'trades', tradeId);
        const tradeSnap = await getDoc(tradeRef);

        if (tradeSnap.exists() && tradeSnap.data()?.status === 'open') {
          const trade = tradeSnap.data() as Trade;
          const exitPrice = trade.currentPrice || trade.entryPrice;

          await updateDoc(tradeRef, {
            status: 'closed',
            closedAt: new Date().toISOString(),
            exitPrice,
            reason: 'manual'
          });

          // Update balance
          const accSnap = await getDoc(doc(db, 'accounts', trade.accountId));
          if (accSnap.exists()) {
            const acc = accSnap.data() as Account;
            const finalProfit = trade.profitLoss || 0;
            const newBalance = parseFloat((acc.balance + finalProfit).toFixed(2));

            await updateDoc(doc(db, 'accounts', acc.id), {
              balance: newBalance,
              peakBalance: Math.max(acc.peakBalance, newBalance)
            });

            // Log
            const logRef = doc(collection(db, 'accountLogs'));
            await setDoc(logRef, {
              id: logRef.id,
              accountId: acc.id,
              message: `Position closed manually: ${trade.direction.toUpperCase()} ${trade.lotSize} Lots of ${trade.asset} at ${exitPrice}. Profit/Loss: $${finalProfit.toLocaleString()}`,
              type: finalProfit >= 0 ? 'success' : 'warning',
              timestamp: new Date().toISOString()
            });
          }

          const freshTradeSnap = await getDoc(tradeRef);
          return new Response(JSON.stringify({ success: true, trade: freshTradeSnap.data() }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: 'Trade not open or not found' }), { status: 400 });
      }

      // ----------------------------------------------------
      // POST /api/trades/:id/modify
      // ----------------------------------------------------
      if (path.startsWith('/api/trades/') && path.endsWith('/modify') && method === 'POST') {
        const tradeId = path.split('/')[3];
        const { stopLoss, takeProfit } = body;
        const tradeRef = doc(db, 'trades', tradeId);
        const tradeSnap = await getDoc(tradeRef);

        if (tradeSnap.exists() && tradeSnap.data()?.status === 'open') {
          await updateDoc(tradeRef, {
            stopLoss: stopLoss || null,
            takeProfit: takeProfit || null
          });

          const trade = tradeSnap.data() as Trade;
          const logRef = doc(collection(db, 'accountLogs'));
          await setDoc(logRef, {
            id: logRef.id,
            accountId: trade.accountId,
            message: `Position Modified: SL set to ${stopLoss || 'None'}, TP set to ${takeProfit || 'None'}`,
            type: 'info',
            timestamp: new Date().toISOString()
          });

          const freshTradeSnap = await getDoc(tradeRef);
          return new Response(JSON.stringify({ success: true, trade: freshTradeSnap.data() }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: 'Trade not found' }), { status: 404 });
      }

      // ----------------------------------------------------
      // POST /api/kyc/submit
      // ----------------------------------------------------
      if (path === '/api/kyc/submit' && method === 'POST') {
        const { userId, idType, idFile, selfieFile } = body;
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const updatedUser = {
            ...userSnap.data(),
            kycStatus: 'pending' as KycStatus,
            kycIdType: idType,
            kycIdFile: idFile,
            kycSelfieFile: selfieFile
          };
          await setDoc(userRef, updatedUser);
          return new Response(JSON.stringify({ success: true, user: updatedUser }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
      }

      // ----------------------------------------------------
      // POST /api/kyc/:id/approve
      // ----------------------------------------------------
      if (path.startsWith('/api/kyc/') && path.endsWith('/approve') && method === 'POST') {
        const userId = path.split('/')[3];
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          await updateDoc(userRef, { kycStatus: 'approved' });
          const freshSnap = await getDoc(userRef);
          return new Response(JSON.stringify({ success: true, user: freshSnap.data() }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
      }

      // ----------------------------------------------------
      // POST /api/kyc/:id/reject
      // ----------------------------------------------------
      if (path.startsWith('/api/kyc/') && path.endsWith('/reject') && method === 'POST') {
        const userId = path.split('/')[3];
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          await updateDoc(userRef, { kycStatus: 'rejected' });
          const freshSnap = await getDoc(userRef);
          return new Response(JSON.stringify({ success: true, user: freshSnap.data() }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
      }

      // ----------------------------------------------------
      // POST /api/payout/request
      // ----------------------------------------------------
      if (path === '/api/payout/request' && method === 'POST') {
        const { accountId, amount, paymentMethod, paymentDetails } = body;
        const accRef = doc(db, 'accounts', accountId);
        const accSnap = await getDoc(accRef);

        if (accSnap.exists()) {
          const acc = accSnap.data() as Account;

          // Deduct from account balance in Firestore
          const newBalance = parseFloat((acc.balance - amount).toFixed(2));
          await updateDoc(accRef, {
            balance: newBalance,
            startOfDayBalance: newBalance // Reset start of day relative to new payout balance
          });

          const payout: PayoutRequest = {
            id: `PAY-${Math.floor(100000 + Math.random() * 900000)}`,
            accountId,
            challengeName: acc.challengeName,
            userId: acc.userId,
            userName: acc.userName,
            userEmail: acc.userEmail,
            amount,
            method: paymentMethod,
            details: paymentDetails,
            status: 'pending',
            createdAt: new Date().toISOString()
          };

          await setDoc(doc(db, 'payoutRequests', payout.id), payout);

          // Log
          const logRef = doc(collection(db, 'accountLogs'));
          await setDoc(logRef, {
            id: logRef.id,
            accountId,
            message: `Payout requested for $${amount.toLocaleString()} via ${paymentMethod.toUpperCase()}. Status: Pending verification.`,
            type: 'info',
            timestamp: new Date().toISOString()
          });

          return new Response(JSON.stringify({ success: true, payout }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: 'Account not found' }), { status: 404 });
      }

      // ----------------------------------------------------
      // POST /api/payout/:id/update
      // ----------------------------------------------------
      if (path.startsWith('/api/payout/') && path.endsWith('/update') && method === 'POST') {
        const payId = path.split('/')[3];
        const { status } = body;
        const payoutRef = doc(db, 'payoutRequests', payId);
        const payoutSnap = await getDoc(payoutRef);

        if (payoutSnap.exists()) {
          const pay = payoutSnap.data() as PayoutRequest;
          await updateDoc(payoutRef, { status });

          if (status === 'approved') {
            const logRef = doc(collection(db, 'accountLogs'));
            await setDoc(logRef, {
              id: logRef.id,
              accountId: pay.accountId,
              message: `Payout Request of $${pay.amount.toLocaleString()} approved and processed successfully by admin.`,
              type: 'success',
              timestamp: new Date().toISOString()
            });
          } else if (status === 'rejected') {
            // Refund funds back to balance
            const accRef = doc(db, 'accounts', pay.accountId);
            const accSnap = await getDoc(accRef);
            if (accSnap.exists()) {
              const acc = accSnap.data() as Account;
              const newBalance = parseFloat((acc.balance + pay.amount).toFixed(2));
              await updateDoc(accRef, {
                balance: newBalance,
                startOfDayBalance: newBalance
              });

              const logRef = doc(collection(db, 'accountLogs'));
              await setDoc(logRef, {
                id: logRef.id,
                accountId: acc.id,
                message: `Payout Request of $${pay.amount.toLocaleString()} rejected by admin. Funds returned to balance.`,
                type: 'warning',
                timestamp: new Date().toISOString()
              });
            }
          }
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: 'Payout request not found' }), { status: 404 });
      }

      // ----------------------------------------------------
      // POST /api/admin/accounts/:id/update
      // ----------------------------------------------------
      if (path.startsWith('/api/admin/accounts/') && path.endsWith('/update') && method === 'POST') {
        const accId = path.split('/')[4];
        const { balance, status, phase, breachedReason } = body;
        const accRef = doc(db, 'accounts', accId);
        const accSnap = await getDoc(accRef);

        if (accSnap.exists()) {
          const acc = accSnap.data() as Account;
          const oldBal = acc.balance;

          const updateObj: any = {};
          if (balance !== undefined) {
            const newBal = parseFloat(balance);
            updateObj.balance = newBal;
            if (newBal !== oldBal) {
              updateObj.peakBalance = Math.max(acc.peakBalance, newBal);
              updateObj.startOfDayBalance = newBal;
            }
          }
          if (status !== undefined) updateObj.status = status;
          if (phase !== undefined) updateObj.phase = phase;
          if (breachedReason !== undefined) updateObj.breachedReason = breachedReason;

          await updateDoc(accRef, updateObj);

          // Log administrative override
          const logRef = doc(collection(db, 'accountLogs'));
          await setDoc(logRef, {
            id: logRef.id,
            accountId: acc.id,
            message: `Account credentials updated by administrative supervisor.`,
            type: 'info',
            timestamp: new Date().toISOString()
          });

          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: 'Account not found' }), { status: 404 });
      }

      // ----------------------------------------------------
      // POST /api/affiliates/click
      // ----------------------------------------------------
      if (path === '/api/affiliates/click' && method === 'POST') {
        const { referralCode } = body;
        if (referralCode) {
          const qSnap = await getDocs(query(collection(db, 'affiliateProfiles'), where('referralCode', '==', referralCode)));
          if (qSnap.docs.length > 0) {
            const prof = qSnap.docs[0].data() as AffiliateProfile;
            await updateDoc(doc(db, 'affiliateProfiles', prof.userId), {
              clicks: (prof.clicks || 0) + 1
            });
          }
        }
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      // ----------------------------------------------------
      // POST /api/affiliates/join
      // ----------------------------------------------------
      if (path === '/api/affiliates/join' && method === 'POST') {
        const { userId, referralCode } = body;
        const profRef = doc(db, 'affiliateProfiles', userId);
        const profSnap = await getDoc(profRef);

        if (profSnap.exists()) {
          return new Response(JSON.stringify({ success: true, profile: profSnap.data() }), { status: 200 });
        }

        const userSnap = await getDoc(doc(db, 'users', userId));
        const user = userSnap.exists() ? userSnap.data() : null;

        const newProfile: AffiliateProfile = {
          userId,
          userEmail: user?.email || '',
          userName: user?.name || 'Partner',
          referralCode: referralCode || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
          clicks: 0,
          createdAt: new Date().toISOString()
        };

        await setDoc(profRef, newProfile);
        return new Response(JSON.stringify({ success: true, profile: newProfile }), { status: 200 });
      }

      // ----------------------------------------------------
      // POST /api/affiliates/payouts
      // ----------------------------------------------------
      if (path === '/api/affiliates/payouts' && method === 'POST') {
        const { userId, paymentMethod, paymentDetails, amount } = body;
        const profSnap = await getDoc(doc(db, 'affiliateProfiles', userId));

        if (!profSnap.exists()) {
          return new Response(JSON.stringify({ error: 'Partner profile not found' }), { status: 400 });
        }

        const profile = profSnap.data() as AffiliateProfile;

        const newPayout: AffiliatePayoutRequest = {
          id: `APAY-${Math.floor(100000 + Math.random() * 900000)}`,
          affiliateUserId: profile.userId,
          userEmail: profile.userEmail,
          userName: profile.userName,
          amount,
          method: paymentMethod,
          details: paymentDetails,
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'affiliatePayoutRequests', newPayout.id), newPayout);
        return new Response(JSON.stringify({ success: true, payout: newPayout }), { status: 200 });
      }

      // ----------------------------------------------------
      // POST /api/admin/giveaway
      // ----------------------------------------------------
      if (path === '/api/admin/giveaway' && method === 'POST') {
        const { balance, type } = body;
        const accsSnap = await getDocs(collection(db, 'accounts'));

        for (const d of accsSnap.docs) {
          const acc = d.data() as Account;
          if (acc.status === 'active' && (type === 'all' || acc.type === type)) {
            const addAmt = parseFloat(balance);
            const newBal = parseFloat((acc.balance + addAmt).toFixed(2));

            await updateDoc(doc(db, 'accounts', acc.id), {
              balance: newBal,
              peakBalance: Math.max(acc.peakBalance, newBal),
              startOfDayBalance: newBal
            });

            // Log
            const logRef = doc(collection(db, 'accountLogs'));
            await setDoc(logRef, {
              id: logRef.id,
              accountId: acc.id,
              message: `Received administrative promotional credit of $${addAmt.toLocaleString()} directly into balance.`,
              type: 'success',
              timestamp: new Date().toISOString()
            });
          }
        }
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      // ----------------------------------------------------
      // POST /api/admin/bulk-email
      // ----------------------------------------------------
      if (path === '/api/admin/bulk-email' && method === 'POST') {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      // ----------------------------------------------------
      // POST /api/admin/credentials
      // ----------------------------------------------------
      if (path === '/api/admin/credentials' && method === 'POST') {
        const { email, password } = body;
        const credRef = doc(db, 'system', 'adminCredentials');
        const updateObj: any = {};
        if (email) updateObj.email = email;
        if (password) updateObj.password = password;

        await setDoc(credRef, updateObj, { merge: true });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      // ----------------------------------------------------
      // GET/POST/DELETE Coupons (Admin)
      // ----------------------------------------------------
      if (path === '/api/coupons' && method === 'POST') {
        const coupon = body as Coupon;
        await setDoc(doc(db, 'coupons', coupon.code), coupon);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      if (path.startsWith('/api/coupons/') && method === 'DELETE') {
        const code = decodeURIComponent(path.split('/')[3]);
        await deleteDoc(doc(db, 'coupons', code));
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      // ----------------------------------------------------
      // Affiliate Commission / Affiliate Payout Status Updates (Admin)
      // ----------------------------------------------------
      if (path.startsWith('/api/admin/affiliates/commissions/') && path.endsWith('/status') && method === 'POST') {
        const commId = path.split('/')[5];
        const { status } = body;
        await updateDoc(doc(db, 'commissions', commId), { status });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      if (path.startsWith('/api/admin/affiliates/payouts/') && path.endsWith('/status') && method === 'POST') {
        const payId = path.split('/')[5];
        const { status } = body;
        await updateDoc(doc(db, 'affiliatePayoutRequests', payId), { status });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      // ----------------------------------------------------
      // Save/Update user wallet address
      // ----------------------------------------------------
      if (path.startsWith('/api/users/') && path.endsWith('/wallet') && method === 'POST') {
        const userId = path.split('/')[3];
        const { payoutWalletAddress } = body;
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { payoutWalletAddress });
        const freshUserSnap = await getDoc(userRef);
        return new Response(JSON.stringify({ success: true, user: freshUserSnap.data() }), { status: 200 });
      }

      // ----------------------------------------------------
      // Default Fallback Response
      // ----------------------------------------------------
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (err: any) {
      console.error('[Firebase Router Error]', err);
      return new Response(JSON.stringify({ error: err.message || 'Internal Simulation Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };

  // Safe window.fetch override for iframe & sandbox compatibility
  try {
    window.fetch = myFetch;
  } catch (e) {
    Object.defineProperty(window, 'fetch', {
      value: myFetch,
      writable: true,
      configurable: true
    });
  }

  console.log('[Firebase API Router] Initialized perfectly. All backend operations redirected to Firestore.');
}
