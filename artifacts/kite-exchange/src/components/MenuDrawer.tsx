import { useEffect, useState } from 'react';
import {
  X, ChevronRight, UserPlus, CreditCard, Download,
  CalendarDays, PenLine, Users, Rss, ShoppingBag
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import AuthModal from './AuthModal';
import ServicesModal from './ServicesModal';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
  onOpenDeposit?: () => void;
  onOpenReferral?: () => void;
  onOpenEarn?: () => void;
  onOpenAlphaEvents?: () => void;
  onOpenP2P?: () => void;
  onOpenPay?: () => void;
}

const SHORTCUT_ITEMS = [
  { icon: CalendarDays, label: 'Alpha Events', key: 'alpha' },
  { icon: UserPlus, label: 'Referral', key: 'referral' },
  { icon: ShoppingBag, label: 'Earn', key: 'earn' },
  { icon: Download, label: 'Deposit', key: 'deposit' },
  { icon: PenLine, label: 'Edit', key: 'edit' },
];

const RECOMMEND_ITEMS = [
  { icon: UserPlus, label: 'Referral', key: 'referral' },
  { icon: Users, label: 'P2P', key: 'p2p' },
  { icon: CreditCard, label: 'Pay', key: 'pay' },
  { icon: Rss, label: 'Square', key: 'square' },
  { icon: CalendarDays, label: 'Alpha Events', key: 'alpha' },
];

function getInitials(email: string) {
  return email.charAt(0).toUpperCase();
}

function maskEmail(email: string) {
  if (!email) return '';
  const [name, domain] = email.split('@');
  if (name.length <= 2) return email;
  return `${name.substring(0, 2)}${'*'.repeat(3)}@${domain}`;
}

export default function MenuDrawer({
  isOpen,
  onClose,
  onOpenDeposit,
  onOpenReferral,
  onOpenEarn,
  onOpenAlphaEvents,
  onOpenP2P,
  onOpenPay,
}: MenuDrawerProps) {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [visible, setVisible] = useState(false);
  const [showServices, setShowServices] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setUserProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setVisible(true), 10);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (data) setUserProfile(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    onClose();
  };

  const handleAction = (key: string) => {
    onClose();
    setTimeout(() => {
      if (key === 'deposit') onOpenDeposit?.();
      else if (key === 'referral') onOpenReferral?.();
      else if (key === 'earn') onOpenEarn?.();
      else if (key === 'alpha') onOpenAlphaEvents?.();
      else if (key === 'p2p') onOpenP2P?.();
      else if (key === 'pay') onOpenPay?.();
    }, 300);
  };

  if (!isOpen && !visible) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${visible && isOpen ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 left-0 h-full z-50 w-[82vw] max-w-[340px] bg-[#181A20] flex flex-col transition-transform duration-300 ease-out ${visible && isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-12 pb-4">
          <div className="w-8" />
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#2B3139] transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ scrollbarWidth: 'none' }}>

          {/* Profile section */}
          {user ? (
            <button className="w-full flex items-center gap-3 mb-6 group">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#F0B90B] to-[#E8A800] flex items-center justify-center text-black font-black text-xl shrink-0 shadow-lg">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  getInitials(user.email || '')
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="text-[11px] text-gray-500 mb-0.5">
                  ID: {userProfile?.user_id || '-------'}
                </div>
                <div className="text-white font-bold text-base leading-tight">
                  {userProfile?.username || maskEmail(user.email || '')}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  {(userProfile?.user_level ?? 0) >= 1 ? (
                    <span
                      className="text-[11px] px-2 py-0.5 rounded font-bold relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg,#1a1100 0%,#2d1f00 40%,#1a1100 100%)',
                        border: '1px solid rgba(240,185,11,0.45)',
                        color: '#F0B90B',
                        boxShadow: '0 0 6px rgba(240,185,11,0.2)',
                      }}
                    >
                      VIP {userProfile.user_level}
                      <span
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)',
                          backgroundSize: '200% 100%',
                          animation: `vipShimmer ${userProfile.user_level === 10 ? 2 : 3}s linear infinite`,
                        }}
                      />
                    </span>
                  ) : (
                    <span className="text-[11px] bg-[#F0B90B]/15 text-[#F0B90B] px-2 py-0.5 rounded font-semibold border border-[#F0B90B]/20">
                      Regular
                    </span>
                  )}
                  <span className="text-[11px] bg-[#0ECB81]/10 text-[#0ECB81] px-2 py-0.5 rounded font-semibold border border-[#0ECB81]/20">
                    Verified
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </button>
          ) : (
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
                className="flex-1 py-2.5 bg-[#F0B90B] text-black text-sm font-bold rounded-xl hover:bg-[#F8D347] transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => { setAuthMode('register'); setAuthModalOpen(true); }}
                className="flex-1 py-2.5 bg-[#2B3139] text-white text-sm font-bold rounded-xl hover:bg-[#363D47] transition-colors"
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Shortcut section */}
          <div className="mb-6">
            <p className="text-white font-bold text-[15px] mb-3">Shortcut</p>
            <div className="grid grid-cols-4 gap-3">
              {SHORTCUT_ITEMS.map(({ icon: Icon, label, key }) => (
                <button
                  key={key}
                  onClick={() => handleAction(key)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 bg-[#0B0E11] rounded-xl flex items-center justify-center transition-all group-active:scale-95 group-hover:bg-[#2B3139]">
                    <Icon className="w-5 h-5 text-[#F0B90B]" />
                  </div>
                  <span className="text-gray-400 text-[11px] text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-[#2B3139] mb-5" />

          {/* Recommend section */}
          <div className="mb-6">
            <p className="text-white font-bold text-[15px] mb-3">Recommend</p>
            <div className="grid grid-cols-4 gap-3">
              {RECOMMEND_ITEMS.map(({ icon: Icon, label, key }) => (
                <button
                  key={key}
                  onClick={() => handleAction(key)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 bg-[#0B0E11] rounded-xl flex items-center justify-center transition-all group-active:scale-95 group-hover:bg-[#2B3139]">
                    <Icon className="w-5 h-5 text-[#F0B90B]" />
                  </div>
                  <span className="text-gray-400 text-[11px] text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* More Services button */}
          <button
            onClick={() => setShowServices(true)}
            className="w-full py-3 bg-[#2B3139] hover:bg-[#363D47] text-white text-sm font-semibold rounded-xl transition-colors mb-5"
          >
            More Services
          </button>

          {/* Logout if logged in */}
          {user && (
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-[#F6465D]/10 hover:bg-[#F6465D]/20 border border-[#F6465D]/40 hover:border-[#F6465D]/70 text-[#F6465D] text-sm font-bold rounded-xl transition-all mb-5"
            >
              Log Out
            </button>
          )}

          {/* BASONCE Lite */}
          <div className="pb-8 pt-1 border-t border-[#2B3139]">
            <div className="h-4" />
            <button className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-[#2B3139] hover:border-[#F0B90B]/30 bg-[#0B0E11] hover:bg-[#1A1D25] transition-all group">
              <div className="flex items-center gap-3">
                <div className="opacity-40">
                  <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
                    <path
                      d="M 20 80 L 20 20 L 55 20 C 65 20 72 27 72 37 C 72 43 69 48 65 51 C 71 54 75 60 75 68 C 75 78 68 80 58 80 L 20 80 Z M 35 45 L 50 45 C 54 45 57 42 57 38 C 57 34 54 31 50 31 L 35 31 L 35 45 Z M 35 69 L 53 69 C 57 69 60 66 60 62 C 60 58 57 55 53 55 L 35 55 L 35 69 Z"
                      fill="white"
                    />
                    <path
                      d="M 78 30 L 88 50 L 78 70"
                      stroke="white"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-bold text-[15px] tracking-tight">BASONCE</span>
                  <span className="text-[#F0B90B] font-bold text-[15px]">Lite</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#F0B90B] transition-colors" />
            </button>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
      />

      <ServicesModal
        isOpen={showServices}
        onClose={() => setShowServices(false)}
        onOpenDeposit={onOpenDeposit}
        onOpenReferral={onOpenReferral}
        onOpenEarn={onOpenEarn}
        onOpenP2P={onOpenP2P}
        onOpenPay={onOpenPay}
      />
    </>
  );
}
