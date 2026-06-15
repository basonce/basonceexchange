import React, { useState, useEffect } from 'react';
import { useDesktopMining } from '../hooks/useDesktopMining';
import type { MinerDevice, ShopEquipment } from '../hooks/useDesktopMining';
import AuthModal from '../../components/AuthModal';
import MiningUpgradeModal from '../../components/MiningUpgradeModal';
import ForcedUpgradeModal from '../../components/ForcedUpgradeModal';
import MiningFAQModal from '../../components/MiningFAQModal';
import AnimatedCounter from '../../components/AnimatedCounter';
import ConfirmCollectModal from '../components/mining/ConfirmCollectModal';
import ConfirmPurchaseModal from '../components/mining/ConfirmPurchaseModal';
import ToastContainer, { useToast } from '../components/mining/ToastContainer';
import PayoutTicker from '../components/mining/PayoutTicker';
import { Pickaxe, Zap, Activity, Clock, ShoppingCart, HelpCircle, AlertCircle, ArrowRight, ShieldCheck, Flame, Star, Target, Server, ChevronRight, Play, Square, Users } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';
import { chestForLevel } from '../../lib/shopChests';

// Helper to format remaining time
const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function DesktopMiningPage() {
  const mining = useDesktopMining();
  const { toasts, addToast, removeToast } = useToast();

  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [purchaseModalItem, setPurchaseModalItem] = useState<ShopEquipment | null>(null);
  const [faqOpen, setFaqOpen] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);

  // Fetch user profile level to know if purchase is a level up
  useEffect(() => {
    if (mining.authChecked && !mining.isDemoMode) {
      getCurrentUser().then(user => {
        if (user) {
          supabase.from('user_profiles').select('current_mining_level').eq('id', user.id).maybeSingle()
            .then(({ data }) => {
              if (data) setCurrentLevel(data.current_mining_level || 0);
            });
        }
      });
    }
  }, [mining.authChecked, mining.isDemoMode]);

  if (!mining.authChecked) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
          <div className="text-[#848E9C] font-medium tracking-widest uppercase text-sm">INITIALIZING TERMINAL</div>
        </div>
      </div>
    );
  }

  const handleCollect = async () => {
    const result = await mining.collectEarnings();
    setCollectModalOpen(false);
    if (result.ok) {
      addToast('success', 'Earnings Collected', `Successfully added +${result.collected.toFixed(4)} USDT to your balance.`);
      if (result.expired) {
        addToast('error', 'Device Expired', 'A time-limited device has expired. Please upgrade in the shop to continue.');
      }
    } else {
      if (result.message && result.message !== 'auth') {
        addToast('error', 'Collection Failed', result.message);
      }
    }
  };

  const handlePurchase = async () => {
    if (!purchaseModalItem) return;
    const result = await mining.purchaseEquipment(purchaseModalItem);
    setPurchaseModalItem(null);
    if (result.ok) {
      addToast('success', 'Purchase Successful', `You are now mining with ${purchaseModalItem.name}!`);
      if (result.leveledUp) {
        setCurrentLevel(result.level || currentLevel);
      }
    } else {
      if (result.message && result.message !== 'auth') {
        addToast('error', 'Purchase Failed', result.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] pb-20">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Network Stats Marquee */}
      <div className="bg-[#181A20] border-b border-[#2B3139] text-xs font-medium py-2.5 overflow-hidden whitespace-nowrap relative">
        <div className="flex items-center w-max animate-marquee-x">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center gap-12 pr-12" aria-hidden={dup === 1}>
              <span className="text-[#848E9C] tracking-wider">LIVE NETWORK STATUS</span>
              <span className="flex items-center gap-2 text-[#848E9C]"><span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse"></span> ACTIVE MINERS: <span className="text-white">{mining.liveStats.activeMiners.toLocaleString()}</span></span>
              <span className="flex items-center gap-2 text-[#848E9C]"><Zap className="w-3.5 h-3.5 text-[#F0B90B]" /> HOURLY NETWORK YIELD: <span className="text-white">${mining.liveStats.hourlyEarnings.toLocaleString()}</span></span>
              <span className="flex items-center gap-2 text-[#848E9C]"><Activity className="w-3.5 h-3.5 text-[#3B82F6]" /> UPGRADES LAST 10M: <span className="text-white">{mining.liveStats.upgradesLast10Min}</span></span>
              <span className="flex items-center gap-2 text-[#848E9C]"><Users className="w-3.5 h-3.5 text-[#8B5CF6]" /> ONLINE NOW: <span className="text-white">{mining.liveStats.onlineCount.toLocaleString()}</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Latest Payouts Ticker */}
      <PayoutTicker />

      {mining.isDemoMode && (
        <div className="bg-gradient-to-r from-[#F0B90B]/20 via-[#F0B90B]/10 to-transparent border-b border-[#F0B90B]/30">
          <div className="max-w-[1760px] mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[#F0B90B] text-black flex items-center justify-center font-bold">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[#F0B90B] font-bold text-sm">FREE DEMO MINING ACTIVE</h3>
                <p className="text-xs text-[#EAECEF]/80">Experience premium mining speeds for a limited time. Time remaining: {formatTime(mining.demoTimeRemaining || 0)}</p>
              </div>
            </div>
            <button onClick={() => mining.setShowAuthModal(true)} className="bg-[#F0B90B] text-black px-5 py-1.5 rounded-md font-bold text-sm hover:bg-[#FCD535] transition-colors">
              Sign Up to Keep Earnings
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1760px] mx-auto px-6 pt-8">
        {/* Header / Command Center Dashboard */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          
          {/* Main Stats Block */}
          <div className="flex-1 bg-[#181A20] border border-[#2B3139] rounded-2xl p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#F0B90B]/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <h1 className="text-3xl font-black text-white mb-2 tracking-tight">MINING COMMAND CENTER</h1>
                <div className="flex items-center gap-4 text-[#848E9C] text-sm font-medium">
                  <span className="flex items-center gap-1.5"><Server className="w-4 h-4" /> {mining.activeMiners}/{mining.totalMiners} Rigs Active</span>
                  <span className="w-1 h-1 rounded-full bg-[#2B3139]" />
                  <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#0ECB81]" /> Encrypted Connection</span>
                  <span className="w-1 h-1 rounded-full bg-[#2B3139]" />
                  <button onClick={() => setFaqOpen(true)} className="flex items-center gap-1.5 hover:text-[#F0B90B] transition-colors">
                    <HelpCircle className="w-4 h-4" /> FAQ & Rules
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
              <div className="bg-[#0B0E11] rounded-xl p-4 border border-[#2B3139]/50">
                <div className="text-[#848E9C] text-xs font-semibold mb-1">AVAILABLE BALANCE</div>
                <div className="text-2xl font-bold text-white tabular-nums">${mining.dbUsdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-[#5E6673] text-xs font-medium mt-1">{mining.dbEqBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EQ</div>
              </div>
              <div className="bg-[#0B0E11] rounded-xl p-4 border border-[#2B3139]/50">
                <div className="text-[#848E9C] text-xs font-semibold mb-1">NETWORK HASHRATE YIELD</div>
                <div className="text-2xl font-bold text-white tabular-nums">${mining.hourlyRate.toFixed(2)}<span className="text-[#848E9C] text-lg font-medium">/hr</span></div>
                <div className="text-[#5E6673] text-xs font-medium mt-1">{mining.eqHourlyRate.toFixed(2)} EQ/hr</div>
              </div>
              <div className="bg-[#0B0E11] rounded-xl p-4 border border-[#2B3139]/50">
                <div className="text-[#848E9C] text-xs font-semibold mb-1">24H ESTIMATED</div>
                <div className="text-2xl font-bold text-[#0ECB81] tabular-nums">${mining.dailyEstimate.toFixed(2)}</div>
                <div className="text-[#5E6673] text-xs font-medium mt-1">Constant operation required</div>
              </div>
              <div className="bg-gradient-to-br from-[#1E2329] to-[#0B0E11] rounded-xl p-4 border border-[#F0B90B]/20 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[#F0B90B]/5 group-hover:bg-[#F0B90B]/10 transition-colors pointer-events-none"></div>
                <div className="text-[#F0B90B] text-xs font-bold mb-1 flex items-center gap-1.5"><Pickaxe className="w-3.5 h-3.5" /> UNCOLLECTED EARNINGS</div>
                <div className="text-3xl font-black text-white tabular-nums tracking-tight">
                  $<AnimatedCounter value={mining.sessionUsdtTotal} decimals={4} />
                </div>
                <div className="text-[#F0B90B]/70 text-xs font-medium mt-1 mb-3">
                  <AnimatedCounter value={mining.sessionEqTotal} decimals={4} /> EQ (Display Only)
                </div>
                <button
                  onClick={() => setCollectModalOpen(true)}
                  disabled={mining.sessionUsdtTotal <= 0 || mining.collecting}
                  className="w-full bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold py-2 rounded-lg text-sm transition-all disabled:opacity-50 disabled:hover:bg-[#F0B90B] shadow-[0_0_15px_rgba(240,185,11,0.2)] hover:shadow-[0_0_20px_rgba(240,185,11,0.4)]"
                >
                  COLLECT TO BALANCE
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout: MINE vs SHOP */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8">
          
          {/* LEFT: MY FARM (MINERS) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-[#F0B90B]" />
                Active Operations
              </h2>
              <div className="bg-[#1E2329] border border-[#2B3139] px-3 py-1.5 rounded-md text-xs font-semibold text-[#848E9C]">
                {mining.activeMiners} RUNNING
              </div>
            </div>

            {mining.miners.length === 0 ? (
              <div className="bg-[#181A20] border border-[#2B3139] border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-[#1E2329] rounded-full flex items-center justify-center mb-6">
                  <Pickaxe className="w-8 h-8 text-[#5E6673]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Mining Equipment Found</h3>
                <p className="text-[#848E9C] max-w-md mx-auto mb-8">
                  Your mining farm is currently empty. Purchase equipment from the shop to start generating passive USDT yield.
                </p>
                <button 
                  onClick={() => document.getElementById('shop-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-[#F0B90B] text-black px-8 py-3 rounded-xl font-bold hover:bg-[#FCD535] transition-colors"
                >
                  Browse Equipment Shop
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mining.miners.map((m) => (
                  <DesktopMinerCard 
                    key={m.id} 
                    miner={m} 
                    onToggle={(status) => mining.toggleMiner(m.id, status)} 
                  />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: SHOP */}
          <div id="shop-section" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#0ECB81]" />
                Equipment Shop
              </h2>
            </div>

            <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-4 flex flex-col gap-3 h-[calc(100vh-340px)] overflow-y-auto custom-scrollbar">
              {mining.shopLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-32 bg-[#1E2329] rounded-xl animate-pulse" />
                ))
              ) : (
                mining.shopItems.map((item) => (
                  <DesktopShopCard 
                    key={item.id} 
                    item={item} 
                    chest={chestForLevel(item.level)}
                    userBalance={mining.dbUsdtBalance}
                    onBuy={() => setPurchaseModalItem(item)}
                  />
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Modals */}
      <ConfirmCollectModal
        isOpen={collectModalOpen}
        onClose={() => setCollectModalOpen(false)}
        onConfirm={handleCollect}
        sessionUsdtTotal={mining.sessionUsdtTotal}
        collecting={mining.collecting}
      />

      <ConfirmPurchaseModal
        isOpen={!!purchaseModalItem}
        onClose={() => setPurchaseModalItem(null)}
        onConfirm={handlePurchase}
        item={purchaseModalItem}
        chest={purchaseModalItem ? chestForLevel(purchaseModalItem.level) : undefined}
        purchasing={mining.purchasing}
        currentBalance={mining.dbUsdtBalance}
        currentLevel={currentLevel}
      />

      <AuthModal
        isOpen={mining.showAuthModal}
        onClose={() => mining.setShowAuthModal(false)}
        title="Sign up to continue"
        subtitle="Create an account to start earning real USDT."
      />

      <MiningUpgradeModal
        isOpen={mining.showUpgradeModal}
        onClose={() => mining.setShowUpgradeModal(false)}
        onShopClick={() => {
          mining.setShowUpgradeModal(false);
          document.getElementById('shop-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
        totalEarned={mining.sessionUsdtTotal}
      />

      <ForcedUpgradeModal
        isOpen={mining.showForcedUpgradeModal}
        onClose={() => mining.setShowForcedUpgradeModal(false)}
        onUpgrade={() => {
          mining.setShowForcedUpgradeModal(false);
          document.getElementById('shop-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
        lockedAmount={mining.sessionUsdtTotal}
        requiredTier={mining.nextTierInfo?.name || 'Professional Equipment'}
        requiredPrice={mining.nextTierInfo?.price || 50}
      />

      <MiningFAQModal
        isOpen={faqOpen}
        onClose={() => setFaqOpen(false)}
        isDemoMode={mining.isDemoMode}
      />

      <style dangerouslySetContent={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2B3139; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #5E6673; }
      `}} />
    </div>
  );
}

// --- Internal Sub-components for Desktop View ---

function DesktopMinerCard({ miner, onToggle }: { miner: MinerDevice; onToggle: (s: string) => void }) {
  const isActive = miner.status === 'active';
  const isExpired = miner.has_time_limit && (miner.remaining_mining_seconds || 0) <= 0;
  const chest = chestForLevel(miner.level);
  
  return (
    <div className={`bg-[#181A20] border rounded-xl overflow-hidden transition-all duration-300 ${
      isActive ? 'border-[#0ECB81]/40 shadow-[0_0_20px_rgba(14,203,129,0.05)]' : 'border-[#2B3139]'
    }`}>
      {/* Top Banner */}
      <div className={`h-1.5 w-full ${isActive ? 'bg-[#0ECB81] animate-pulse-green' : isExpired ? 'bg-[#F6465D]' : 'bg-[#2B3139]'}`} />
      
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shadow-inner overflow-hidden border border-[#2B3139]"
              style={{ background: `radial-gradient(circle at 50% 35%, ${chest.glow}26, #0B0E11 72%)` }}
            >
              <img
                src={chest.img}
                alt={miner.name}
                className={`w-[88%] h-[88%] object-contain ${isActive ? 'animate-bounce-subtle' : ''}`}
                style={{ filter: `drop-shadow(0 0 8px ${chest.glow}66)` }}
                draggable={false}
              />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg leading-tight flex items-center gap-2">
                {miner.name}
                <span className="bg-[#2B3139] text-[#EAECEF] text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide">LV {miner.level}</span>
              </h3>
              <div className="text-[#848E9C] text-sm mt-0.5 font-medium flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                {miner.hash_rate} TH/s
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${
            isActive ? 'bg-[#0ECB81]/10 text-[#0ECB81] border border-[#0ECB81]/20' : 
            isExpired ? 'bg-[#F6465D]/10 text-[#F6465D] border border-[#F6465D]/20' : 
            'bg-[#2B3139] text-[#848E9C]'
          }`}>
            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />}
            {isExpired ? 'EXPIRED' : isActive ? 'MINING' : 'IDLE'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-[#0B0E11] border border-[#2B3139]/50 rounded-lg p-3">
            <div className="text-[#5E6673] text-[11px] font-bold mb-1">SESSION EARNINGS</div>
            <div className={`text-xl font-black tabular-nums tracking-tight ${isActive ? 'text-[#0ECB81]' : 'text-white'}`}>
              <AnimatedCounter value={miner.session_earned_usdt} decimals={5} prefix="$" />
            </div>
          </div>
          <div className="bg-[#0B0E11] border border-[#2B3139]/50 rounded-lg p-3">
            <div className="text-[#5E6673] text-[11px] font-bold mb-1">HOURLY RATE</div>
            <div className="text-lg font-bold text-white tabular-nums tracking-tight">
              ${(miner.daily_earning_usdt / 24).toFixed(3)}
            </div>
          </div>
        </div>

        {miner.has_time_limit && (
          <div className="mb-5">
            <div className="flex justify-between text-xs font-medium mb-1.5">
              <span className="text-[#848E9C] flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Time Usage</span>
              <span className={isExpired ? 'text-[#F6465D]' : 'text-white'}>
                {miner.usage_percentage?.toFixed(1)}% ({formatTime(miner.remaining_mining_seconds || 0)} left)
              </span>
            </div>
            <div className="h-1.5 bg-[#0B0E11] rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  isExpired ? 'bg-[#F6465D]' : (miner.usage_percentage || 0) > 80 ? 'bg-[#F0B90B]' : 'bg-[#0ECB81]'
                }`}
                style={{ width: `${Math.min(100, miner.usage_percentage || 0)}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={() => onToggle(miner.status)}
          disabled={isExpired && !isActive}
          className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
            isExpired && !isActive 
              ? 'bg-[#2B3139] text-[#5E6673] cursor-not-allowed'
              : isActive
              ? 'bg-[#2B3139] hover:bg-[#363E48] text-white border border-[#363E48]'
              : 'bg-[#0ECB81] hover:bg-[#12D489] text-black shadow-[0_0_15px_rgba(14,203,129,0.2)]'
          }`}
        >
          {isActive ? <><Square className="w-4 h-4" fill="currentColor" /> STOP MINER</> : <><Play className="w-4 h-4" fill="currentColor" /> START MINER</>}
        </button>
      </div>
    </div>
  );
}

function DesktopShopCard({ item, chest, userBalance, onBuy }: { item: ShopEquipment; chest?: { img: string; glow: string }; userBalance: number; onBuy: () => void }) {
  const canAfford = userBalance >= item.price;
  const glow = chest?.glow ?? '#F0B90B';

  return (
    <div
      className="relative rounded-2xl p-4 transition-all duration-300 flex items-stretch gap-4 group border border-[#2B3139] hover:border-[var(--glow)]/50 bg-[#0B0E11]"
      style={{ ['--glow' as any]: glow }}
    >
      {/* Tier ambient glow (own clipped layer so it never crops the card content) */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
        <div
          className="absolute -top-16 -left-16 w-44 h-44 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-300"
          style={{ background: glow }}
        />
      </div>

      {/* Chest hero */}
      <div
        className="relative w-24 h-24 self-center rounded-xl shrink-0 overflow-hidden flex items-center justify-center border border-[#2B3139]"
        style={{ background: `radial-gradient(circle at 50% 35%, ${glow}26, #0B0E11 70%)` }}
      >
        {chest ? (
          <img
            src={chest.img}
            alt={item.name}
            className="w-[90%] h-[90%] object-contain group-hover:scale-110 transition-transform duration-300"
            style={{ filter: `drop-shadow(0 0 10px ${glow}55)` }}
            draggable={false}
          />
        ) : (
          <span className="text-4xl">{item.icon}</span>
        )}
        {item.badge && (
          <div className="absolute top-1.5 left-1.5 bg-[#F0B90B] text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow-md uppercase tracking-wider">
            {item.badge}
          </div>
        )}
      </div>

      <div className="relative flex-1 min-w-0 flex flex-col">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h4 className="text-white font-bold text-base leading-tight pr-1 truncate">{item.name}</h4>
          <div className="text-right shrink-0">
            <div className="text-white font-bold text-lg tabular-nums leading-none">${item.price.toLocaleString()}</div>
            <div className="text-[10px] text-[#848E9C] uppercase tracking-wider mt-0.5">USDT</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium mb-3">
          <span className="text-[#0ECB81] flex items-center gap-1 bg-[#0ECB81]/10 px-2 py-1 rounded-md"><Zap className="w-3.5 h-3.5" /> +${(item.daily_earning/24).toFixed(2)}/hr</span>
          <span className="text-[#EAECEF] bg-[#1E2329] px-2 py-1 rounded-md">LV {item.level}</span>
          <span className="text-[#848E9C] bg-[#1E2329] px-2 py-1 rounded-md">Limit ${item.withdrawal_limit.toLocaleString()}</span>
        </div>

        <button
          onClick={onBuy}
          className={`mt-auto w-full py-2.5 rounded-lg font-bold text-sm transition-all ${
            canAfford 
              ? 'bg-[#F0B90B] hover:bg-[#FCD535] text-black shadow-[0_0_10px_rgba(240,185,11,0.1)] hover:shadow-[0_0_18px_rgba(240,185,11,0.35)]' 
              : 'bg-[#2B3139] text-[#EAECEF] hover:bg-[#363E48]'
          }`}
        >
          {canAfford ? 'PURCHASE EQUIPMENT' : 'DEPOSIT TO BUY'}
        </button>
      </div>
    </div>
  );
}
