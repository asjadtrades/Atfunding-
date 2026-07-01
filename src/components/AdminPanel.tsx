import React, { useState } from 'react';
import { 
  Users, CreditCard, Shield, ShieldAlert, BadgePercent, Check, X, 
  Trash2, ArrowRight, UserPlus, FileCheck, Power, RefreshCw, LogOut, Award,
  Activity
} from 'lucide-react';
import { User, Account, Order, Trade, Coupon, PayoutRequest, RuleViolation } from '../types';
import { COUPONS } from '../data';

interface AdminPanelProps {
  currentUser: User;
  onLogout: () => void;
  users: User[];
  accounts: Account[];
  orders: Order[];
  trades: Trade[];
  coupons: Coupon[];
  ruleViolations: RuleViolation[];
  onApproveOrder: (orderId: string) => void;
  onRejectOrder: (orderId: string) => void;
  onApproveKyc: (userId: string) => void;
  onRejectKyc: (userId: string) => void;
  onUpdateAccountStatus: (accountId: string, status: Account['status'], phase: Account['phase'], breachedReason?: string) => void;
  onAddCoupon: (coupon: Coupon) => void;
  onDeleteCoupon: (code: string) => void;
  onRefreshData: () => void;
  payoutRequests: PayoutRequest[];
  onUpdatePayoutStatus: (id: string, status: 'approved' | 'rejected') => void;
}

export default function AdminPanel({
  currentUser,
  onLogout,
  users,
  accounts,
  orders,
  trades,
  coupons,
  ruleViolations,
  onApproveOrder,
  onRejectOrder,
  onApproveKyc,
  onRejectKyc,
  onUpdateAccountStatus,
  onAddCoupon,
  onDeleteCoupon,
  onRefreshData,
  payoutRequests,
  onUpdatePayoutStatus
}: AdminPanelProps) {
  const [adminTab, setAdminTab] = useState<'orders' | 'accounts' | 'users' | 'coupons' | 'payouts' | 'violations' | 'settings'>('orders');
  const [selectedTraderId, setSelectedTraderId] = useState<string | null>(null);
  const [selectedAccountForDetails, setSelectedAccountForDetails] = useState<Account | null>(null);
  const [selectedKycUser, setSelectedKycUser] = useState<User | null>(null);
  const [customBreachReason, setCustomBreachReason] = useState('');
  
  // Admin credentials state
  const [adminEmailInput, setAdminEmailInput] = useState(currentUser.email);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');
  
  // Coupon forms
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState(10);
  const [newDesc, setNewDesc] = useState('');

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    onAddCoupon({
      code: newCode.toUpperCase().trim(),
      discountPercent: Number(newDiscount),
      description: newDesc
    });
    setNewCode('');
    setNewDesc('');
  };

  return (
    <div className="min-h-screen bg-[#05070B] text-gray-100 font-sans pb-20">
      {/* GLOW */}
      <div className="absolute top-0 left-10 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* ADMIN HEADER */}
      <header className="bg-[#0A0D14]/80 border-b border-gray-950 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <span className="font-sans font-bold text-black text-sm">AT</span>
              </div>
              <span className="font-sans text-xl font-bold tracking-wider text-white">
                AT<span className="text-amber-400">Admin</span>
              </span>
            </div>

            {/* Nav */}
            <nav className="flex gap-1">
              <button
                onClick={() => setAdminTab('orders')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all cursor-pointer ${adminTab === 'orders' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:text-white'}`}
              >
                Pending Orders ({orders.filter(o => o.status === 'pending').length})
              </button>
              <button
                onClick={() => setAdminTab('accounts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all cursor-pointer ${adminTab === 'accounts' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:text-white'}`}
              >
                Accounts ({accounts.length})
              </button>
              <button
                onClick={() => setAdminTab('users')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all cursor-pointer ${adminTab === 'users' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:text-white'}`}
              >
                Traders ({users.length})
              </button>
              <button
                onClick={() => setAdminTab('coupons')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all cursor-pointer ${adminTab === 'coupons' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:text-white'}`}
              >
                Coupons ({coupons.length})
              </button>
              <button
                onClick={() => setAdminTab('payouts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all cursor-pointer ${adminTab === 'payouts' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:text-white'}`}
              >
                Payout Requests ({payoutRequests.filter(p => p.status === 'pending').length})
              </button>
              <button
                onClick={() => setAdminTab('violations')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all cursor-pointer ${adminTab === 'violations' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:text-white'}`}
              >
                Rule Violations ({ruleViolations?.length || 0})
              </button>
              <button
                onClick={() => setAdminTab('settings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all cursor-pointer ${adminTab === 'settings' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:text-white'}`}
              >
                Settings
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefreshData}
              title="Force Refresh Data"
              className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white cursor-pointer active:rotate-180 transition-transform"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#0D1017] border border-gray-800 rounded-xl p-4">
            <p className="text-xxs font-mono text-gray-500 uppercase tracking-wider">TOTAL REVENUE (SIMULATED)</p>
            <p className="text-lg font-bold text-emerald-400 font-mono mt-1">
              ${orders.filter(o => o.status === 'approved').reduce((acc, curr) => acc + curr.finalPrice, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-[#0D1017] border border-gray-800 rounded-xl p-4">
            <p className="text-xxs font-mono text-gray-500 uppercase tracking-wider">ACTIVE CHALLENGES</p>
            <p className="text-lg font-bold text-white font-mono mt-1">
              {accounts.filter(a => a.status === 'active').length}
            </p>
          </div>
          <div className="bg-[#0D1017] border border-gray-800 rounded-xl p-4">
            <p className="text-xxs font-mono text-gray-500 uppercase tracking-wider">BREACHED RATIO</p>
            <p className="text-lg font-bold text-red-400 font-mono mt-1">
              {accounts.length ? Math.round((accounts.filter(a => a.status === 'breached').length / accounts.length) * 100) : 0}%
            </p>
          </div>
          <div className="bg-[#0D1017] border border-gray-800 rounded-xl p-4">
            <p className="text-xxs font-mono text-gray-500 uppercase tracking-wider">PENDING KYC AUDITS</p>
            <p className="text-lg font-bold text-amber-400 font-mono mt-1">
              {users.filter(u => u.kycStatus === 'pending').length}
            </p>
          </div>
        </div>

        {/* TAB: ORDERS */}
        {adminTab === 'orders' && (
          <div className="bg-[#0D1017] border border-gray-800 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Challenge Purchase Approvals</h2>
              <p className="text-xs text-gray-400 mt-1">Review pending customer payments. Approving registers and triggers the trading account instantly.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 font-mono uppercase text-xxs tracking-wider">
                    <th className="pb-3 pl-2">Order ID</th>
                    <th className="pb-3">Applicant</th>
                    <th className="pb-3">Challenge Type</th>
                    <th className="pb-3">Price</th>
                    <th className="pb-3">Discount</th>
                    <th className="pb-3">Final Amount</th>
                    <th className="pb-3">Transaction Details</th>
                    <th className="pb-3">Order Date</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-gray-500 font-mono">No purchase orders registered.</td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-900/30">
                        <td className="py-3 font-mono font-semibold text-white pl-2">
                          <button
                            onClick={() => {
                              const acc = accounts.find(a => a.id === order.accountId);
                              if (acc) {
                                setSelectedAccountForDetails(acc);
                              } else {
                                const tempAcc: Account = {
                                  id: order.accountId || `ACC-TEMP`,
                                  userId: order.userId,
                                  userEmail: order.userEmail,
                                  userName: order.userName,
                                  challengeConfigId: order.challengeConfigId,
                                  challengeName: order.challengeName,
                                  challengeSize: order.challengeSize,
                                  type: 'two_step',
                                  status: 'pending_payment',
                                  phase: 'phase1',
                                  balance: order.challengeSize,
                                  initialBalance: order.challengeSize,
                                  peakBalance: order.challengeSize,
                                  startOfDayBalance: order.challengeSize,
                                  dailyDrawdownLimitValue: order.challengeSize * 0.05,
                                  maxDrawdownLimitValue: order.challengeSize * 0.10,
                                  payoutSharePercent: 90,
                                  createdAt: order.createdAt
                                };
                                setSelectedAccountForDetails(tempAcc);
                              }
                            }}
                            className="text-amber-400 hover:underline cursor-pointer font-bold text-left"
                          >
                            {order.id}
                          </button>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => {
                              const acc = accounts.find(a => a.id === order.accountId);
                              if (acc) {
                                setSelectedAccountForDetails(acc);
                              } else {
                                const tempAcc: Account = {
                                  id: order.accountId || `ACC-TEMP`,
                                  userId: order.userId,
                                  userEmail: order.userEmail,
                                  userName: order.userName,
                                  challengeConfigId: order.challengeConfigId,
                                  challengeName: order.challengeName,
                                  challengeSize: order.challengeSize,
                                  type: 'two_step',
                                  status: 'pending_payment',
                                  phase: 'phase1',
                                  balance: order.challengeSize,
                                  initialBalance: order.challengeSize,
                                  peakBalance: order.challengeSize,
                                  startOfDayBalance: order.challengeSize,
                                  dailyDrawdownLimitValue: order.challengeSize * 0.05,
                                  maxDrawdownLimitValue: order.challengeSize * 0.10,
                                  payoutSharePercent: 90,
                                  createdAt: order.createdAt
                                };
                                setSelectedAccountForDetails(tempAcc);
                              }
                            }}
                            className="font-semibold text-gray-200 hover:text-amber-400 transition-colors text-left block"
                          >
                            {order.userName}
                          </button>
                          <p className="text-xxs text-gray-500 font-mono">{order.userEmail}</p>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => {
                              const acc = accounts.find(a => a.id === order.accountId);
                              if (acc) {
                                setSelectedAccountForDetails(acc);
                              } else {
                                const tempAcc: Account = {
                                  id: order.accountId || `ACC-TEMP`,
                                  userId: order.userId,
                                  userEmail: order.userEmail,
                                  userName: order.userName,
                                  challengeConfigId: order.challengeConfigId,
                                  challengeName: order.challengeName,
                                  challengeSize: order.challengeSize,
                                  type: 'two_step',
                                  status: 'pending_payment',
                                  phase: 'phase1',
                                  balance: order.challengeSize,
                                  initialBalance: order.challengeSize,
                                  peakBalance: order.challengeSize,
                                  startOfDayBalance: order.challengeSize,
                                  dailyDrawdownLimitValue: order.challengeSize * 0.05,
                                  maxDrawdownLimitValue: order.challengeSize * 0.10,
                                  payoutSharePercent: 90,
                                  createdAt: order.createdAt
                                };
                                setSelectedAccountForDetails(tempAcc);
                              }
                            }}
                            className="text-gray-300 font-medium hover:text-amber-400 transition-colors text-left block"
                          >
                            {order.challengeName}
                          </button>
                          <p className="text-[10px] text-gray-500 font-mono">SIZE: ${order.challengeSize.toLocaleString()}</p>
                        </td>
                        <td className="py-3 text-gray-400 font-mono">${order.amount}</td>
                        <td className="py-3 text-emerald-500 font-mono">-${order.discount} {order.couponUsed ? `(${order.couponUsed})` : ''}</td>
                        <td className="py-3 font-bold text-amber-400 font-mono">${order.finalPrice}</td>
                        <td className="py-3">
                          <div className="space-y-1 font-mono text-[10.5px]">
                            <div className="flex gap-1 items-center">
                              <span className="text-gray-500">Hash/ID:</span>
                              <span className="text-amber-300 font-semibold break-all max-w-[140px] inline-block">
                                {order.transactionId || 'None'}
                              </span>
                            </div>
                            {order.recipientAddress && (
                              <div className="flex gap-1 items-center">
                                <span className="text-gray-500">To:</span>
                                <span className="text-gray-400 truncate max-w-[140px] inline-block" title={order.recipientAddress}>
                                  {order.recipientAddress}
                                </span>
                              </div>
                            )}
                            {order.screenshotUrl && (
                              <div className="mt-1 flex items-center gap-1">
                                <span className="text-gray-500">Receipt:</span>
                                <a 
                                  href={order.screenshotUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-block hover:opacity-80 transition-opacity border border-gray-800 rounded bg-black"
                                >
                                  <img 
                                    src={order.screenshotUrl} 
                                    alt="Receipt" 
                                    className="h-8 w-12 object-cover rounded"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </a>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-gray-500 font-mono">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded font-semibold text-xxs font-mono ${
                            order.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                            order.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {order.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 text-right pr-2">
                          {order.status === 'pending' ? (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => onApproveOrder(order.id)}
                                className="bg-emerald-500 hover:opacity-90 text-black px-2 py-1 rounded text-xxs font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => onRejectOrder(order.id)}
                                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1 rounded text-xxs font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xxs text-gray-600 font-mono">PROCESSED</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: ACCOUNTS */}
        {adminTab === 'accounts' && (
          <div className="bg-[#0D1017] border border-gray-800 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Active Prop Portfolio Audit</h2>
              <p className="text-xs text-gray-400 mt-1">Inspect, manage, suspend, or promote trading account evaluation phases manually.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 font-mono uppercase text-xxs tracking-wider">
                    <th className="pb-3 pl-2">Account ID</th>
                    <th className="pb-3">Trader</th>
                    <th className="pb-3">Plan Info</th>
                    <th className="pb-3">Balance / Initial</th>
                    <th className="pb-3">Current Phase</th>
                    <th className="pb-3">Risk Limits</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Change State (Override)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900">
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-gray-500 font-mono">No accounts registered.</td>
                    </tr>
                  ) : (
                    accounts.map((account) => {
                      const netPL = account.balance - account.initialBalance;
                      return (
                        <tr key={account.id} className="hover:bg-gray-900/30">
                          <td className="py-3 font-mono font-semibold text-white pl-2">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setSelectedAccountForDetails(account)}
                                className="text-amber-400 hover:underline font-bold font-mono text-left cursor-pointer"
                              >
                                {account.id}
                              </button>
                              {account.flaggedForReview && (
                                <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-mono text-[8px] uppercase tracking-wider font-bold animate-pulse">
                                  ⚠️ Admin Review
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-gray-500 font-mono">{account.type.toUpperCase()}</p>
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => setSelectedAccountForDetails(account)}
                              className="font-semibold text-gray-200 hover:text-amber-400 transition-colors text-left cursor-pointer block"
                            >
                              {account.userName}
                            </button>
                            <p className="text-xxs text-gray-500 font-mono">{account.userEmail}</p>
                            {account.flaggedForReview && account.reviewReason && (
                              <p className="text-[10px] text-amber-500 font-mono mt-1 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 max-w-xs break-words">
                                {account.reviewReason}
                              </p>
                            )}
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => setSelectedAccountForDetails(account)}
                              className="text-gray-300 font-medium hover:text-amber-400 transition-colors text-left cursor-pointer block"
                            >
                              {account.challengeName}
                            </button>
                            <p className="text-[10px] text-gray-500 font-mono">SIZE: ${account.challengeSize.toLocaleString()}</p>
                          </td>
                          <td className="py-3">
                            <p className="font-bold font-mono text-white">${account.balance.toLocaleString()}</p>
                            <p className={`text-[10px] font-mono ${netPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {netPL >= 0 ? '+' : ''}{netPL.toLocaleString()} ({Math.round((netPL/account.initialBalance)*100)}%)
                            </p>
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[10px] uppercase font-bold">
                              {account.phase}
                            </span>
                          </td>
                          <td className="py-3 text-gray-400 font-mono">
                            <p className="text-xxs">Daily: -${account.dailyDrawdownLimitValue.toLocaleString()}</p>
                            <p className="text-xxs text-red-500/80">Max: -${account.maxDrawdownLimitValue.toLocaleString()}</p>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded font-semibold text-xxs font-mono ${
                              account.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                              account.status === 'pending_payment' ? 'bg-amber-500/10 text-amber-400' :
                              account.status === 'breached' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                            }`}>
                              {account.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 text-right pr-2">
                            <div className="flex gap-1.5 justify-end">
                              {/* Trigger actions to let admin simulate anything */}
                              {account.phase === 'phase1' && (
                                <button
                                  onClick={() => onUpdateAccountStatus(account.id, 'passed_phase1', 'phase2')}
                                  className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-2 py-1 rounded text-xxs font-medium cursor-pointer"
                                  title="Simulate Phase 1 Success"
                                >
                                  Pass P1
                                </button>
                              )}
                              {account.phase === 'phase2' && (
                                <button
                                  onClick={() => onUpdateAccountStatus(account.id, 'passed_phase2', 'funded')}
                                  className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-2 py-1 rounded text-xxs font-medium cursor-pointer"
                                  title="Simulate Phase 2 Success"
                                >
                                  Fund account
                                </button>
                              )}
                              {account.status === 'pending_payment' && (
                                <button
                                  onClick={() => onUpdateAccountStatus(account.id, 'active', account.phase)}
                                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-2 py-1 rounded text-xxs font-bold cursor-pointer"
                                  title="Activate Account"
                                >
                                  Activate
                                </button>
                              )}
                              {account.status !== 'breached' && account.status !== 'pending_payment' ? (
                                <button
                                  onClick={() => onUpdateAccountStatus(account.id, 'breached', account.phase)}
                                  className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-2 py-1 rounded text-xxs font-medium cursor-pointer"
                                  title="Manually Breached"
                                >
                                  Breach Account
                                </button>
                              ) : account.status === 'breached' ? (
                                <button
                                  onClick={() => onUpdateAccountStatus(account.id, 'active', account.phase)}
                                  className="bg-emerald-500 hover:opacity-90 text-black px-2 py-1 rounded text-xxs font-bold cursor-pointer"
                                  title="Restore Account"
                                >
                                  Restore Account
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: USERS */}
        {adminTab === 'users' && (
          <div className="bg-[#0D1017] border border-gray-800 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Registered Trader Accounts & KYC Review</h2>
              <p className="text-xs text-gray-400 mt-1">Review active users. Manage manual government ID compliance workflows here.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 font-mono uppercase text-xxs tracking-wider">
                    <th className="pb-3 pl-2">Name</th>
                    <th className="pb-3">Email Address</th>
                    <th className="pb-3 text-center">Accounts</th>
                    <th className="pb-3">Permission Level</th>
                    <th className="pb-3">KYC Compliance</th>
                    <th className="pb-3">Registration Date</th>
                    <th className="pb-3 text-right pr-2">KYC Management Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900">
                  {users.map((user) => {
                    const userAccountsCount = accounts.filter(a => a.userId === user.id).length;
                    return (
                      <tr key={user.id} className="hover:bg-gray-900/30">
                        <td className="py-3 font-semibold text-white pl-2">{user.name}</td>
                        <td className="py-3 font-mono text-gray-300">{user.email}</td>
                        <td className="py-3 text-center font-bold text-amber-500 font-mono">
                          {userAccountsCount}
                        </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded font-semibold text-xxs font-mono ${
                          user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-gray-800 text-gray-400'
                        }`}>
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded font-semibold text-xxs font-mono ${
                            user.kycStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                            user.kycStatus === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-gray-800 text-gray-400'
                          }`}>
                            {user.kycStatus.toUpperCase()}
                          </span>
                          {user.kycStatus !== 'none' && (
                            <button
                              onClick={() => setSelectedKycUser(user)}
                              className="text-xxs text-amber-500 hover:underline font-bold cursor-pointer"
                            >
                              Review Photos
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-gray-500 font-mono">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 text-right pr-2">
                        {user.kycStatus === 'pending' ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => onApproveKyc(user.id)}
                              className="bg-emerald-500 hover:opacity-90 text-black px-2 py-1 rounded text-xxs font-bold flex items-center gap-0.5 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve ID</span>
                            </button>
                            <button
                              onClick={() => onRejectKyc(user.id)}
                              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1 rounded text-xxs font-bold flex items-center gap-0.5 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject ID</span>
                            </button>
                          </div>
                        ) : user.kycStatus === 'approved' ? (
                          <span className="text-xxs text-emerald-400 font-mono">APPROVED</span>
                        ) : (
                          <button
                            onClick={() => onApproveKyc(user.id)}
                            className="bg-gray-800 text-gray-400 hover:text-white px-2 py-1 rounded text-xxs font-medium cursor-pointer"
                          >
                            Force Verify
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: COUPONS */}
        {adminTab === 'coupons' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Create Coupon form */}
            <div className="bg-[#0D1017] border border-gray-800 rounded-xl p-6 h-fit space-y-4">
              <h3 className="font-bold text-white text-base">Register Promotion Code</h3>
              <p className="text-xs text-gray-400 leading-normal">Generate custom prop discounts to run sandbox promotions.</p>

              <form onSubmit={handleCreateCoupon} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase tracking-wider text-gray-400">Coupon Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ALPHA90"
                    className="w-full bg-[#111622] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-amber-500"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase tracking-wider text-gray-400">Discount Percent (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    className="w-full bg-[#111622] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase tracking-wider text-gray-400">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Limited Summer 30% discount"
                    className="w-full bg-[#111622] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-black py-2 rounded-lg text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  Create Coupon Code
                </button>
              </form>
            </div>

            {/* List Coupons */}
            <div className="bg-[#0D1017] border border-gray-800 rounded-xl p-6 lg:col-span-2 space-y-4">
              <h3 className="font-bold text-white text-base">Active Discount Coupons</h3>
              <p className="text-xs text-gray-400 leading-normal">Active codes that users can apply in checkout.</p>

              <div className="space-y-2">
                {coupons.map((coupon) => (
                  <div 
                    key={coupon.code}
                    className="bg-[#111622]/40 border border-gray-900 rounded-lg p-3 flex justify-between items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-xs">
                          {coupon.code}
                        </span>
                        <span className="text-emerald-400 font-mono text-xs font-semibold">-{coupon.discountPercent}%</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{coupon.description}</p>
                    </div>
                    
                    <button
                      onClick={() => onDeleteCoupon(coupon.code)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                      title="Revoke Coupon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'payouts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Trader Payout Approvals</h2>
                <p className="text-xs text-gray-400">Review, audit, and disburse proprietary trading profits within required bounds ($25 - $400).</p>
              </div>
              <div className="bg-[#111622] px-3 py-1.5 rounded-lg border border-gray-900 font-mono text-xs flex gap-4">
                <span>PENDING: <strong className="text-amber-400">{payoutRequests.filter(p => p.status === 'pending').length}</strong></span>
                <span>TOTAL DISBURSED: <strong className="text-emerald-400">${payoutRequests.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</strong></span>
              </div>
            </div>

            <div className="bg-[#0D1017] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800/80 bg-gray-950/40 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                      <th className="py-3 px-4">Request Date</th>
                      <th className="py-3 px-4">Trader</th>
                      <th className="py-3 px-4">Account ID</th>
                      <th className="py-3 px-4">Program</th>
                      <th className="py-3 px-4">Requested Amount</th>
                      <th className="py-3 px-4">Payout Method</th>
                      <th className="py-3 px-4">Destination Info</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900/60 text-xs">
                    {payoutRequests.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-gray-500 font-mono">No payout requests registered.</td>
                      </tr>
                    ) : (
                      payoutRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-950/20 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-gray-500 whitespace-nowrap">
                            {new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-white">{req.userName}</p>
                            <p className="text-[10px] text-gray-500 font-mono">{req.userEmail}</p>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-white font-semibold">
                            {req.accountId}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-gray-400">
                            {req.challengeName}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                            ${req.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 uppercase font-mono text-amber-500 font-bold">
                            {req.method}
                          </td>
                          <td className="py-3.5 px-4 max-w-xs truncate" title={req.details}>
                            <span className="font-mono text-[11px] text-gray-400 bg-black/30 px-2 py-1 rounded border border-gray-900 block overflow-hidden text-ellipsis">
                              {req.details}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                                req.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {req.status === 'pending' ? (
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  onClick={() => {
                                    if (confirm(`Approve payout request of $${req.amount.toLocaleString()} for ${req.userName}? Balance will be deducted.`)) {
                                      onUpdatePayoutStatus(req.id, 'approved');
                                    }
                                  }}
                                  className="p-1 px-2 rounded bg-emerald-500 text-black text-[10px] font-bold hover:bg-emerald-400 transition-colors cursor-pointer flex items-center gap-0.5"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Reject payout request of $${req.amount.toLocaleString()} for ${req.userName}?`)) {
                                      onUpdatePayoutStatus(req.id, 'rejected');
                                    }
                                  }}
                                  className="p-1 px-2 rounded bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-0.5"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-600 font-mono italic">
                                Audited
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {adminTab === 'violations' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {selectedTraderId ? (
              // DETAIL VIEW FOR SELECTED TRADER
              (() => {
                const trader = users.find(u => u.id === selectedTraderId);
                if (!trader) return <p className="text-gray-400">Trader not found.</p>;
                
                const traderAccounts = accounts.filter(a => a.userId === trader.id);
                const traderAccountIds = traderAccounts.map(a => a.id);
                const traderViolations = (ruleViolations || []).filter(v => v.userId === trader.id);
                const traderTrades = trades.filter(t => traderAccountIds.includes(t.accountId));

                return (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setSelectedTraderId(null)}
                        className="px-3.5 py-1.5 rounded-lg bg-gray-950 border border-gray-800 hover:text-white text-gray-400 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors animate-pulse"
                      >
                        &larr; Back to All Violations
                      </button>
                      <h2 className="text-lg font-bold text-white font-sans">
                        Trader Risk & Violation Audit
                      </h2>
                    </div>

                    {/* Trader Profile Card */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#0D1017] border border-gray-800 rounded-2xl p-5 animate-in slide-in-from-top-4 duration-300">
                      <div>
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Full Name</span>
                        <span className="text-sm font-bold text-white mt-1 block">{trader.name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Email Address</span>
                        <span className="text-sm font-semibold text-gray-300 mt-1 block font-mono">{trader.email}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">WhatsApp Number</span>
                        <span className="text-sm font-semibold text-amber-400 mt-1 block font-mono">
                          {trader.whatsapp || 'Not Provided'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Total Risk Warning Events</span>
                        <span className="text-sm font-bold text-red-400 mt-1 block font-mono">{traderViolations.length} Warnings</span>
                      </div>
                    </div>

                    {/* Accounts Table */}
                    <div className="bg-[#0D1017] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl">
                      <h3 className="text-sm font-bold text-white">Associated Evaluator Accounts</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-gray-800/80 text-gray-500 font-mono text-xxs uppercase tracking-wider">
                              <th className="pb-2.5">Account ID</th>
                              <th className="pb-2.5">Challenge Tier</th>
                              <th className="pb-2.5">Current Balance</th>
                              <th className="pb-2.5">Equity</th>
                              <th className="pb-2.5">Warnings</th>
                              <th className="pb-2.5">Status</th>
                              <th className="pb-2.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-900/60 font-sans">
                            {traderAccounts.map(acc => (
                              <tr key={acc.id} className="hover:bg-gray-950/20">
                                <td className="py-3 font-mono font-bold text-white">{acc.id}</td>
                                <td className="py-3 font-mono text-gray-300">
                                  {acc.challengeName} (${acc.challengeSize?.toLocaleString()})
                                </td>
                                <td className="py-3 font-mono font-semibold text-emerald-400">
                                  ${acc.balance?.toLocaleString()}
                                </td>
                                <td className="py-3 font-mono text-gray-400">
                                  ${acc.balance?.toLocaleString()}
                                </td>
                                <td className="py-3 font-mono text-amber-400 font-semibold">
                                  {acc.warningsCount || 0}
                                </td>
                                <td className="py-3">
                                  <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                                    acc.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                    acc.status === 'suspended' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                    acc.status === 'breached' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                    'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                  }`}>
                                    {acc.status}
                                  </span>
                                </td>
                                <td className="py-3 text-right">
                                  <div className="flex gap-1.5 justify-end">
                                    {acc.status !== 'breached' && (
                                      <button
                                        onClick={() => onUpdateAccountStatus(acc.id, 'breached', acc.phase)}
                                        className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-2 py-1 rounded text-xxs font-medium cursor-pointer"
                                      >
                                        Breach
                                      </button>
                                    )}
                                    {acc.status !== 'suspended' && acc.status !== 'breached' && (
                                      <button
                                        onClick={() => onUpdateAccountStatus(acc.id, 'suspended', acc.phase)}
                                        className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 px-2 py-1 rounded text-xxs font-medium cursor-pointer"
                                      >
                                        Suspend
                                      </button>
                                    )}
                                    {(acc.status === 'suspended' || acc.status === 'breached') && (
                                      <button
                                        onClick={() => onUpdateAccountStatus(acc.id, 'active', acc.phase)}
                                        className="bg-emerald-500 hover:opacity-90 text-black px-2 py-1 rounded text-xxs font-bold cursor-pointer"
                                      >
                                        Restore
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Violation History for this Trader */}
                    <div className="bg-[#0D1017] border border-gray-800 rounded-2xl p-5 space-y-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        Complete Violation History ({traderViolations.length})
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-gray-800/80 text-gray-500 font-mono text-xxs uppercase tracking-wider">
                              <th className="pb-2.5">Date & Time</th>
                              <th className="pb-2.5">Account ID</th>
                              <th className="pb-2.5">Violated Rule</th>
                              <th className="pb-2.5">Drawdown / Violation Value</th>
                              <th className="pb-2.5">Current Balance</th>
                              <th className="pb-2.5">Current Equity</th>
                              <th className="pb-2.5">Symbol</th>
                              <th className="pb-2.5">Trade ID</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-900/60 font-sans">
                            {traderViolations.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-6 text-center text-gray-500 font-mono">No risk violations on record.</td>
                              </tr>
                            ) : (
                              traderViolations.map(viol => (
                                <tr key={viol.id} className="hover:bg-gray-950/20 text-gray-300 animate-in fade-in">
                                  <td className="py-3 font-mono text-gray-500">
                                    {viol.date} {viol.time}
                                  </td>
                                  <td className="py-3 font-mono text-white">{viol.accountId}</td>
                                  <td className="py-3 font-semibold text-amber-400">{viol.violatedRule}</td>
                                  <td className="py-3 font-mono text-red-400 font-bold">
                                    {viol.violatedRule === 'Consistency Rule' ? `${viol.drawdown.toFixed(1)}%` : `$${viol.drawdown?.toLocaleString()}`}
                                  </td>
                                  <td className="py-3 font-mono">${viol.currentBalance?.toLocaleString()}</td>
                                  <td className="py-3 font-mono">${viol.currentEquity?.toLocaleString()}</td>
                                  <td className="py-3 font-mono">{viol.symbol || 'N/A'}</td>
                                  <td className="py-3 font-mono text-amber-500">{viol.tradeId || 'N/A'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Trade History for this Trader */}
                    <div className="bg-[#0D1017] border border-gray-800 rounded-2xl p-5 space-y-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-400" />
                        Complete Trade History ({traderTrades.length})
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-gray-800/80 text-gray-500 font-mono text-xxs uppercase tracking-wider">
                              <th className="pb-2.5">Trade ID</th>
                              <th className="pb-2.5">Account ID</th>
                              <th className="pb-2.5">Asset</th>
                              <th className="pb-2.5">Direction</th>
                              <th className="pb-2.5">Lots</th>
                              <th className="pb-2.5">Entry Price</th>
                              <th className="pb-2.5">Exit Price</th>
                              <th className="pb-2.5">P&L</th>
                              <th className="pb-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-900/60 font-sans">
                            {traderTrades.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="py-6 text-center text-gray-500 font-mono">No trades executed.</td>
                              </tr>
                            ) : (
                              traderTrades.map(trade => (
                                <tr key={trade.id} className="hover:bg-gray-950/20 text-gray-300 animate-in fade-in">
                                  <td className="py-3 font-mono text-white">{trade.id}</td>
                                  <td className="py-3 font-mono text-gray-400">{trade.accountId}</td>
                                  <td className="py-3 font-mono font-bold text-white">{trade.asset}</td>
                                  <td className="py-3 font-semibold whitespace-nowrap">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${trade.direction === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                      {trade.direction}
                                    </span>
                                  </td>
                                  <td className="py-3 font-mono">{trade.lotSize}</td>
                                  <td className="py-3 font-mono">${trade.entryPrice?.toFixed(2)}</td>
                                  <td className="py-3 font-mono">${trade.exitPrice ? trade.exitPrice.toFixed(2) : 'Open'}</td>
                                  <td className="py-3 font-mono font-bold">
                                    {trade.status === 'open' ? (
                                      <span className="text-gray-400">Floating</span>
                                    ) : (
                                      <span className={trade.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                        ${trade.profitLoss >= 0 ? '+' : ''}{trade.profitLoss?.toFixed(2)}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 uppercase font-mono text-xxs font-bold">
                                    <span className={`px-1.5 py-0.5 rounded ${trade.status === 'open' ? 'text-amber-400 bg-amber-500/10' : 'text-gray-400 bg-gray-500/10'}`}>
                                      {trade.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                );
              })()
            ) : (
              // MAIN MASTER VIOLATIONS LIST
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Rule Violations Monitoring Hub</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Continuous real-time audit of risk breaches across active accounts. Click a trader's name to view their complete profile, violation details, and transaction history.
                  </p>
                </div>

                <div className="bg-[#0D1017] border border-gray-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-sans">
                      <thead>
                        <tr className="border-b border-gray-800/80 bg-gray-950/40 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                          <th className="py-3.5 px-4">Date & Time</th>
                          <th className="py-3.5 px-4">Trader Name</th>
                          <th className="py-3.5 px-4">Email</th>
                          <th className="py-3.5 px-4">WhatsApp Contact</th>
                          <th className="py-3.5 px-4">Account Size</th>
                          <th className="py-3.5 px-4">Rule Violated</th>
                          <th className="py-3.5 px-4 text-center">Prev Warnings</th>
                          <th className="py-3.5 px-4">Current Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-900/60 text-xs text-gray-300">
                        {(ruleViolations || []).length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-gray-500 font-mono">
                              No rule violations recorded. Excellent trader risk performance!
                            </td>
                          </tr>
                        ) : (
                          ruleViolations.map((viol) => {
                            const trader = users.find(u => u.id === viol.userId);
                            const account = accounts.find(a => a.id === viol.accountId);
                            const prevWarnings = account ? (account.warningsCount || 0) : 0;

                            return (
                              <tr key={viol.id} className="hover:bg-gray-950/20 transition-colors">
                                <td className="py-3.5 px-4 font-mono text-gray-500 whitespace-nowrap">
                                  {viol.date} <span className="text-gray-600">{viol.time}</span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <button
                                    onClick={() => trader && setSelectedTraderId(trader.id)}
                                    className="font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer text-left"
                                  >
                                    {trader?.name || 'Unknown User'}
                                  </button>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-gray-400">
                                  {trader?.email || 'N/A'}
                                </td>
                                <td className="py-3.5 px-4 font-mono text-amber-500/80">
                                  {trader?.whatsapp || 'Not Provided'}
                                </td>
                                <td className="py-3.5 px-4 font-mono text-white">
                                  {account ? `$${account.challengeSize?.toLocaleString()}` : 'N/A'}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                    {viol.violatedRule}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-center font-semibold text-gray-400">
                                  {prevWarnings}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                                    account?.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                    account?.status === 'suspended' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                    account?.status === 'breached' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                    'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                  }`}>
                                    {account?.status || 'N/A'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    onClick={() => trader && setSelectedTraderId(trader.id)}
                                    className="px-2 py-1 rounded bg-gray-900 border border-gray-800 hover:border-gray-700 hover:text-white transition-all text-[11px] cursor-pointer"
                                  >
                                    Inspect Details
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {adminTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#0D1017] border border-gray-800 rounded-2xl p-6 max-w-lg mx-auto">
              <h3 className="text-lg font-sans font-medium text-white mb-1">Update Admin Credentials</h3>
              <p className="text-xs text-gray-400 mb-6 font-mono uppercase tracking-wider">Change the master administrator email & password</p>

              {settingsError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg mb-4">
                  {settingsError}
                </div>
              )}

              {settingsSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-lg mb-4">
                  {settingsSuccess}
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                setSettingsError('');
                setSettingsSuccess('');
                if (!adminEmailInput.trim() || !adminPasswordInput.trim()) {
                  setSettingsError('Please fill in both email and password.');
                  return;
                }
                setSettingsLoading(true);
                try {
                  const response = await fetch('/api/admin/credentials', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: adminEmailInput, password: adminPasswordInput })
                  });
                  const data = await response.json();
                  if (!response.ok) {
                    setSettingsError(data.error || 'Failed to update credentials.');
                  } else {
                    setSettingsSuccess('Admin credentials updated successfully! Note: Use these credentials next time you log in.');
                    setAdminPasswordInput('');
                    onRefreshData(); // sync State
                  }
                } catch (err) {
                  setSettingsError('Connection error.');
                } finally {
                  setSettingsLoading(false);
                }
              }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase tracking-wider text-gray-400">Admin Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-black/40 border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 text-white animate-none"
                    value={adminEmailInput}
                    onChange={(e) => setAdminEmailInput(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase tracking-wider text-gray-400">New Admin Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 text-white animate-none"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-medium py-2.5 rounded-lg text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10 disabled:opacity-50"
                >
                  {settingsLoading ? 'Saving...' : 'Save Admin Credentials'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ACCOUNT DETAILS MODAL */}
        {selectedAccountForDetails && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#0D1017] border border-gray-800 rounded-2xl p-6 max-w-4xl w-full relative max-h-[90vh] overflow-y-auto shadow-2xl">
              <button
                onClick={() => setSelectedAccountForDetails(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-gray-800/50"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                      {selectedAccountForDetails.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`text-xs font-mono uppercase px-2 py-0.5 rounded font-bold ${
                      selectedAccountForDetails.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      selectedAccountForDetails.status === 'pending_payment' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                      selectedAccountForDetails.status === 'breached' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {selectedAccountForDetails.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {selectedAccountForDetails.challengeName}
                    <span className="text-xs font-mono text-gray-500">({selectedAccountForDetails.id})</span>
                  </h3>
                </div>

                <div className="flex gap-2">
                  {selectedAccountForDetails.status === 'pending_payment' && (
                    <button
                      onClick={() => {
                        const ord = orders.find(o => o.accountId === selectedAccountForDetails.id || (o.userId === selectedAccountForDetails.userId && o.challengeConfigId === selectedAccountForDetails.challengeConfigId));
                        if (ord) {
                          onApproveOrder(ord.id);
                          setSelectedAccountForDetails({ ...selectedAccountForDetails, status: 'active' });
                          alert(`Account ${selectedAccountForDetails.id} activated and corresponding order approved!`);
                        } else {
                          onUpdateAccountStatus(selectedAccountForDetails.id, 'active', selectedAccountForDetails.phase);
                          setSelectedAccountForDetails({ ...selectedAccountForDetails, status: 'active' });
                          alert(`Account ${selectedAccountForDetails.id} state updated to ACTIVE.`);
                        }
                      }}
                      className="bg-emerald-500 hover:opacity-90 text-black px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve & Activate</span>
                    </button>
                  )}
                  {selectedAccountForDetails.status !== 'breached' && selectedAccountForDetails.status !== 'pending_payment' ? (
                    <div className="flex items-center gap-2 bg-[#1A1F2C]/30 p-2 rounded-lg border border-red-500/15 max-w-md">
                      <input
                        type="text"
                        placeholder="Enter breach reason (e.g., Daily drawdown breach)..."
                        value={customBreachReason}
                        onChange={(e) => setCustomBreachReason(e.target.value)}
                        className="bg-[#0D1017] border border-gray-800 rounded px-2.5 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/40 w-64"
                      />
                      <button
                        onClick={() => {
                          const reason = customBreachReason.trim() || 'Administrator Manual Breach';
                          onUpdateAccountStatus(selectedAccountForDetails.id, 'breached', selectedAccountForDetails.phase, reason);
                          setSelectedAccountForDetails({ ...selectedAccountForDetails, status: 'breached', breachedReason: reason });
                          setCustomBreachReason('');
                        }}
                        className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Breach Account
                      </button>
                    </div>
                  ) : selectedAccountForDetails.status === 'breached' ? (
                    <button
                      onClick={() => {
                        onUpdateAccountStatus(selectedAccountForDetails.id, 'active', selectedAccountForDetails.phase);
                        setSelectedAccountForDetails({ ...selectedAccountForDetails, status: 'active' });
                      }}
                      className="bg-emerald-500 hover:opacity-90 text-black px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Restore Account
                    </button>
                  ) : null}
                </div>
              </div>

              {/* TWO COLUMN GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* COLUMN 1: CLIENT AND ORDER DETAILS */}
                <div className="space-y-6">
                  {/* TRADER INFO */}
                  <div className="bg-[#111622]/40 border border-gray-800 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-mono uppercase text-amber-500 tracking-wider font-bold">Trader Contact Information</h4>
                    
                    {(() => {
                      const matchedOrder = orders.find(o => o.accountId === selectedAccountForDetails.id || (o.userId === selectedAccountForDetails.userId && o.challengeConfigId === selectedAccountForDetails.challengeConfigId));
                      const traderProfile = users.find(u => u.id === selectedAccountForDetails.userId);
                      const emailStr = selectedAccountForDetails.userEmail || traderProfile?.email || 'N/A';
                      const phoneStr = matchedOrder?.phoneNumber || traderProfile?.whatsapp || 'N/A';
                      const nameStr = selectedAccountForDetails.userName || traderProfile?.name || matchedOrder?.userName || 'N/A';
                      const surnameStr = matchedOrder?.surname || '';
                      const fullLocation = [matchedOrder?.city, matchedOrder?.country].filter(Boolean).join(', ') || 'N/A';

                      return (
                        <div className="space-y-2 text-sm text-gray-300 font-sans">
                          <div className="flex justify-between border-b border-gray-900 pb-1.5">
                            <span className="text-gray-500">Full Name:</span>
                            <span className="font-semibold text-white">{nameStr} {surnameStr}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-900 pb-1.5">
                            <span className="text-gray-500">Login/Signup Email:</span>
                            <span className="font-mono text-white">{emailStr}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-900 pb-1.5">
                            <span className="text-gray-500">Contact Number:</span>
                            <span className="font-mono text-amber-400 font-semibold">{phoneStr}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-900 pb-1.5">
                            <span className="text-gray-500">Location:</span>
                            <span className="text-white">{fullLocation} {matchedOrder?.zipCode ? `(${matchedOrder.zipCode})` : ''}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Registered On:</span>
                            <span className="font-mono text-gray-400">
                              {selectedAccountForDetails.createdAt ? new Date(selectedAccountForDetails.createdAt).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* FINANCIAL AUDIT */}
                  <div className="bg-[#111622]/40 border border-gray-800 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-mono uppercase text-amber-500 tracking-wider font-bold">Account Financial Metrics</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div className="bg-black/30 p-2.5 rounded-lg border border-gray-900">
                        <span className="text-[10px] text-gray-500 block uppercase">CURRENT BALANCE</span>
                        <strong className="text-base text-white font-mono font-bold block mt-0.5">
                          ${selectedAccountForDetails.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div className="bg-black/30 p-2.5 rounded-lg border border-gray-900">
                        <span className="text-[10px] text-gray-500 block uppercase">INITIAL ALLOCATION</span>
                        <strong className="text-base text-gray-400 font-mono block mt-0.5">
                          ${selectedAccountForDetails.initialBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div className="bg-black/30 p-2.5 rounded-lg border border-gray-900">
                        <span className="text-[10px] text-gray-500 block uppercase">PEAK BALANCE</span>
                        <strong className="text-base text-emerald-400 font-mono block mt-0.5">
                          ${selectedAccountForDetails.peakBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div className="bg-black/30 p-2.5 rounded-lg border border-gray-900">
                        <span className="text-[10px] text-gray-500 block uppercase">CURRENT PROFIT / LOSS</span>
                        {(() => {
                          const netPL = selectedAccountForDetails.balance - selectedAccountForDetails.initialBalance;
                          return (
                            <strong className={`text-base font-mono block mt-0.5 ${netPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {netPL >= 0 ? '+' : ''}${netPL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </strong>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs pt-2 border-t border-gray-900 text-gray-300">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Daily Drawdown Allowance:</span>
                        <span className="font-mono text-red-400 font-bold">
                          -${selectedAccountForDetails.dailyDrawdownLimitValue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Maximum Drawdown Allowance:</span>
                        <span className="font-mono text-red-500 font-bold">
                          -${selectedAccountForDetails.maxDrawdownLimitValue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Current Phase:</span>
                        <span className="font-mono text-white uppercase font-bold">
                          {selectedAccountForDetails.phase}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Warnings (Early Close Breach):</span>
                        <span className="font-mono text-amber-500 font-bold">
                          {selectedAccountForDetails.warningsCount || 0} Warnings
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ORDER PAYMENT DETAILS */}
                  {(() => {
                    const matchedOrder = orders.find(o => o.accountId === selectedAccountForDetails.id || (o.userId === selectedAccountForDetails.userId && o.challengeConfigId === selectedAccountForDetails.challengeConfigId));
                    if (!matchedOrder) return null;
                    return (
                      <div className="bg-[#111622]/40 border border-gray-800 rounded-xl p-4 space-y-2 text-xs">
                        <h4 className="text-xs font-mono uppercase text-amber-500 tracking-wider font-bold mb-2">Order & Payment Log</h4>
                        <div className="space-y-1.5 font-mono text-gray-300">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Order ID:</span>
                            <span className="text-white font-semibold">{matchedOrder.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">One-time Fee:</span>
                            <span className="text-white">${matchedOrder.finalPrice}</span>
                          </div>
                          {matchedOrder.couponUsed && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Coupon Code:</span>
                              <span className="text-amber-400">{matchedOrder.couponUsed} (-${matchedOrder.discount})</span>
                            </div>
                          )}
                          <div className="flex flex-col pt-1.5 border-t border-gray-900 mt-1.5">
                            <span className="text-gray-500 block mb-0.5">Transaction hash / Receipt ID:</span>
                            <span className="text-amber-300 text-[10.5px] break-all bg-black/40 p-1.5 rounded border border-gray-950 font-mono">
                              {matchedOrder.transactionId || 'No hash recorded.'}
                            </span>
                          </div>
                          {matchedOrder.recipientAddress && (
                            <div className="flex justify-between pt-1">
                              <span className="text-gray-500">Sent to address:</span>
                              <span className="text-gray-400 text-[10px] break-all">{matchedOrder.recipientAddress}</span>
                            </div>
                          )}
                          {matchedOrder.screenshotUrl && (
                            <div className="mt-2 pt-1.5 border-t border-gray-900 flex flex-col">
                              <span className="text-gray-500 block mb-1">Receipt Screenshot:</span>
                              <a 
                                href={matchedOrder.screenshotUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-block self-start hover:opacity-90 transition-opacity"
                              >
                                <img 
                                  src={matchedOrder.screenshotUrl} 
                                  alt="Payment Screenshot" 
                                  className="max-h-48 rounded border border-gray-800 object-contain bg-black"
                                  referrerPolicy="no-referrer"
                                />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* COLUMN 2: TRADE TIMELINE ("kab pehli entry li kab 2nd entry li") */}
                <div className="space-y-6">
                  <div className="bg-[#111622]/40 border border-gray-800 rounded-xl p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-mono uppercase text-amber-500 tracking-wider font-bold">Trading Chronological Timeline</h4>
                      <span className="text-xxs font-mono bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-bold">
                        Entry History
                      </span>
                    </div>

                    {(() => {
                      const accountTrades = trades
                        .filter(t => t.accountId === selectedAccountForDetails.id)
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                      if (accountTrades.length === 0) {
                        return (
                          <div className="text-center py-10 space-y-2">
                            <Activity className="w-8 h-8 text-gray-600 mx-auto animate-pulse" />
                            <p className="text-xs text-gray-500 font-mono">No trades/entries recorded yet on this account.</p>
                            <p className="text-[11px] text-gray-600 max-w-xs mx-auto">Once the trader registers this account and takes their first simulated trade in the terminal, details will display here.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                          {accountTrades.map((trade, idx) => {
                            const ordinal = idx + 1;
                            let ordinalSuffix = 'th';
                            if (ordinal === 1) ordinalSuffix = 'st';
                            else if (ordinal === 2) ordinalSuffix = 'nd';
                            else if (ordinal === 3) ordinalSuffix = 'rd';

                            const isOpen = trade.status === 'open';

                            return (
                              <div key={trade.id} className="relative pl-6 border-l border-gray-800 pb-2 last:pb-0">
                                {/* Dot indicator */}
                                <span className={`absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border border-gray-950 ${isOpen ? 'bg-amber-500 animate-ping' : 'bg-gray-600'}`} />
                                <span className={`absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border border-gray-950 ${isOpen ? 'bg-amber-500' : 'bg-gray-600'}`} />

                                <div className="bg-black/30 border border-gray-900 rounded-xl p-3 space-y-1.5 text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="font-mono text-xxs uppercase tracking-wider text-amber-500 font-bold">
                                      {ordinal}{ordinalSuffix} Entry taken
                                    </span>
                                    <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded ${trade.direction === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                      {trade.direction.toUpperCase()} {trade.lotSize} LOTS
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-gray-400">
                                    <div>
                                      <span className="text-gray-600">Asset:</span> <strong className="text-white">{trade.asset}</strong>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Entry Price:</span> <span className="text-white">${trade.entryPrice.toFixed(2)}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Opened At:</span> <span className="text-gray-300 text-[10px]">{new Date(trade.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Closed At:</span> <span className="text-gray-300 text-[10px]">{trade.closedAt ? new Date(trade.closedAt).toLocaleString() : 'STILL OPEN'}</span>
                                    </div>
                                  </div>

                                  <div className="flex justify-between items-center pt-1.5 border-t border-gray-900/60 mt-1 font-mono text-xxs">
                                    <span className="text-gray-500">Trade Status:</span>
                                    <span className={`font-bold ${isOpen ? 'text-amber-400 animate-pulse' : 'text-gray-400'}`}>
                                      {isOpen ? 'ACTIVE / OPEN' : 'CLOSED'}
                                    </span>
                                    <span className="text-gray-500">P&L:</span>
                                    <span className={`font-bold font-mono text-xs ${trade.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {trade.profitLoss >= 0 ? '+' : ''}${trade.profitLoss.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3 border-t border-gray-800 pt-5 mt-6">
                <button
                  onClick={() => setSelectedAccountForDetails(null)}
                  className="px-4 py-2 bg-gray-900 border border-gray-800 hover:border-gray-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close Details
                </button>
              </div>

            </div>
          </div>
        )}

        {/* KYC DOCUMENT REVIEW MODAL */}
        {selectedKycUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#0A0D14] border border-gray-800 rounded-2xl p-6 max-w-2xl w-full relative shadow-2xl shadow-amber-500/5 overflow-hidden">
              <button
                onClick={() => setSelectedKycUser(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-left space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-amber-500" />
                    <span>Compliance Verification Audit</span>
                  </h3>
                  <p className="text-xs text-gray-400">Review government-issued ID papers and biometric facial portraits submitted by {selectedKycUser.name}.</p>
                </div>

                {/* Document Display Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. Government ID Document */}
                  <div className="space-y-1.5">
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 font-bold">Government ID ({selectedKycUser.kycIdType || 'Passport/National ID'})</span>
                    <div className="bg-[#111622] rounded-xl border border-gray-900 overflow-hidden aspect-[4/3] flex items-center justify-center relative">
                      {selectedKycUser.kycIdFile ? (
                        <img 
                          src={
                            selectedKycUser.kycIdFile.startsWith('data:') || selectedKycUser.kycIdFile.startsWith('http')
                              ? selectedKycUser.kycIdFile
                              : "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=500&auto=format&fit=crop&q=60"
                          } 
                          alt="Government ID Front" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4 text-gray-600 font-mono text-[10px] flex flex-col items-center gap-1">
                          <Activity className="w-6 h-6 text-gray-700" />
                          <span>No ID Front Image Uploaded</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Facial Selfie Portrait */}
                  <div className="space-y-1.5">
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 font-bold">Biometric Selfie Portrait</span>
                    <div className="bg-[#111622] rounded-xl border border-gray-900 overflow-hidden aspect-[4/3] flex items-center justify-center relative">
                      {selectedKycUser.kycSelfieFile ? (
                        <img 
                          src={
                            selectedKycUser.kycSelfieFile.startsWith('data:') || selectedKycUser.kycSelfieFile.startsWith('http')
                              ? selectedKycUser.kycSelfieFile
                              : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60"
                          } 
                          alt="Compliance Selfie" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4 text-gray-600 font-mono text-[10px] flex flex-col items-center gap-1">
                          <Activity className="w-6 h-6 text-gray-700" />
                          <span>No Selfie Portrait Uploaded</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audit Checklist */}
                <div className="bg-[#111622]/50 border border-gray-900 rounded-xl p-3 text-xxs font-mono text-gray-400 space-y-1">
                  <p className="text-amber-500 font-bold uppercase tracking-wider mb-1">Administrative Verification Checklist:</p>
                  <p>✔ Photo is clear, sharp and legible with zero glare or optical obstruction.</p>
                  <p>✔ Government document matches the user profile name ({selectedKycUser.name}).</p>
                  <p>✔ Facial characteristics on the selfie match the photograph in the government-issued ID.</p>
                </div>

                {/* Verification Actions */}
                <div className="flex gap-3 pt-2">
                  {selectedKycUser.kycStatus === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          onApproveKyc(selectedKycUser.id);
                          setSelectedKycUser(null);
                        }}
                        className="flex-1 bg-emerald-500 hover:brightness-110 text-black py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          onRejectKyc(selectedKycUser.id);
                          setSelectedKycUser(null);
                        }}
                        className="flex-1 bg-red-500/20 hover:bg-red-500/35 text-red-400 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 border border-red-500/10 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject Profile</span>
                      </button>
                    </>
                  )}
                  {selectedKycUser.kycStatus !== 'pending' && (
                    <button
                      onClick={() => setSelectedKycUser(null)}
                      className="w-full bg-[#111622] hover:bg-[#111622]/80 border border-gray-800 text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Close Verification Audit
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
