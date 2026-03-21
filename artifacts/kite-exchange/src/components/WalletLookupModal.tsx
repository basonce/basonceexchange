import { useState } from 'react';
import { X, Search, User, Wallet, Mail, Hash, DollarSign, Clock, ArrowRight, Send, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logAdminAction } from '../lib/admin-logger';

interface WalletLookupModalProps {
  onClose: () => void;
}

interface UserWalletInfo {
  user_id: string;
  user_email: string;
  user_name: string;
  user_number: string;
  wallet_address: string;
  wallet_network: string;
  assigned_at: string;
  usdt_balance: number;
  eq_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  total_trades: number;
}

export default function WalletLookupModal({ onClose }: WalletLookupModalProps) {
  const [searchAddress, setSearchAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserWalletInfo | null>(null);
  const [error, setError] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendNote, setSendNote] = useState('');
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSearch = async () => {
    if (!searchAddress.trim()) {
      setError('Cüzdan adresi girin');
      return;
    }

    setLoading(true);
    setError('');
    setUserInfo(null);
    setSuccessMessage('');

    try {
      const { data: wallet, error: walletError } = await supabase
        .from('wallet_pool')
        .select(`
          id,
          address,
          network,
          assigned_at,
          assigned_user_id,
          user_profiles:assigned_user_id (
            id,
            email,
            full_name,
            user_number
          )
        `)
        .eq('address', searchAddress.trim())
        .eq('is_assigned', true)
        .maybeSingle();

      if (walletError) throw walletError;

      if (!wallet) {
        setError('Bu cüzdan adresi sistemde bulunamadı veya henüz atanmamış');
        return;
      }

      if (!wallet.assigned_user_id) {
        setError('Bu cüzdan henüz bir kullanıcıya atanmamış');
        return;
      }

      const { data: balance, error: balanceError } = await supabase
        .from('user_balances')
        .select('usdt_balance, eq_balance')
        .eq('user_id', wallet.assigned_user_id)
        .maybeSingle();

      if (balanceError) console.error('Balance error:', balanceError);

      const { data: deposits } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', wallet.assigned_user_id)
        .eq('type', 'deposit')
        .eq('status', 'completed');

      const { data: withdrawals } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', wallet.assigned_user_id)
        .eq('type', 'withdrawal')
        .eq('status', 'completed');

      const { data: trades } = await supabase
        .from('spot_orders')
        .select('id')
        .eq('user_id', wallet.assigned_user_id);

      const totalDeposits = deposits?.reduce((sum, d) => sum + d.amount, 0) || 0;
      const totalWithdrawals = withdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0;

      const userProfile = Array.isArray(wallet.user_profiles)
        ? wallet.user_profiles[0]
        : wallet.user_profiles;

      setUserInfo({
        user_id: wallet.assigned_user_id,
        user_email: userProfile?.email || 'N/A',
        user_name: userProfile?.full_name || 'Unknown',
        user_number: userProfile?.user_number || 'N/A',
        wallet_address: wallet.address,
        wallet_network: wallet.network,
        assigned_at: wallet.assigned_at,
        usdt_balance: balance?.usdt_balance || 0,
        eq_balance: balance?.eq_balance || 0,
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals,
        total_trades: trades?.length || 0
      });
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Arama sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSendUSDT = async () => {
    if (!userInfo) return;

    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Geçerli bir miktar girin');
      return;
    }

    setSending(true);
    setError('');
    setSuccessMessage('');

    try {
      const { error: balanceError } = await supabase
        .from('user_balances')
        .update({
          usdt_balance: userInfo.usdt_balance + amount
        })
        .eq('user_id', userInfo.user_id);

      if (balanceError) throw balanceError;

      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: userInfo.user_id,
          type: 'deposit',
          amount: amount,
          currency: 'USDT',
          status: 'completed',
          description: `Admin manuel ekleme: ${sendNote || 'Hızlı USDT transferi'}`
        });

      if (txError) throw txError;

      // Log admin action
      await logAdminAction({
        actionType: 'send_usdt',
        actionCategory: 'balance',
        targetUserId: userInfo.user_id,
        details: {
          amount: amount,
          currency: 'USDT',
          wallet_address: userInfo.wallet_address,
          balance_before: userInfo.usdt_balance,
          balance_after: userInfo.usdt_balance + amount,
          note: sendNote || 'Hızlı USDT transferi'
        },
        notes: `Admin ${amount} USDT gönderdi: ${sendNote || 'Wallet lookup üzerinden'}`
      });

      setSuccessMessage(`${amount} USDT başarıyla gönderildi!`);
      setSendAmount('');
      setSendNote('');

      if (userInfo) {
        setUserInfo({
          ...userInfo,
          usdt_balance: userInfo.usdt_balance + amount,
          total_deposits: userInfo.total_deposits + amount
        });
      }
    } catch (err: any) {
      console.error('Send error:', err);
      setError(err.message || 'USDT gönderirken hata oluştu');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Search className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            <h3 className="text-base sm:text-xl font-bold text-white">Cüzdan Sorgula</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4 sm:p-5">
            <h4 className="font-bold text-blue-900 mb-2 flex items-center space-x-2 text-sm sm:text-base">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Cüzdan Adresi ile Kullanıcı Bulma</span>
            </h4>
            <p className="text-sm text-gray-700 mb-4">
              Bir BEP20 veya TRC20 USDT cüzdan adresi yapıştırın. Sistem o cüzdanın hangi kullanıcıya ait olduğunu gösterecek ve direkt USDT gönderebileceksiniz.
            </p>

            <div className="flex space-x-2">
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="0x... veya T... ile başlayan cüzdan adresi"
                className="flex-1 px-3 sm:px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs sm:text-sm break-all"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 sm:px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center space-x-2 text-sm sm:text-base whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Aranıyor...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Sorgula</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium">Hata</div>
                <div className="text-sm">{error}</div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium">Başarılı</div>
                <div className="text-sm">{successMessage}</div>
              </div>
            </div>
          )}

          {userInfo && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-green-900 flex items-center space-x-2">
                    <User className="w-6 h-6" />
                    <span>Kullanıcı Bilgileri</span>
                  </h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    userInfo.wallet_network === 'BEP20'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {userInfo.wallet_network}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-gray-600 text-sm mb-1">
                      <Hash className="w-4 h-4" />
                      <span>User ID</span>
                    </div>
                    <div className="font-bold text-gray-900">{userInfo.user_number}</div>
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-gray-600 text-sm mb-1">
                      <User className="w-4 h-4" />
                      <span>İsim</span>
                    </div>
                    <div className="font-bold text-gray-900">{userInfo.user_name}</div>
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-gray-600 text-sm mb-1">
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                    </div>
                    <div className="font-medium text-gray-900 text-sm">{userInfo.user_email}</div>
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-gray-600 text-sm mb-1">
                      <Clock className="w-4 h-4" />
                      <span>Cüzdan Atanma</span>
                    </div>
                    <div className="font-medium text-gray-900 text-sm">
                      {formatDate(userInfo.assigned_at)}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-gray-600 text-sm mb-2">
                    <Wallet className="w-4 h-4" />
                    <span>Cüzdan Adresi</span>
                  </div>
                  <div className="font-mono text-xs text-gray-900 bg-gray-50 px-3 py-2 rounded break-all">
                    {userInfo.wallet_address}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                  <div className="flex items-center space-x-2 mb-2 opacity-80">
                    <DollarSign className="w-5 h-5" />
                    <span className="text-sm">USDT Bakiyesi</span>
                  </div>
                  <div className="text-2xl font-bold">${userInfo.usdt_balance.toLocaleString()}</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
                  <div className="flex items-center space-x-2 mb-2 opacity-80">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-sm">EQ Bakiyesi</span>
                  </div>
                  <div className="text-2xl font-bold">{userInfo.eq_balance.toLocaleString()}</div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
                  <div className="flex items-center space-x-2 mb-2 opacity-80">
                    <ArrowRight className="w-5 h-5" />
                    <span className="text-sm">Toplam Deposit</span>
                  </div>
                  <div className="text-2xl font-bold">${userInfo.total_deposits.toLocaleString()}</div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
                  <div className="flex items-center space-x-2 mb-2 opacity-80">
                    <Hash className="w-5 h-5" />
                    <span className="text-sm">Toplam Trade</span>
                  </div>
                  <div className="text-2xl font-bold">{userInfo.total_trades}</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-6">
                <h4 className="text-lg font-bold text-yellow-900 flex items-center space-x-2 mb-4">
                  <Send className="w-6 h-6" />
                  <span>Hızlı USDT Gönder</span>
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Miktar (USDT)
                    </label>
                    <input
                      type="number"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      placeholder="100"
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Not (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      value={sendNote}
                      onChange={(e) => setSendNote(e.target.value)}
                      placeholder="Ör: MetaMask'tan gelen deposit"
                      className="w-full px-4 py-3 border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>

                  <button
                    onClick={handleSendUSDT}
                    disabled={sending || !sendAmount}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-bold text-base sm:text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {sending ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Gönderiliyor...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>USDT Gönder</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
