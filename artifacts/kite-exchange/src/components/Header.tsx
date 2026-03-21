import { useState, useEffect, useRef } from 'react';
import {
  Menu,
  X,
  User,
  Wallet,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  FileText,
  UserCircle,
  Users,
  Gift,
  Settings,
  Search,
  Bell,
  Download,
  Globe
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import AuthModal from './AuthModal';
import { BasonceLogo } from './BasonceLogo';

interface HeaderProps {
  onNavigate: (page: 'markets' | 'trade' | 'wallet' | 'admin') => void;
  currentPage: string;
  isAdmin?: boolean;
}

export default function Header({ onNavigate, currentPage, isAdmin }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [user, setUser] = useState<any>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const loadUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data && !error) {
      setUserProfile(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    setProfileDropdownOpen(false);
  };

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const maskEmail = (email: string) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (name.length <= 2) return email;
    return `${name.substring(0, 2)}${'*'.repeat(3)}@${domain}`;
  };

  return (
    <header className="bg-[#0b0e11] border-[#2b3139] sticky top-0 z-50">
      <div className="max-w-[1920px] mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="cursor-pointer" onClick={() => onNavigate('markets')}>
              <BasonceLogo size={32} showText={true} />
            </div>

            <nav className="hidden items-center space-x-1 flex">
              <button className="px-3 py-2 hover:text-white text-sm font-medium transition-colors">
                Buy Crypto
              </button>
              <button
                onClick={() => onNavigate('markets')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${ currentPage === 'markets' ? 'text-white' : 'text-[#eaecef] hover:text-white' }`}
              >
                Markets
              </button>
              <button className="flex items-center space-x-1 px-3 py-2 hover:text-white text-sm font-medium transition-colors">
                <span>Trade</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button className="flex items-center space-x-1 px-3 py-2 hover:text-white text-sm font-medium transition-colors">
                <span>Futures</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button className="flex items-center space-x-1 px-3 py-2 hover:text-white text-sm font-medium transition-colors">
                <span>Earn</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button className="flex items-center space-x-1 px-3 py-2 hover:text-white text-sm font-medium transition-colors">
                <span>Square</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button className="flex items-center space-x-1 px-3 py-2 hover:text-white text-sm font-medium transition-colors">
                <span>More</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {isAdmin && (
                <button
                  onClick={() => onNavigate('admin')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${ currentPage === 'admin' ? 'text-[#f0b90b] bg-[#f0b90b]/10' : 'text-[#eaecef] hover:text-white' }`}
                >
                  Admin
                </button>
              )}
            </nav>
          </div>

          <div className="hidden items-center space-x-4 flex">
            {user ? (
              <>
                <button className="text-[#848e9c] hover:text-[#eaecef] transition-colors">
                  <Search className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onNavigate('wallet')}
                  className="px-4 py-2 bg-[#f0b90b] hover:bg-[#f8d12f] font-semibold rounded text-sm transition-colors flex items-center space-x-1"
                >
                  <Download className="w-4 h-4" />
                  <span>Deposit</span>
                </button>
                <button className="text-[#848e9c] hover:text-[#eaecef] transition-colors">
                  <FileText className="w-5 h-5" />
                </button>
                <button className="text-[#848e9c] hover:text-[#eaecef] transition-colors">
                  <Bell className="w-5 h-5" />
                </button>
                <button className="text-[#848e9c] hover:text-[#eaecef] transition-colors">
                  <Download className="w-5 h-5" />
                </button>
                <button className="text-[#848e9c] hover:text-[#eaecef] transition-colors">
                  <Globe className="w-5 h-5" />
                </button>

                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f0b90b] to-[#f8d12f] flex items-center justify-center">
                      <span className="font-bold text-sm">
                        {getInitials(user.email || '')}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-[#848e9c] transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-[#1e2329] border border-[#2b3139] rounded-lg shadow-xl overflow-hidden">
                      <div className="p-4 border-[#2b3139]">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f0b90b] to-[#f8d12f] flex items-center justify-center">
                            <span className="font-bold text-lg">
                              {getInitials(user.email || '')}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="text-[#eaecef] font-medium">{maskEmail(user.email || '')}</div>
                            <div className="text-xs mt-0.5">Regular User</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-[#f0b90b] text-xs font-semibold rounded">
                            Unverified
                          </button>
                          <button className="px-3 py-1 bg-[#2b3139] text-xs font-medium rounded hover:bg-[#3b4149] transition-colors">
                            Link X
                          </button>
                        </div>
                      </div>

                      <div className="py-2">
                        <button className="w-full flex items-center space-x-3 px-4 py-3 text-[#eaecef] hover:bg-[#2b3139] transition-colors">
                          <LayoutDashboard className="w-4 h-4" />
                          <span className="text-sm">Dashboard</span>
                        </button>
                        <button
                          onClick={() => {
                            onNavigate('wallet');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-[#eaecef] hover:bg-[#2b3139] transition-colors"
                        >
                          <Wallet className="w-4 h-4" />
                          <span className="text-sm">Assets</span>
                        </button>
                        <button className="w-full flex items-center space-x-3 px-4 py-3 text-[#eaecef] hover:bg-[#2b3139] transition-colors">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">Orders</span>
                        </button>
                        <button className="w-full flex items-center space-x-3 px-4 py-3 text-[#eaecef] hover:bg-[#2b3139] transition-colors">
                          <UserCircle className="w-4 h-4" />
                          <span className="text-sm">Account</span>
                        </button>
                        <button className="w-full flex items-center space-x-3 px-4 py-3 text-[#eaecef] hover:bg-[#2b3139] transition-colors">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">Referral</span>
                        </button>
                        <button className="w-full flex items-center space-x-3 px-4 py-3 text-[#eaecef] hover:bg-[#2b3139] transition-colors">
                          <Gift className="w-4 h-4" />
                          <span className="text-sm">Rewards Hub</span>
                        </button>
                        <button className="w-full flex items-center space-x-3 px-4 py-3 text-[#eaecef] hover:bg-[#2b3139] transition-colors">
                          <Settings className="w-4 h-4" />
                          <span className="text-sm">Settings</span>
                        </button>
                      </div>

                      <div className="border-[#2b3139] py-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-[#eaecef] hover:bg-[#2b3139] transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm">Log Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-4 py-2 hover:text-white transition-colors text-sm font-medium"
                >
                  Log In
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="px-5 py-2 bg-[#f0b90b] hover:bg-[#f8d12f] font-semibold rounded text-sm transition-colors"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          <button
            className="text-[#eaecef] hover:text-white hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="bg-[#0b0e11] border-[#2b3139] hidden">
          <div className="px-4 py-3 space-y-1">
            <button className="w-full px-3 py-2 hover:text-white text-sm">
              Buy Crypto
            </button>
            <button
              onClick={() => {
                onNavigate('markets');
                setMobileMenuOpen(false);
              }}
              className="w-full px-3 py-2 hover:text-white text-sm"
            >
              Markets
            </button>
            <button className="w-full flex items-center justify-between px-3 py-2 hover:text-white text-sm">
              <span>Trade</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button className="w-full flex items-center justify-between px-3 py-2 hover:text-white text-sm">
              <span>Futures</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button className="w-full flex items-center justify-between px-3 py-2 hover:text-white text-sm">
              <span>Earn</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button className="w-full flex items-center justify-between px-3 py-2 hover:text-white text-sm">
              <span>Square</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button className="w-full flex items-center justify-between px-3 py-2 hover:text-white text-sm">
              <span>More</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                onNavigate('wallet');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 hover:text-white text-sm"
            >
              <Wallet className="w-4 h-4" />
              <span>Wallet</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  onNavigate('admin');
                  setMobileMenuOpen(false);
                }}
                className="w-full px-3 py-2 hover:text-white text-sm font-semibold"
              >
                Admin Dashboard
              </button>
            )}
            <div className="pt-3 border-[#2b3139] space-y-2">
              {user ? (
                <>
                  <div className="px-3 py-2 text-sm">
                    {user.email}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 hover:text-white border border-[#2b3139] rounded text-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => openAuthModal('login')}
                    className="w-full px-4 py-2 hover:text-white border border-[#2b3139] rounded text-sm"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => openAuthModal('register')}
                    className="w-full px-5 py-2 bg-[#f0b90b] hover:bg-[#f8d12f] font-semibold rounded text-sm"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
      />
    </header>
  );
}
