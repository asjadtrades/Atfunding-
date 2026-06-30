import React, { useState } from 'react';
import { 
  Award, Shield, FileCheck, CheckCircle2, AlertTriangle, 
  User as UserIcon, RefreshCw, LogOut, ArrowUpRight, Upload, 
  HelpCircle, Eye, EyeOff, LayoutDashboard, Terminal, Check, X,
  ShieldAlert, Clock, Sparkles
} from 'lucide-react';
import { User, Account, KycStatus, AccountLog, PayoutRequest, Trade } from '../types';

interface DashboardProps {
  currentUser: User;
  onLogout: () => void;
  accounts: Account[];
  accountLogs: AccountLog[];
  onLaunchTerminal: (account: Account) => void;
  onSubmitKyc: (idType: string, idFile: string, selfieFile: string) => void;
  onSavePayoutWalletAddress?: (address: string) => void;
  onRefreshData: () => void;
  onShowBreachDetails?: (account: Account) => void;
  payoutRequests: PayoutRequest[];
  onCreatePayoutRequest: (req: PayoutRequest) => void;
  trades: Trade[];
  initialTab?: 'accounts' | 'leaderboard' | 'kyc' | 'certificates' | 'logs' | 'referrals';
}

export default function Dashboard({
  currentUser,
  onLogout,
  accounts,
  accountLogs,
  onLaunchTerminal,
  onSubmitKyc,
  onSavePayoutWalletAddress,
  onRefreshData,
  onShowBreachDetails,
  payoutRequests,
  onCreatePayoutRequest,
  trades,
  initialTab
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'accounts' | 'leaderboard' | 'kyc' | 'certificates' | 'logs' | 'referrals'>(initialTab || 'accounts');

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [kycIdType, setKycIdType] = useState('passport');
  const [kycDocAttached, setKycDocAttached] = useState(false);
  const [kycSelfieAttached, setKycSelfieAttached] = useState(false);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [showCertificate, setShowCertificate] = useState<Account | null>(null);

  // KYC Wizard States
  const [kycStep, setKycStep] = useState<'front' | 'front_scanning' | 'front_choice' | 'back' | 'back_scanning' | 'back_choice' | 'face' | 'face_scanning' | 'face_choice'>('front');
  const [countdown, setCountdown] = useState(5);
  const [kycDocQuality, setKycDocQuality] = useState<'valid' | 'invalid'>('valid');
  const [kycBackQuality, setKycBackQuality] = useState<'valid' | 'invalid'>('valid');
  const [kycFaceQuality, setKycFaceQuality] = useState<'valid' | 'invalid'>('valid');
  const [kycErrorMsg, setKycErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Countdown timer for scanning simulations
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (kycStep === 'front_scanning' || kycStep === 'back_scanning' || kycStep === 'face_scanning') {
      setCountdown(5);
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            if (kycStep === 'front_scanning') {
              setKycStep('front_choice');
            } else if (kycStep === 'back_scanning') {
              setKycStep('back_choice');
            } else {
              setKycStep('face_choice');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [kycStep]);
  
  // Payout request states
  const [showPayoutModal, setShowPayoutModal] = useState<Account | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<string>('50');
  const [payoutMethod, setPayoutMethod] = useState<'bitcoin' | 'usdt'>('bitcoin');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [walletInput, setWalletInput] = useState('');

  // Referral states
  const [copied, setCopied] = useState(false);
  const [refPayoutAmount, setRefPayoutAmount] = useState('50');
  const [refPayoutMethod, setRefPayoutMethod] = useState<'bitcoin' | 'usdt'>('bitcoin');
  const [refPayoutAddress, setRefPayoutAddress] = useState(currentUser.payoutWalletAddress || '');
  const [refPayoutSuccess, setRefPayoutSuccess] = useState('');
  const [refPayoutError, setRefPayoutError] = useState('');

  // Auto-populate payoutDetails if crypto is chosen and user has a saved payout address
  React.useEffect(() => {
    if (showPayoutModal && currentUser.payoutWalletAddress) {
      if (payoutMethod === 'bitcoin' || payoutMethod === 'usdt') {
        setPayoutDetails(currentUser.payoutWalletAddress);
      } else {
        setPayoutDetails('');
      }
    }
  }, [payoutMethod, currentUser.payoutWalletAddress, showPayoutModal]);

  const handleFrontFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("The uploaded file is not an image. KYC document must be an image (JPEG, PNG, or WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFrontImage(reader.result as string);
      setKycDocAttached(true);
      setKycDocQuality('valid');
      setKycErrorMsg(null);
      setKycStep('front_choice');
    };
    reader.readAsDataURL(file);
  };

  const handleBackFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("The uploaded file is not an image. KYC document must be an image (JPEG, PNG, or WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setBackImage(reader.result as string);
      setKycBackQuality('valid');
      setKycErrorMsg(null);
      setKycStep('back_choice');
    };
    reader.readAsDataURL(file);
  };

  const handleSelfieFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("The uploaded file is not an image. Selfie must be an image (JPEG, PNG, or WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelfieImage(reader.result as string);
      setKycSelfieAttached(true);
      setKycFaceQuality('valid');
      setKycErrorMsg(null);
      setKycStep('face_choice');
    };
    reader.readAsDataURL(file);
  };

  const handleKycSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycDocAttached || !kycSelfieAttached) {
      alert('Please attach both the government ID and your selfie to submit KYC.');
      return;
    }
    onSubmitKyc(kycIdType, 'simulated_id_document.jpg', 'simulated_selfie.jpg');
    setActiveTab('accounts');
  };

  const myAccounts = accounts.filter(acc => acc.userEmail === currentUser.email);

  return (
    <div className="min-h-screen bg-[#05070B] text-gray-100 font-sans pb-20">
      {/* Glow */}
      <div className="absolute top-0 right-10 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* DASHBOARD HEADER */}
      <header className="bg-[#0A0D14]/80 border-b border-gray-950 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-md">
                <span className="font-sans font-bold text-black text-sm">AT</span>
              </div>
              <span className="font-sans text-xl font-bold tracking-wider text-white hidden sm:inline">
                AT<span className="text-amber-400">Funding</span>
              </span>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex gap-0.5 sm:gap-1 overflow-x-auto pr-1 scrollbar-none max-w-[140px] xs:max-w-[200px] sm:max-w-none flex-nowrap">
              <button
                onClick={() => setActiveTab('accounts')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium uppercase tracking-wider transition-all cursor-pointer flex-shrink-0 ${activeTab === 'accounts' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                Accounts
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium uppercase tracking-wider transition-all cursor-pointer flex-shrink-0 ${activeTab === 'leaderboard' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                Leaderboard
              </button>
              <button
                onClick={() => setActiveTab('kyc')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium uppercase tracking-wider transition-all cursor-pointer flex-shrink-0 ${activeTab === 'kyc' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                KYC<span className="hidden sm:inline"> Verification</span>
              </button>
              <button
                onClick={() => setActiveTab('certificates')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium uppercase tracking-wider transition-all cursor-pointer flex-shrink-0 ${activeTab === 'certificates' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                Certificates
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium uppercase tracking-wider transition-all cursor-pointer flex-shrink-0 ${activeTab === 'logs' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                Logs
              </button>

            </nav>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <button
              onClick={onRefreshData}
              title="Force sync simulation state"
              className="p-1.5 sm:p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white cursor-pointer active:rotate-45 transition-transform"
            >
              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* User tag - hidden on mobile, visible on medium+ screens */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <UserIcon className="w-3 h-3" />
              </div>
              <div className="text-left">
                <p className="text-xxs text-white font-semibold leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-gray-500 font-mono leading-none">{currentUser.role.toUpperCase()}</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 sm:p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 cursor-pointer"
              title="Exit portal"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD MAIN */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Verification Alert banner */}
        {currentUser.kycStatus !== 'approved' && (
          <div className="mb-6 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white">KYC Verification Required</h4>
                <p className="text-xs text-gray-400">
                  Your KYC is currently <span className="text-amber-400 font-semibold">{currentUser.kycStatus === 'none' ? 'Incomplete' : 'Pending Approval'}</span>. Please submit identification to guarantee standard institutional payout processing.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('kyc')}
              className="bg-amber-500 text-black text-xs font-semibold py-1.5 px-4 rounded-lg hover:opacity-90 transition-opacity flex-shrink-0 cursor-pointer self-start md:self-auto"
            >
              Submit KYC
            </button>
          </div>
        )}

        {/* ACCOUNTS TAB */}
        {activeTab === 'accounts' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">My Funded & Evaluation Accounts</h2>
                <p className="text-xs text-gray-400">Manage and trade your registered proprietary capitals.</p>
              </div>
              <p className="text-xs font-mono text-gray-500">
                ACTIVE ACCOUNTS: <span className="text-white font-bold">{myAccounts.filter(acc => acc.status === 'active').length}</span> / TOTAL: <span className="text-gray-300 font-bold">{myAccounts.length}</span>
              </p>
            </div>

            {myAccounts.length === 0 ? (
              <div className="bg-[#0D1017] border border-gray-800 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
                <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                  <LayoutDashboard className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">No Evaluation Accounts Registered</h3>
                <p className="text-xs text-gray-400">
                  You have not purchased an evaluation package or your order is currently pending payment confirmation.
                </p>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                  <p className="text-xxs text-amber-500 leading-normal">
                    💡 TEST TIP: Submit an order using the pricing table on the home page, then switch to the **Admin Portal** to instantly approve and activate it!
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {myAccounts.map((account) => {
                  const targetPercent = account.phase === 'phase1' ? 8 : account.phase === 'phase2' ? 5 : 0;
                  const targetValue = account.initialBalance * (1 + targetPercent / 100);
                  const targetRequired = account.initialBalance * (targetPercent / 100);
                  const currentProfit = account.balance - account.initialBalance;
                  const drawdownToday = account.startOfDayBalance - account.balance;
                  const drawdownMax = account.initialBalance - account.balance;

                  // Progress calculate
                  const profitProgress = targetPercent > 0 
                    ? Math.max(0, Math.min(100, (currentProfit / targetRequired) * 100))
                    : 0;

                  return (
                    <div 
                      key={account.id}
                      className={`bg-[#0D1017] rounded-2xl border ${account.status === 'breached' ? 'border-red-500/30' : 'border-gray-800 hover:border-amber-500/30'} p-6 transition-all space-y-6 relative overflow-hidden`}
                    >
                      {/* Breached overlay */}
                      {account.status === 'breached' && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-xxs flex flex-col items-center justify-center p-4 z-10 text-center">
                          <AlertTriangle className="w-12 h-12 text-red-500 mb-2" />
                          <h4 className="text-lg font-bold text-red-400">ACCOUNT BREACHED</h4>
                          <p className="text-xs text-gray-400 max-w-xs mt-1 font-medium">
                            {account.breachedReason || "This account was suspended due to a rule violation. Please respect the 2-minute minimum hold and 15-minute interval rules."}
                          </p>
                        </div>
                      )}

                      {/* Header bar */}
                      <div className="flex justify-between items-start border-b border-gray-800/60 pb-4">
                        <div>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${
                            account.phase === 'funded' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {account.phase.toUpperCase()}
                          </span>
                          <h3 className="text-base font-bold text-white mt-1.5">{account.challengeName}</h3>
                          <p className="text-[10px] font-mono text-gray-500">ID: {account.id}</p>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] text-gray-500 uppercase font-mono">STATUS</p>
                          <p className={`text-xs font-bold uppercase ${
                            account.status === 'active' ? 'text-emerald-400' :
                            account.status === 'pending_payment' ? 'text-amber-500' :
                            account.status.startsWith('passed') ? 'text-blue-400' : 'text-red-400'
                          }`}>
                            {account.status === 'pending_payment' ? 'PENDING' : account.status.replace('_', ' ')}
                          </p>
                        </div>
                      </div>

                      {/* Grid metrics */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-[#111622]/40 p-3 rounded-xl border border-gray-900">
                          <p className="text-[10px] font-mono text-gray-500">BALANCE</p>
                          <p className="text-base font-bold text-white font-mono mt-1">
                            {account.balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                          </p>
                        </div>
                        <div className="bg-[#111622]/40 p-3 rounded-xl border border-gray-900">
                          <p className="text-[10px] font-mono text-gray-500">INITIAL SIZE</p>
                          <p className="text-base font-bold text-gray-400 font-mono mt-1">
                            {account.initialBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div className="bg-[#111622]/40 p-3 rounded-xl border border-gray-900">
                          <p className="text-[10px] font-mono text-gray-500">NET P&L</p>
                          <p className={`text-base font-bold font-mono mt-1 ${currentProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {currentProfit >= 0 ? '+' : ''}{currentProfit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                          </p>
                        </div>
                      </div>

                      {/* Drawdowns tracking */}
                      <div className="space-y-3">
                        {/* Daily drawdown */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Daily Drawdown Status (Max {account.dailyDrawdownLimitValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })})</span>
                            <span className={`font-mono font-semibold ${drawdownToday > 0 ? 'text-amber-500' : 'text-emerald-400'}`}>
                              {Math.max(0, drawdownToday).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} / {Math.round((Math.max(0, drawdownToday) / account.dailyDrawdownLimitValue) * 100)}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-950 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                (drawdownToday / account.dailyDrawdownLimitValue) > 0.8 ? 'bg-red-500' :
                                (drawdownToday / account.dailyDrawdownLimitValue) > 0.5 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.max(0, Math.min(100, (drawdownToday / account.dailyDrawdownLimitValue) * 100))}%` }}
                            />
                          </div>
                        </div>

                        {/* Max Drawdown */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Max Cumulative Drawdown (Max {account.maxDrawdownLimitValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })})</span>
                            <span className={`font-mono font-semibold ${drawdownMax > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {Math.max(0, drawdownMax).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} / {Math.round((Math.max(0, drawdownMax) / account.maxDrawdownLimitValue) * 100)}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-950 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                (drawdownMax / account.maxDrawdownLimitValue) > 0.8 ? 'bg-red-500' :
                                (drawdownMax / account.maxDrawdownLimitValue) > 0.5 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.max(0, Math.min(100, (drawdownMax / account.maxDrawdownLimitValue) * 100))}%` }}
                            />
                          </div>
                        </div>

                        {/* Target Progress (if evaluation) */}
                        {account.phase !== 'funded' && (
                          <div className="space-y-1 pt-2 border-t border-gray-800/40">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Phase Profit Target ({targetPercent}%: {targetRequired.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })})</span>
                              <span className="font-mono font-semibold text-amber-400">
                                {Math.max(0, currentProfit).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} / {Math.round(profitProgress)}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-gray-950 rounded-full overflow-hidden border border-gray-900">
                              <div 
                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-500"
                                style={{ width: `${profitProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-between items-center pt-4 border-t border-gray-800/60">
                        {account.status === 'pending_payment' ? (
                          <div className="flex items-center gap-1 text-[10px] text-amber-500 font-mono">
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            <span>Awaiting Verification</span>
                          </div>
                        ) : account.phase === 'funded' || account.status.startsWith('passed') ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Evaluation Passed Successfully</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-500 font-mono">
                            LEVERAGE: 1:100 • MT5 SANDBOX
                          </div>
                        )}

                        <div className="flex gap-2">
                          {account.status === 'pending_payment' && (
                            <span className="text-[10.5px] text-amber-500 font-semibold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg font-mono">
                              Pending Activation
                            </span>
                          )}

                          {(account.status === 'passed_phase1' || account.status === 'passed_phase2') && (
                            <button
                              onClick={() => setShowCertificate(account)}
                              className="px-3 py-1.5 rounded bg-amber-500 text-black text-xs font-semibold hover:opacity-90 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>View Certificate</span>
                            </button>
                          )}

                          {account.status === 'active' && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => {
                                  if (currentUser.kycStatus !== 'approved') {
                                    alert('KYC verification is required before requesting payouts. Please complete your KYC verification under the KYC tab first.');
                                    return;
                                  }
                                  setShowPayoutModal(account);
                                  // Default to $50 or minimum of profit/max limits
                                  const profit = Math.max(0, account.balance - account.initialBalance);
                                  setPayoutAmount(Math.min(400, Math.max(25, Math.round(profit))).toString());
                                  setPayoutDetails('');
                                }}
                                className={`px-3 py-2 border rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                  currentUser.kycStatus === 'approved'
                                    ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-400'
                                    : 'bg-gray-800/40 border-gray-700 text-gray-500 cursor-not-allowed hover:bg-gray-800/40'
                                }`}
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>{currentUser.kycStatus === 'approved' ? 'Request Payout' : 'Payout (KYC Req)'}</span>
                              </button>
                              <button
                                onClick={() => onLaunchTerminal(account)}
                                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-black rounded-lg text-xs font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Terminal className="w-3.5 h-3.5" />
                                <span>Open MT5 Terminal</span>
                              </button>
                            </div>
                          )}

                          {account.status === 'breached' && (
                            <button
                              onClick={() => onShowBreachDetails?.(account)}
                              className="px-4 py-2 bg-red-600/10 hover:bg-red-600/25 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-950/20"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>View Breach Details</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border-b border-gray-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500 animate-pulse" />
                <span>Verified Prop Leaderboard</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Compete against real, verified traders currently evaluated on our simulated institutional server. Rankings are determined strictly by performance percentage.
              </p>
            </div>

            <div className="bg-[#0D1017] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
              {(() => {
                const RESET_TIME = 1782818948000; // June 30, 2026 (Leaderboard Cleaned)
                const leaderboardAccounts = accounts.filter(acc => {
                  if (acc.userId === 'user-default' || acc.userEmail === 'trader@atfunding.com' || acc.userEmail === 'asjadtrades07@gmail.com') {
                    return false;
                  }
                  const accTime = acc.createdAt ? new Date(acc.createdAt).getTime() : 0;
                  return accTime >= RESET_TIME;
                });

                if (leaderboardAccounts.length === 0) {
                  return (
                    <div className="p-12 text-center space-y-4">
                      <Award className="w-12 h-12 text-gray-600 mx-auto" />
                      <h3 className="text-base font-bold text-gray-300">Leaderboard is vacant</h3>
                      <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                        No verified trader accounts have made purchase payments and registered trades yet. Purchase an active evaluation challenge and trade profitably to lock in rank #1!
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800/85 text-gray-400 font-mono uppercase tracking-wider text-[10px] bg-black/45">
                          <th className="py-4 px-6 text-center w-16">Rank</th>
                          <th className="py-4 px-6">Trader Name</th>
                          <th className="py-4 px-6">Account Size</th>
                          <th className="py-4 px-6">Account Type</th>
                          <th className="py-4 px-6 text-right">Profit / Loss</th>
                          <th className="py-4 px-6 text-right font-bold text-amber-500">Gain %</th>
                          <th className="py-4 px-6 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {leaderboardAccounts
                          .map(acc => {
                          const profit = acc.balance - acc.initialBalance;
                          const profitPercent = (profit / acc.initialBalance) * 100;
                          return {
                            ...acc,
                            profit,
                            profitPercent
                          };
                        })
                        .sort((a, b) => b.profitPercent - a.profitPercent)
                        .map((acc, index) => {
                          const rank = index + 1;
                          const displayProfit = acc.profit.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                          const displayPercent = acc.profitPercent.toFixed(2) + '%';
                          const isCurrentUserAcc = acc.userEmail === currentUser.email;

                          // Format name slightly for privacy
                          const parts = acc.userName.split(' ');
                          let anonymousName = parts[0];
                          if (parts[1]) {
                            anonymousName += ` ${parts[1][0]}.`;
                          }

                          return (
                            <tr key={acc.id} className={`hover:bg-amber-500/5 transition-colors group ${isCurrentUserAcc ? 'bg-amber-500/5 font-medium' : ''}`}>
                              <td className="py-4 px-6 text-center font-bold">
                                {rank === 1 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 text-xs">🥇</span>}
                                {rank === 2 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/30 text-xs">🥈</span>}
                                {rank === 3 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/30 text-xs">🥉</span>}
                                {rank > 3 && <span className="font-mono text-gray-500">#{rank}</span>}
                              </td>
                              <td className="py-4 px-6 text-white group-hover:text-amber-400 transition-colors">
                                <span className="flex items-center gap-1.5">
                                  {anonymousName}
                                  {isCurrentUserAcc && (
                                    <span className="text-[9px] uppercase tracking-wider font-mono px-1 bg-amber-500 text-black rounded font-bold">You</span>
                                  )}
                                </span>
                              </td>
                              <td className="py-4 px-6 font-mono text-gray-300">
                                ${acc.challengeSize.toLocaleString()}
                              </td>
                              <td className="py-4 px-6">
                                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-gray-800/80 border border-gray-700/80 text-gray-300">
                                  {acc.type.replace('_', ' ')}
                                </span>
                              </td>
                              <td className={`py-4 px-6 text-right font-mono font-semibold ${acc.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {acc.profit >= 0 ? '+' : ''}{displayProfit}
                              </td>
                              <td className={`py-4 px-6 text-right font-mono font-bold ${acc.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {acc.profit >= 0 ? '+' : ''}{displayPercent}
                              </td>
                              <td className="py-4 px-6 text-center">
                                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                                  acc.status === 'active' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                  acc.status === 'breached' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {acc.status.replace('_', ' ')}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

        {/* KYC VERIFICATION TAB */}
        {activeTab === 'kyc' && (
          <div className="max-w-2xl mx-auto bg-[#0D1017] border border-gray-800 rounded-2xl p-8 space-y-6">
            <div className="border-b border-gray-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                <span>Identity Verification (KYC)</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                To fulfill regulatory compliance, please attach and verify your identification.
              </p>
            </div>

            {currentUser.kycStatus === 'approved' ? (
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-xl text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h3 className="text-base font-bold text-white">KYC Approved & Verified</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Your identity has been fully verified against institutional registries. Payouts are now unlocked.
                </p>
              </div>
            ) : currentUser.kycStatus === 'pending' ? (
              <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-xl text-center space-y-3">
                <RefreshCw className="w-12 h-12 text-amber-500 mx-auto animate-spin" style={{ animationDuration: '3s' }} />
                <h3 className="text-base font-bold text-white">KYC Pending Verification</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Your identification is currently undergoing manual compliance audit.
                </p>
                <div className="bg-amber-500/10 rounded p-2 text-xxs text-amber-400">
                  💡 Sandbox Pro-tip: Log in as **Admin** and click **Approve KYC** to bypass instantly!
                </div>
                <button
                  onClick={() => {
                    setKycStep('front');
                  }}
                  className="mt-2 text-xxs underline text-gray-500 hover:text-gray-300"
                >
                  Restart Verification Simulator
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* KYC STEP WIZARD PROGRESS BAR */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-800/60">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xxs font-bold ${
                      kycStep.startsWith('front') ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400'
                    }`}>1</span>
                    <span className="text-[11px] font-medium text-gray-300">Front ID</span>
                  </div>
                  <div className="h-px bg-gray-800 flex-1 mx-3" />
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xxs font-bold ${
                      kycStep.startsWith('back') ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400'
                    }`}>2</span>
                    <span className="text-[11px] font-medium text-gray-300">Back ID</span>
                  </div>
                  <div className="h-px bg-gray-800 flex-1 mx-3" />
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xxs font-bold ${
                      kycStep.startsWith('face') ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400'
                    }`}>3</span>
                    <span className="text-[11px] font-medium text-gray-300">Face Match</span>
                  </div>
                </div>

                {/* STEP 1: FRONT PAGE UPLOAD */}
                {kycStep === 'front' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xxs font-mono uppercase tracking-wider text-gray-400">Select Document Type</label>
                      <select 
                        value={kycIdType} 
                        onChange={(e) => setKycIdType(e.target.value)}
                        className="w-full bg-[#111622] border border-gray-800 rounded-lg p-2.5 text-xs text-gray-300 focus:outline-none focus:border-amber-500 font-medium"
                      >
                        <option value="passport">Passport</option>
                        <option value="national_id">National Identity Card / ID Card</option>
                        <option value="pan_card">PAN Card</option>
                        <option value="drivers_license">Driver's License</option>
                      </select>
                    </div>

                    <div 
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          handleFrontFileSelect(file);
                        }
                      }}
                      className={`border-2 border-dashed rounded-xl p-6 text-center bg-[#111622]/20 space-y-4 transition-all ${
                        isDragging 
                          ? 'border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/10' 
                          : 'border-gray-800 hover:border-amber-500/50'
                      }`}
                    >
                      <label className="block cursor-pointer space-y-3">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFrontFileSelect(file);
                            }
                          }}
                        />
                        <Upload className="w-10 h-10 text-amber-500/70 mx-auto animate-pulse" />
                        <div>
                          <h4 className="text-xs font-semibold text-white uppercase tracking-wider hover:text-amber-400 transition-colors">
                            Click to Upload Front Side from Gallery
                          </h4>
                           <p className="text-[10px] text-gray-500 mt-1 max-w-xs mx-auto">
                            Select {kycIdType === 'pan_card' ? 'PAN Card' : kycIdType.replace('_', ' ')} front image. Open your files, take a photo, or drag here.
                          </p>
                        </div>
                        <div className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10.5px] uppercase py-2 px-4 rounded-lg transition-all shadow-md">
                          Choose Document Image
                        </div>
                      </label>
                      
                      <div className="pt-2 border-t border-gray-900/60 flex items-center justify-between text-xxs text-gray-400">
                        <span>Or try simulated flow instantly:</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setKycDocQuality('valid');
                              setKycDocAttached(true);
                              setKycErrorMsg(null);
                              setFrontImage('simulated_front.jpg');
                              setKycStep('front_choice');
                            }}
                            className="text-emerald-400 hover:underline cursor-pointer font-bold"
                          >
                            [Simulate Valid]
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setKycDocQuality('invalid');
                              setKycErrorMsg(`Simulation Rejection: The document was parsed as blank/unreadable. Please ensure the camera is in focus.`);
                              setFrontImage(null);
                              setKycStep('front_choice');
                            }}
                            className="text-red-400 hover:underline cursor-pointer font-bold"
                          >
                            [Simulate Blank]
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 1 SCANNING: 5 SEC COUNTDOWN ANIMATION */}
                {kycStep === 'front_scanning' && (
                  <div className="border border-gray-800 bg-[#07090E] rounded-xl p-8 text-center space-y-6 relative overflow-hidden">
                    {/* Glowing Laser Scan Bar */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_12px_#f59e0b] animate-[bounce_2s_infinite]" />
                    
                    <div className="space-y-2">
                      <RefreshCw className="w-10 h-10 text-amber-500 mx-auto animate-spin" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest">Scanning Front Side ID</h4>
                      <p className="text-[10px] text-gray-400 font-mono">Verifying document metadata & facial alignment...</p>
                    </div>

                    {frontImage && (
                      <div className="relative w-44 h-28 mx-auto overflow-hidden rounded-lg border border-gray-800 shadow-inner">
                        <img src={frontImage.startsWith('data:') ? frontImage : "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=500&auto=format&fit=crop&q=60"} alt="ID Front Preview" className="w-full h-full object-cover opacity-50" />
                        <div className="absolute inset-0 bg-amber-500/10" />
                      </div>
                    )}

                    <div className="relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
                        <span className="text-2xl font-mono font-bold text-amber-400 animate-pulse">{countdown}s</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-600 italic">Do not close this tab or navigate away. Institutional AI check in progress.</p>
                  </div>
                )}

                {/* STEP 1 CHOICE/RESULT */}
                {kycStep === 'front_choice' && (
                  <div className="border border-gray-800 bg-[#0d1017] rounded-xl p-6 space-y-4 text-center">
                    {kycDocQuality === 'valid' ? (
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                          <Check className="w-6 h-6" />
                        </div>

                        {frontImage && (
                          <div className="relative w-40 h-24 mx-auto overflow-hidden rounded-lg border border-emerald-500/20 shadow-md">
                            <img src={frontImage.startsWith('data:') ? frontImage : "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=500&auto=format&fit=crop&q=60"} alt="ID Front Selected" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-emerald-500/10" />
                            <div className="absolute bottom-1 right-1 bg-emerald-500 text-black rounded-full p-0.5">
                              <Check className="w-3 h-3 stroke-[3px]" />
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">✓ ID/Passport Detected Successfully</h4>
                          <p className="text-[11px] text-gray-400">The document was successfully matched against international ID registers as a valid {kycIdType.replace('_', ' ')}.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setKycStep('back')}
                          className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 text-black text-xs font-bold hover:opacity-95 transition-all cursor-pointer w-full"
                        >
                          Proceed to Back Page of ID
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
                          <X className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest">❌ ID Check Failed: Invalid Document</h4>
                          <p className="text-[11px] text-gray-400 font-medium">
                            {kycErrorMsg || "Rejection Error: The uploaded document is not a valid national ID or Passport. Blank page, bad alignment, or non-identity document was detected in the frame."}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setKycStep('front')}
                          className="px-5 py-2 rounded-lg bg-gray-900 border border-gray-800 text-xs text-white font-bold hover:bg-gray-800 transition-all cursor-pointer w-full"
                        >
                          Retry Front Page Upload
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: BACK SIDE ID */}
                {kycStep === 'back' && (
                  <div className="space-y-4">
                    <div 
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          handleBackFileSelect(file);
                        }
                      }}
                      className={`border-2 border-dashed rounded-xl p-6 text-center bg-[#111622]/20 space-y-4 transition-all ${
                        isDragging 
                          ? 'border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/10' 
                          : 'border-gray-800 hover:border-amber-500/50'
                      }`}
                    >
                      <label className="block cursor-pointer space-y-3">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleBackFileSelect(file);
                            }
                          }}
                        />
                        <Upload className="w-10 h-10 text-amber-500/70 mx-auto animate-pulse" />
                        <div>
                          <h4 className="text-xs font-semibold text-white uppercase tracking-wider hover:text-amber-400 transition-colors">
                            Click to Upload Back Side from Gallery
                          </h4>
                          <p className="text-[10px] text-gray-500 mt-1 max-w-xs mx-auto">
                            Select {kycIdType === 'pan_card' ? 'PAN Card' : kycIdType.replace('_', ' ')} back side barcode image. Open your files, take a photo, or drag here.
                          </p>
                        </div>
                        <div className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10.5px] uppercase py-2 px-4 rounded-lg transition-all shadow-md">
                          Choose Back Side Image
                        </div>
                      </label>
                      
                      <div className="pt-2 border-t border-gray-900/60 flex items-center justify-between text-xxs text-gray-400">
                        <span>Or try simulated flow instantly:</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setKycBackQuality('valid');
                              setKycErrorMsg(null);
                              setBackImage('simulated_back.jpg');
                              setKycStep('back_choice');
                            }}
                            className="text-emerald-400 hover:underline cursor-pointer font-bold"
                          >
                            [Simulate Valid]
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setKycBackQuality('invalid');
                              setKycErrorMsg(`Simulation Rejection: Back barcode unreadable or invalid PDF417 checksum.`);
                              setBackImage(null);
                              setKycStep('back_choice');
                            }}
                            className="text-red-400 hover:underline cursor-pointer font-bold"
                          >
                            [Simulate Blank]
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2 SCANNING: 5 SEC COUNTDOWN */}
                {kycStep === 'back_scanning' && (
                  <div className="border border-gray-800 bg-[#07090E] rounded-xl p-8 text-center space-y-6 relative overflow-hidden">
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_12px_#f59e0b] animate-[bounce_2s_infinite]" />
                    
                    <div className="space-y-2">
                      <RefreshCw className="w-10 h-10 text-amber-500 mx-auto animate-spin" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest">Scanning Back Side Barcode</h4>
                      <p className="text-[10px] text-gray-400 font-mono">Parsing PDF417 format & checking cryptographic seals...</p>
                    </div>

                    {backImage && (
                      <div className="relative w-44 h-28 mx-auto overflow-hidden rounded-lg border border-gray-800 shadow-inner">
                        <img src={backImage.startsWith('data:') ? backImage : "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=500&auto=format&fit=crop&q=60"} alt="ID Back Preview" className="w-full h-full object-cover opacity-50" />
                        <div className="absolute inset-0 bg-amber-500/10" />
                      </div>
                    )}

                    <div className="relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
                        <span className="text-2xl font-mono font-bold text-amber-400 animate-pulse">{countdown}s</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-600 italic">Do not close this tab. bar code checksum verification is executing.</p>
                  </div>
                )}

                {/* STEP 2 CHOICE/RESULT */}
                {kycStep === 'back_choice' && (
                  <div className="border border-gray-800 bg-[#0d1017] rounded-xl p-6 space-y-4 text-center">
                    {kycBackQuality === 'valid' ? (
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                          <Check className="w-6 h-6" />
                        </div>

                        {backImage && (
                          <div className="relative w-40 h-24 mx-auto overflow-hidden rounded-lg border border-emerald-500/20 shadow-md">
                            <img src={backImage.startsWith('data:') ? backImage : "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=500&auto=format&fit=crop&q=60"} alt="ID Back Selected" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-emerald-500/10" />
                            <div className="absolute bottom-1 right-1 bg-emerald-500 text-black rounded-full p-0.5">
                              <Check className="w-3 h-3 stroke-[3px]" />
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">✓ ID Barcode Parsed Successfully</h4>
                          <p className="text-[11px] text-gray-400">Barcode cryptographic hash matches front side registration parameters. Holograms validated.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setKycStep('face')}
                          className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 text-black text-xs font-bold hover:opacity-95 transition-all cursor-pointer w-full"
                        >
                          Proceed to Face Verification
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
                          <X className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest">❌ Barcode Parsing Failed</h4>
                          <p className="text-[11px] text-gray-400 font-medium">
                            {kycErrorMsg || "Rejection Error: The barcodes or security features on the back side of this document are unreadable or do not match the ID front side document records."}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setKycStep('back')}
                          className="px-5 py-2 rounded-lg bg-gray-900 border border-gray-800 text-xs text-white font-bold hover:bg-gray-800 transition-all cursor-pointer w-full"
                        >
                          Retry Back Page Upload
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: FACE VERIFICATION */}
                {kycStep === 'face' && (
                  <div className="space-y-4">
                    <div 
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          handleSelfieFileSelect(file);
                        }
                      }}
                      className={`border-2 border-dashed rounded-xl p-6 text-center bg-[#111622]/20 space-y-4 transition-all ${
                        isDragging 
                          ? 'border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/10' 
                          : 'border-gray-800 hover:border-amber-500/50'
                      }`}
                    >
                      <label className="block cursor-pointer space-y-3">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleSelfieFileSelect(file);
                            }
                          }}
                        />
                        {/* Interactive face outline mock */}
                        <div className="relative w-28 h-28 mx-auto border-2 border-amber-500/40 rounded-full flex items-center justify-center overflow-hidden bg-black/40 group-hover:border-amber-500 transition-colors">
                          <div className="absolute border border-amber-500/20 w-20 h-20 rounded-full" />
                          <UserIcon className="w-14 h-14 text-amber-500/50" />
                          <div className="absolute inset-x-0 bottom-0 bg-amber-500/10 text-[8px] font-mono text-amber-400 py-1 uppercase tracking-wider text-center">Biometrics</div>
                        </div>

                        <div>
                          <h4 className="text-xs font-semibold text-white uppercase tracking-wider hover:text-amber-400 transition-colors">
                            Click to Upload Selfie / Face Match Photo
                          </h4>
                          <p className="text-[10px] text-gray-500 mt-1 max-w-xs mx-auto">
                            Upload a clear photo of your face, snap a live selfie, or drag here.
                          </p>
                        </div>
                        <div className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10.5px] uppercase py-2 px-4 rounded-lg transition-all shadow-md">
                          Choose Selfie Image
                        </div>
                      </label>
                      
                      <div className="pt-2 border-t border-gray-900/60 flex items-center justify-between text-xxs text-gray-400">
                        <span>Or try simulated flow instantly:</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setKycFaceQuality('valid');
                              setKycSelfieAttached(true);
                              setKycErrorMsg(null);
                              setSelfieImage('simulated_selfie.jpg');
                              setKycStep('face_choice');
                            }}
                            className="text-emerald-400 hover:underline cursor-pointer font-bold"
                          >
                            [Simulate Valid]
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setKycFaceQuality('invalid');
                              setKycErrorMsg(`Simulation Rejection: Biometric facial mesh mismatch. Please make sure your face is well-lit and directly facing the camera.`);
                              setSelfieImage(null);
                              setKycStep('face_choice');
                            }}
                            className="text-red-400 hover:underline cursor-pointer font-bold"
                          >
                            [Simulate Blank]
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3 SCANNING: 5 SEC COUNTDOWN */}
                {kycStep === 'face_scanning' && (
                  <div className="border border-gray-800 bg-[#07090E] rounded-xl p-8 text-center space-y-6 relative overflow-hidden">
                    {/* Circle face scanner effect */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-amber-500/10 animate-ping" />
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_12px_#f59e0b] animate-[bounce_2s_infinite]" />
                    
                    <div className="space-y-2">
                      <RefreshCw className="w-10 h-10 text-amber-500 mx-auto animate-spin" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest">Executing Biometric Scan</h4>
                      <p className="text-[10px] text-gray-400 font-mono">Comparing biometric mesh vector mapping to ID photo...</p>
                    </div>

                    {selfieImage && (
                      <div className="relative w-32 h-32 mx-auto overflow-hidden rounded-full border-2 border-amber-500/40 shadow-inner">
                        <img src={selfieImage.startsWith('data:') ? selfieImage : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60"} alt="Selfie Preview" className="w-full h-full object-cover opacity-50" />
                        <div className="absolute inset-0 bg-amber-500/10" />
                      </div>
                    )}

                    <div className="relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
                        <span className="text-2xl font-mono font-bold text-amber-400 animate-pulse">{countdown}s</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-600 italic">Please stay static. Liveness neural network audit is active.</p>
                  </div>
                )}

                {/* STEP 3 CHOICE/RESULT */}
                {kycStep === 'face_choice' && (
                  <div className="border border-gray-800 bg-[#0d1017] rounded-xl p-6 space-y-4 text-center">
                    {kycFaceQuality === 'valid' ? (
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                          <Check className="w-6 h-6" />
                        </div>

                        {selfieImage && (
                          <div className="relative w-28 h-28 mx-auto overflow-hidden rounded-full border-2 border-emerald-500/30 shadow-md">
                            <img src={selfieImage.startsWith('data:') ? selfieImage : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60"} alt="Selfie Selected" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-emerald-500/10" />
                            <div className="absolute bottom-1 right-2 bg-emerald-500 text-black rounded-full p-0.5">
                              <Check className="w-3.5 h-3.5 stroke-[3px]" />
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">✓ Biometric Liveness Verification Passed</h4>
                          <p className="text-[11px] text-gray-400">Facial matching successfully completed with 99.8% mesh similarity alignment to document photograph.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            // Automatically submit document to pending review!
                            const mockFormEvent = { preventDefault: () => {} };
                            handleKycSubmit(mockFormEvent as any);
                          }}
                          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold hover:opacity-95 active:scale-95 transition-all cursor-pointer w-full flex items-center justify-center gap-2 shadow-lg"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Submit Finished KYC Portfolio</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
                          <X className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest">❌ Biometric Verification Failed</h4>
                          <p className="text-[11px] text-gray-400 font-medium">
                            {kycErrorMsg || "Rejection Error: Facial landmark mapping did not correspond with the uploaded government identification records, or blurry lighting prevented liveness capture."}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setKycStep('face')}
                          className="px-5 py-2 rounded-lg bg-gray-900 border border-gray-800 text-xs text-white font-bold hover:bg-gray-800 transition-all cursor-pointer w-full"
                        >
                          Retry Biometric Selfie Scan
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CERTIFICATES TAB */}
        {activeTab === 'certificates' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white">Earned Credentials & Certificates</h2>
              <p className="text-xs text-gray-400">Unlock official certificates of achievement once evaluations are successfully completed.</p>
            </div>

            {myAccounts.filter(acc => acc.status.startsWith('passed')).length === 0 ? (
              <div className="bg-[#0D1017] border border-gray-800 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
                <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">No Certificates Unlocked Yet</h3>
                <p className="text-xs text-gray-400">
                  Certificates are automatically issued the moment you hit the profit targets of Phase 1 and Phase 2.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myAccounts.filter(acc => acc.status.startsWith('passed')).map(account => (
                  <div 
                    key={account.id}
                    onClick={() => setShowCertificate(account)}
                    className="bg-[#0D1017] border border-amber-500/20 hover:border-amber-500/50 p-5 rounded-xl text-center space-y-4 cursor-pointer transition-all group"
                  >
                    <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500 group-hover:scale-110 transition-transform">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">{account.challengeName}</h4>
                      <p className="text-xxs font-mono text-amber-500/80 uppercase tracking-widest mt-1">EVALUATION CONCLUDED</p>
                    </div>
                    <button className="w-full bg-[#1a2030] text-gray-200 text-xxs py-1.5 rounded hover:text-white font-medium cursor-pointer">
                      View Official Credential
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="bg-[#0D1017] border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Institutional Account Audit Logs</h2>
                <p className="text-xs text-gray-400">Automated ledger records tracking drawdowns, status shifts, and audits.</p>
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {accountLogs.filter(log => myAccounts.some(acc => acc.id === log.accountId)).length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6 font-mono">No ledger entries registered yet.</p>
              ) : (
                accountLogs
                  .filter(log => myAccounts.some(acc => acc.id === log.accountId))
                  .map(log => (
                    <div key={log.id} className="bg-[#111622]/40 border border-gray-900 rounded p-3 flex justify-between gap-4 items-start text-xs font-mono">
                      <div>
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          log.type === 'success' ? 'bg-emerald-500' :
                          log.type === 'warning' ? 'bg-amber-500' :
                          log.type === 'danger' ? 'bg-red-500' : 'bg-blue-400'
                        }`} />
                        <span className="text-gray-500 font-bold mr-2">[{log.accountId}]</span>
                        <span className="text-gray-300">{log.message}</span>
                      </div>
                      <span className="text-[10px] text-gray-600 flex-shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'referrals' && (() => {
          return (
            <div className="bg-[#0D1017] border border-gray-800 rounded-2xl p-6 text-center text-gray-400">
              Referral Program is currently disabled.
            </div>
          );
          const referralUrl = `${window.location.origin}/?ref=${currentUser.id}`;

          const handleCopyLink = () => {
            navigator.clipboard.writeText(referralUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          };

          const handleRefPayoutSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            setRefPayoutError('');
            setRefPayoutSuccess('');

            const amount = parseFloat(refPayoutAmount) || 0;
            if (amount < 25) {
              setRefPayoutError('Minimum commission payout is $25.');
              return;
            }
            if (amount > 100) {
              setRefPayoutError('Maximum commission payout limit is $100 per transaction.');
              return;
            }
            if (!refPayoutAddress) {
              setRefPayoutError('Please provide a secure payout address.');
              return;
            }

            setRefPayoutSuccess(`Payout request for $${amount.toFixed(2)} in ${refPayoutMethod.toUpperCase()} submitted successfully! Audit pending.`);
          };

          const otherAccounts = accounts.filter(a => a.userId !== currentUser.id && a.userEmail !== currentUser.email);

          const getChallengePrice = (size: number) => {
            if (size <= 1000) return 0;
            if (size <= 5000) return 49;
            if (size <= 10000) return 99;
            if (size <= 25000) return 189;
            if (size <= 50000) return 299;
            if (size <= 100000) return 499;
            return 899;
          };

          const realReferrals = otherAccounts.map(acc => {
            const price = getChallengePrice(acc.challengeSize);
            const comm = price * 0.15;
            return {
              id: acc.id,
              name: acc.userName || acc.userEmail.split('@')[0],
              email: acc.userEmail,
              date: new Date(acc.createdAt).toLocaleDateString(),
              size: acc.challengeSize,
              commission: comm,
              status: acc.status === 'active' ? 'Approved' : 'Pending Payment'
            };
          });

          const fallbackReferrals = [
            { id: 'ref-9021', name: 'Kabir Dev', email: 'kabir.dev99@gmail.com', date: '2 days ago', size: 10000, commission: 14.85, status: 'Approved' },
            { id: 'ref-1830', name: 'Rohit Sharma', email: 'rohit.trade07@gmail.com', date: '5 days ago', size: 50000, commission: 44.85, status: 'Approved' }
          ];

          const displayReferrals = realReferrals.length > 0 ? [...realReferrals, ...fallbackReferrals] : fallbackReferrals;

          const totalEarned = displayReferrals.reduce((sum, r) => sum + (r.status === 'Approved' ? r.commission : 0), 0);
          const outstandingComm = totalEarned;

          return (
            <div className="bg-[#0D1017] border border-gray-800 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-start border-b border-gray-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span>Institutional Affiliate & Referral Program</span>
                  </h2>
                  <p className="text-xs text-gray-400">Earn a flat 15% commission on every challenge purchased via your referral link.</p>
                </div>
              </div>

              {/* Referral link copy widget */}
              <div className="bg-[#111622] border border-gray-800 rounded-xl p-5 space-y-3">
                <label className="block text-xs font-mono uppercase tracking-wider text-amber-500 font-bold">
                  Your High-Converting Referral Link:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={referralUrl}
                    className="w-full bg-[#07090E] border border-gray-850 rounded-lg py-2.5 px-4 text-xs text-amber-400 font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="bg-amber-500 hover:bg-amber-600 text-black px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 leading-tight">
                  Share this link with other traders. When they sign up and acquire an evaluation account, you automatically earn 15% of the purchase value hamesha ke liye (permanently).
                </p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#111622]/50 border border-gray-900 rounded-xl p-4 text-left">
                  <p className="text-gray-500 uppercase font-mono text-[10px] tracking-wider">Total Referred Registrations</p>
                  <p className="text-2xl font-bold text-white mt-1">{displayReferrals.length}</p>
                  <p className="text-[10px] text-gray-600 mt-1">Real-time unique registrations</p>
                </div>
                <div className="bg-[#111622]/50 border border-gray-900 rounded-xl p-4 text-left">
                  <p className="text-gray-500 uppercase font-mono text-[10px] tracking-wider">Total Commissions Earned</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">${totalEarned.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-600 mt-1">Based on a 15% flat payout rate</p>
                </div>
                <div className="bg-[#111622]/50 border border-gray-900 rounded-xl p-4 text-left">
                  <p className="text-gray-500 uppercase font-mono text-[10px] tracking-wider">Outstanding Commission Balance</p>
                  <p className="text-2xl font-bold text-amber-500 mt-1">${outstandingComm.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-600 mt-1">Available for crypto withdrawal</p>
                </div>
              </div>

              {/* Action layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 1. Request payout of commissions */}
                <div className="lg:col-span-5 bg-[#111622]/30 border border-gray-900 rounded-xl p-5 space-y-4 text-left">
                  <div>
                    <h4 className="text-sm font-bold text-white">Withdraw Commissions</h4>
                    <p className="text-[11px] text-gray-500">Payout limit: $25 to $100 per transaction (USDT or Bitcoin only).</p>
                  </div>

                  {refPayoutSuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs p-3 rounded-lg">
                      {refPayoutSuccess}
                    </div>
                  )}

                  {refPayoutError && (
                    <div className="bg-red-500/10 border border-red-500/25 text-red-400 text-xs p-3 rounded-lg">
                      {refPayoutError}
                    </div>
                  )}

                  <form onSubmit={handleRefPayoutSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">Crypto Asset</label>
                      <select
                        value={refPayoutMethod}
                        onChange={(e) => setRefPayoutMethod(e.target.value as any)}
                        className="w-full bg-[#07090E] border border-gray-850 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="bitcoin">Bitcoin (BTC)</option>
                        <option value="usdt">USDT TRC-20</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">Amount to Payout (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={refPayoutAmount}
                        onChange={(e) => setRefPayoutAmount(e.target.value)}
                        placeholder="Min $25, Max $100"
                        className="w-full bg-[#07090E] border border-gray-850 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">Secure Wallet Address</label>
                      <input
                        type="text"
                        required
                        value={refPayoutAddress}
                        onChange={(e) => setRefPayoutAddress(e.target.value)}
                        placeholder="Enter your crypto address"
                        className="w-full bg-[#07090E] border border-gray-850 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={outstandingComm < 25}
                      className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        outstandingComm >= 25 
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black shadow-lg shadow-amber-500/10 hover:brightness-110' 
                          : 'bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-950'
                      }`}
                    >
                      {outstandingComm >= 25 ? 'Submit Commission Payout' : 'Minimum $25 Balance Required'}
                    </button>
                  </form>
                </div>

                {/* 2. Referral listing table */}
                <div className="lg:col-span-7 bg-[#111622]/30 border border-gray-900 rounded-xl p-5 space-y-4">
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-white">Referred Accounts List</h4>
                    <p className="text-[11px] text-gray-500">History of unique signups and challenge purchases under your link.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-gray-900 text-[10px] text-gray-500 uppercase tracking-wider">
                          <th className="pb-2.5 text-left">Trader</th>
                          <th className="pb-2.5 text-left">Joined</th>
                          <th className="pb-2.5 text-left">Evaluation Size</th>
                          <th className="pb-2.5 text-right">Commission</th>
                          <th className="pb-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-900/60">
                        {displayReferrals.map((ref, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="py-2.5 text-left font-sans font-medium text-white">{ref.name}</td>
                            <td className="py-2.5 text-left text-gray-400">{ref.date}</td>
                            <td className="py-2.5 text-left text-amber-500 font-bold">${ref.size.toLocaleString()}</td>
                            <td className="py-2.5 text-right text-emerald-400 font-bold">${ref.commission.toFixed(2)}</td>
                            <td className="py-2.5 text-right">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold uppercase ${
                                ref.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {ref.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}
      </main>

      {/* RENDER CERTIFICATE MODAL */}
      {showCertificate && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0a0d14] border-2 border-amber-500/40 rounded-2xl p-8 max-w-2xl w-full relative shadow-2xl shadow-amber-500/5 overflow-hidden">
            
            {/* Certificate frame corners */}
            <div className="absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-amber-500/30" />
            <div className="absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-amber-500/30" />
            <div className="absolute bottom-4 left-4 w-10 h-10 border-b-2 border-l-2 border-amber-500/30" />
            <div className="absolute bottom-4 right-4 w-10 h-10 border-b-2 border-r-2 border-amber-500/30" />

            <button
              onClick={() => setShowCertificate(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Certificate content */}
            <div className="text-center space-y-6 pt-4 pb-4">
              <div className="flex justify-center mb-2">
                <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 border border-amber-500/30">
                  <Award className="w-6 h-6" />
                </div>
              </div>

              <h4 className="font-sans text-xs tracking-widest text-amber-400 font-mono uppercase">CERTIFICATE OF EXCELLENCE</h4>
              
              <h3 className="text-xl sm:text-2xl font-serif text-white italic font-light">
                This is to certify that
              </h3>

              <h2 className="text-2xl sm:text-3xl font-sans font-bold text-white tracking-wide border-b border-gray-800 pb-3 max-w-md mx-auto">
                {currentUser.name}
              </h2>

              <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                has successfully concluded and passed the rigorous prop evaluation standards of ATFunding, meeting all profit directives and strict risk parameters.
              </p>

              <div className="bg-[#111622]/60 p-4 rounded-xl border border-gray-900/80 text-left max-w-sm mx-auto space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Program level:</span>
                  <span className="text-white font-medium">{showCertificate.challengeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Account Size:</span>
                  <span className="text-amber-400 font-bold">${showCertificate.challengeSize.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Conclusion Status:</span>
                  <span className="text-emerald-400 font-mono font-semibold">PASSED EVALUATION</span>
                </div>
              </div>

              <p className="text-[10px] text-gray-600 font-mono">
                SECURE AUTH-HASH: SHA-256/{Math.random().toString(16).substring(2, 18).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RENDER REQUEST PAYOUT MODAL */}
      {showPayoutModal && (() => {
        // Compute live parameters
        const account = showPayoutModal;
        const currentProfit = Math.max(0, account.balance - account.initialBalance);
        
        // 1. 30% Consistency Check (applies to both Standard Challenge and Instant Funding Accounts)
        const closedTradesForAcc = trades.filter(t => t.accountId === account.id && t.status === 'closed');
        const dayProfits: Record<string, number> = {};
        closedTradesForAcc.forEach(t => {
          const day = (t.closedAt || t.createdAt || '').split('T')[0];
          if (day) {
            dayProfits[day] = (dayProfits[day] || 0) + t.profitLoss;
          }
        });

        let targetPercent = account.phase === 'phase1' ? 8 : account.phase === 'phase2' ? 5 : 0;
        if (targetPercent === 0) targetPercent = 10; // default 10% target for funded/instant
        const profitTarget = account.initialBalance * (targetPercent / 100);
        const maxProfitPerDay = profitTarget * 0.30;

        let exceededDayProfitLimit = false;
        let highestDayProfit = 0;
        Object.keys(dayProfits).forEach(day => {
          if (dayProfits[day] > maxProfitPerDay) {
            exceededDayProfitLimit = true;
          }
          if (dayProfits[day] > highestDayProfit) {
            highestDayProfit = dayProfits[day];
          }
        });
        const consistencyRulePassed = true; // Bypassed for payout as requested

        // 2. 4 Minimum Profitable Days Check (for non-instant accounts, or standard evaluation stages)
        const closedTrades = trades.filter(t => t.accountId === account.id && t.status === 'closed');
        const daysMap: Record<string, number> = {};
        closedTrades.forEach(t => {
          const dStr = t.createdAt.split('T')[0];
          daysMap[dStr] = (daysMap[dStr] || 0) + t.profitLoss;
        });
        const profitableDays = Object.keys(daysMap).filter(day => daysMap[day] > 0);
        const profitableDaysCount = profitableDays.length;
        const daysRulePassed = account.type === 'instant' ? true : (profitableDaysCount >= 4);

        // Validation limits
        const isFreeOrInstant = account.type === 'free_account' || account.challengeConfigId === 'free-1k' || account.type === 'instant';
        const minPayoutLimit = 25;
        const maxPayoutLimit = isFreeOrInstant ? 60 : 100;

        const parsedAmount = parseFloat(payoutAmount) || 0;
        const isAmountWithinLimits = parsedAmount >= minPayoutLimit && parsedAmount <= maxPayoutLimit;
        const hasSufficientProfit = currentProfit >= parsedAmount;
        
        const isEligible = consistencyRulePassed && daysRulePassed && isAmountWithinLimits && hasSufficientProfit;

        // Handle submit
        const handlePayoutSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          if (!payoutDetails.trim()) {
            alert('Please specify your withdrawal payment address/details.');
            return;
          }
          if (!isAmountWithinLimits) {
            alert(`Payout amount must be between $${minPayoutLimit} and $${maxPayoutLimit} USD.`);
            return;
          }
          if (!hasSufficientProfit) {
            alert('You cannot withdraw more than your available positive account profits.');
            return;
          }
          if (!daysRulePassed) {
            alert('Cannot request payout: Minimum 4 profitable days of active trading are required.');
            return;
          }

          // Create payout request
          onCreatePayoutRequest({
            id: `payout-${Date.now()}`,
            accountId: account.id,
            challengeName: account.challengeName,
            userId: currentUser.id,
            userEmail: currentUser.email,
            userName: currentUser.name,
            amount: parsedAmount,
            method: payoutMethod,
            details: payoutDetails,
            status: 'pending',
            createdAt: new Date().toISOString()
          });

          alert(`Successfully submitted payout request for $${parsedAmount}! Admin team will audit and process within standard institutional SLA (24 hours).`);
          setShowPayoutModal(null);
        };

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-[#0D1017] border border-gray-800 rounded-2xl p-6 max-w-lg w-full relative shadow-2xl shadow-emerald-500/5 space-y-5 overflow-y-auto max-h-[90vh]">
              <button
                onClick={() => setShowPayoutModal(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                  <span>Institutional Payout Gateway</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Securely request a payout of positive profits on your evaluation account.
                </p>
              </div>

              {/* Account summary block */}
              <div className="bg-[#111622] border border-gray-900 rounded-xl p-3.5 flex justify-between items-center text-xs">
                <div>
                  <p className="text-gray-500 uppercase font-mono text-[9px]">Account ID</p>
                  <p className="text-white font-semibold">{account.id}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase font-mono text-[9px]">Total Profits</p>
                  <p className="text-emerald-400 font-bold text-sm">
                    ${currentProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase font-mono text-[9px]">Rule Profile</p>
                  <p className="text-amber-500 font-semibold uppercase text-[10px]">
                    30% Consistency & Drawdown Rules
                  </p>
                </div>
              </div>

              {/* SECURE WALLET ADDRESS SECTION */}
              <div className="bg-[#111622] border border-gray-850 rounded-xl p-4 space-y-2.5">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-bold flex items-center gap-1.5">
                  🔑 Save Payout Wallet Address
                </h4>
                {currentUser.payoutWalletAddress ? (
                  <div className="space-y-1.5 text-left">
                    <p className="text-[10px] text-gray-400 leading-tight">
                      Your registered withdrawal wallet address is permanently saved and locked:
                    </p>
                    <div className="bg-black/40 border border-gray-900 rounded-lg px-3 py-1.5 font-mono text-[11px] text-emerald-400 break-all select-all font-semibold">
                      {currentUser.payoutWalletAddress}
                    </div>
                    <p className="text-[9px] text-red-400 font-medium leading-tight">
                      🔒 The payout wallet address has been saved hamesha ke liye (forever) and cannot be changed or modified for account security.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 text-left">
                    <p className="text-[10px] text-gray-400 leading-normal">
                      Save your payout wallet address below (Bitcoin or USDT TRC-20). Once saved, it <span className="text-red-400 font-bold underline">CANNOT BE CHANGED</span>.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter BTC or USDT TRC-20 address..."
                        value={walletInput}
                        onChange={(e) => setWalletInput(e.target.value)}
                        className="flex-grow bg-[#07090E] border border-gray-800 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const address = walletInput.trim();
                          if (!address) {
                            alert('Please enter a valid crypto wallet address first.');
                            return;
                          }
                          if (confirm('⚠️ WARNING: Address cannot be changed!\n\nThis address will be saved hamesha ke liye (permanently) and cannot be changed or edited under any circumstances.\n\nAre you sure this wallet address is 100% correct?')) {
                            if (onSavePayoutWalletAddress) {
                              onSavePayoutWalletAddress(address);
                              setPayoutDetails(address);
                            }
                          }
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-black px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex-shrink-0"
                      >
                        Save
                      </button>
                    </div>
                    <p className="text-[9px] text-amber-500 font-medium leading-tight italic">
                      Notice: Crypto payout address is strictly saved once hamesha ke liye (permanently). Verify carefully before saving.
                    </p>
                  </div>
                )}
              </div>

              {/* LIVE COMPLIANCE AUDIT CHECKS */}
              <div className="bg-[#07090E] border border-gray-900 rounded-xl p-4 space-y-3 text-left">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 border-b border-gray-900 pb-1.5">
                  Pre-Transaction Compliance Audit
                </h4>
                
                {/* 1. Profit check */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Has positive profits:</span>
                  <span className={`font-semibold ${currentProfit > 0 ? 'text-emerald-400' : 'text-red-400'} flex items-center gap-1`}>
                    {currentProfit > 0 ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>${currentProfit.toFixed(2)}</span>
                  </span>
                </div>

                {/* 2. Min/Max boundary check */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Withdrawal range (${minPayoutLimit} - ${maxPayoutLimit}):</span>
                  <span className={`font-semibold ${isAmountWithinLimits ? 'text-emerald-400' : 'text-amber-400'} flex items-center gap-1`}>
                    {isAmountWithinLimits ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>${parsedAmount.toFixed(2)}</span>
                  </span>
                </div>

                {/* 4. Min 4 profitable trading days check (Non-instant) */}
                {account.type !== 'instant' && (
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex flex-col">
                      <span className="text-gray-400">4 Min Profitable Days:</span>
                      <span className="text-[10px] text-gray-600">Distinct positive trading days</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold ${daysRulePassed ? 'text-emerald-400' : 'text-red-400'} flex items-center justify-end gap-1`}>
                        {daysRulePassed ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        <span>{profitableDaysCount} / 4 Days</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* REQUEST FORM */}
              <form onSubmit={handlePayoutSubmit} className="space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                      Amount to Withdraw (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full bg-[#07090E] border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                      Payment Method
                    </label>
                    <select
                      value={payoutMethod}
                      onChange={(e) => setPayoutMethod(e.target.value as any)}
                      className="w-full bg-[#07090E] border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="bitcoin">Bitcoin (BTC)</option>
                      <option value="usdt">USDT TRC-20</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                    Withdrawal Destination / Details
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={payoutDetails}
                    onChange={(e) => setPayoutDetails(e.target.value)}
                    placeholder={
                      payoutMethod === 'bitcoin' ? 'Enter Bitcoin Wallet Address...' :
                      payoutMethod === 'usdt' ? 'Enter TRC-20 USDT Address...' :
                      'Enter Bank Swift, IBAN, Account Holder Name, and Bank Name...'
                    }
                    className="w-full bg-[#07090E] border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500 leading-relaxed placeholder-gray-600"
                  />
                </div>

                {/* Eligibility warnings */}
                {!isEligible && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-left">
                    <p className="text-[11px] text-red-400 leading-normal font-medium flex items-start gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <span>
                        {!hasSufficientProfit ? "Requested amount exceeds your current positive profit balance." :
                         !isAmountWithinLimits ? `Payout amount must be strictly between $${minPayoutLimit}.00 and $${maxPayoutLimit}.00 USD.` :
                         "You have not reached the minimum 4 profitable trading days requirement."}
                      </span>
                    </p>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPayoutModal(null)}
                    className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-800 text-xs font-semibold hover:bg-gray-800 transition-colors cursor-pointer text-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isEligible}
                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isEligible 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white active:scale-95' 
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-900'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Submit Payout Claim</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
