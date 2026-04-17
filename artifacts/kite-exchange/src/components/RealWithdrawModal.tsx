import { useState, useEffect } from 'react';
import { X, AlertCircle, ExternalLink, Shield, Lock, TrendingUp, ShieldAlert, Smartphone, Loader2 } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { blockchainProvider } from '../lib/blockchain-provider';
import { WITHDRAWAL_FEES, BLOCKCHAIN_NETWORKS, isMainnet, getNetworkDisplayInfo, type NetworkKey } from '../lib/blockchain-config';
import { checkWithdrawalPermission } from '../lib/withdrawal-permission';
import { getUserRestrictions } from '../lib/user-restrictions';

interface RealWithdrawModalProps {
  onClose: () => void;
  currency: string;
  network: string;
  availableBalance: number;
}

export function RealWithdrawModal({
  onClose,
  currency,
  network: initialNetwork,
  availableBalance
}: RealWithdrawModalProps) {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey>(initialNetwork as NetworkKey);
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [withdrawalId, setWithdrawalId] = useState('');
  const [showMainnetWarning, setShowMainnetWarning] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const [requiredTierPrice, setRequiredTierPrice] = useState(0);
  const [currentTier, setCurrentTier] = useState(0);
  const [assetLocked, setAssetLocked] = useState(false);
  const [allowedWithdrawalAsset, setAllowedWithdrawalAsset] = useState('BTC');
  const [customFeeUsdt, setCustomFeeUsdt] = useState(0);

  useEffect(() => {
    if (isMainnet(selectedNetwork)) {
      setShowMainnetWarning(true);
    }
    checkPermission();
    checkRestrictions();
  }, []);

  const checkPermission = async () => {
    const user = await getCurrentUser();
    if (!user) return;

    const permission = await checkWithdrawalPermission(user.id);
    if (!permission.allowed) {
      setIsBlocked(true);
      setBlockMessage(permission.message || '');
      setRequiredTierPrice(permission.requiredTier?.price || 0);
      setCurrentTier(permission.currentTier);
    }
  };

  const checkRestrictions = async () => {
    const r = await getUserRestrictions();
    if (!r) return;
    if (r.pair_lock_enabled) {
      const withdrawAsset = r.withdrawal_asset || 'BTC';
      setAllowedWithdrawalAsset(withdrawAsset);
      if (currency !== withdrawAsset) {
        setAssetLocked(true);
      }
    }
    if (r.withdrawal_fee_usdt && r.withdrawal_fee_usdt > 0) {
      setCustomFeeUsdt(r.withdrawal_fee_usdt);
    }
  };

  const fee = WITHDRAWAL_FEES[currency as keyof typeof WITHDRAWAL_FEES] || 0;
  const total = parseFloat(amount || '0') + fee;

  const validateAddress = () => {
    if (!toAddress.trim()) {
      setError('Please enter withdrawal address');
      return false;
    }

    if (!blockchainProvider.isValidAddress(toAddress)) {
      setError('Invalid wallet address');
      return false;
    }

    return true;
  };

  const validateAmount = () => {
    const amt = parseFloat(amount);

    if (!amount || amt <= 0) {
      setError('Please enter valid amount');
      return false;
    }

    if (total > availableBalance) {
      setError('Insufficient balance (including fee)');
      return false;
    }

    return true;
  };

  // 2FA challenge state for withdrawal protection
  const [mfaFactor, setMfaFactor] = useState<{ id: string; challengeId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);

  const requestMfaChallenge = async (): Promise<boolean> => {
    // Returns true to proceed without MFA, false if MFA prompt is now shown.
    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verified = factorsData?.totp?.find((f: any) => f.status === 'verified');
      if (!verified) return true;
      const { data: chal, error } = await supabase.auth.mfa.challenge({ factorId: verified.id });
      if (error || !chal) return true;
      setMfaFactor({ id: verified.id, challengeId: chal.id });
      setMfaCode('');
      setMfaError('');
      return false;
    } catch {
      return true;
    }
  };

  const verifyMfaAndContinue = async () => {
    if (!mfaFactor || mfaCode.length !== 6) return;
    setMfaBusy(true); setMfaError('');
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaFactor.id, challengeId: mfaFactor.challengeId, code: mfaCode,
      });
      if (error) throw error;
      setMfaFactor(null);
      setMfaCode('');
      // Continue with actual withdrawal
      await doWithdraw();
    } catch (e: any) {
      setMfaError(e?.message || 'Invalid code. Try again.');
    }
    setMfaBusy(false);
  };

  const handleWithdraw = async () => {
    setError('');

    if (!validateAddress() || !validateAmount()) {
      return;
    }

    // 2FA gate: if user has Google Authenticator enabled, require code first
    const proceed = await requestMfaChallenge();
    if (!proceed) return;
    await doWithdraw();
  };

  const doWithdraw = async () => {

    if (customFeeUsdt > 0) {
      const user = await getCurrentUser();
      if (user) {
        const { data: usdtBal } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('user_id', user.id)
          .eq('symbol', 'USDT')
          .maybeSingle();
        const usdtAvailable = parseFloat(usdtBal?.balance ?? '0');
        if (usdtAvailable < customFeeUsdt) {
          setError(`Insufficient USDT balance for service fee. You need ${customFeeUsdt} USDT but have ${usdtAvailable.toFixed(2)} USDT.`);
          return;
        }
      }
    }

    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Please login first');
        return;
      }

      if (customFeeUsdt > 0 && session.user) {
        const { data: usdtRow } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('user_id', session.user.id)
          .eq('symbol', 'USDT')
          .maybeSingle();
        if (usdtRow) {
          const newBal = Math.max(0, parseFloat(usdtRow.balance) - customFeeUsdt);
          await supabase.from('user_balances')
            .update({ balance: newBal, updated_at: new Date().toISOString() })
            .eq('user_id', session.user.id)
            .eq('symbol', 'USDT');
          await supabase.from('transactions').insert({
            user_id: session.user.id,
            type: 'withdrawal_fee',
            symbol: 'USDT',
            amount: customFeeUsdt,
            status: 'completed',
            description: `Service fee for ${currency} withdrawal`,
          });
        }
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crypto-withdraw`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create',
            currency,
            network: selectedNetwork,
            amount: parseFloat(amount),
            toAddress: toAddress.trim(),
            fee
          })
        }
      );

      const result = await response.json();

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setWithdrawalId(result.withdrawal.id);
      }
    } catch (err) {
      setError('Failed to process withdrawal');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getNetworkName = () => {
    return BLOCKCHAIN_NETWORKS[selectedNetwork].name;
  };

  const handleNetworkChange = (network: NetworkKey) => {
    setSelectedNetwork(network);
    setError('');
  };

  const networkInfo = getNetworkDisplayInfo(selectedNetwork);

  if (isBlocked) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-[#181A20] w-full max-w-[480px] rounded-2xl p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="font-bold text-white text-xl mb-3">
              Withdrawal Locked
            </h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              {blockMessage}
            </p>

            <div className="bg-[#2B3139] rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Your Progress</span>
                <span className="text-white font-semibold">Tier {currentTier}/5</span>
              </div>
              <div className="h-2 bg-[#1A1B23] rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 transition-all"
                  style={{ width: `${(currentTier / 5) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-left text-sm">
                  <div className="font-semibold text-yellow-400 mb-1">
                    Unlock Withdrawal Access
                  </div>
                  <div className="text-gray-300">
                    Upgrade to the next tier to continue earning and unlock withdrawal capabilities.
                  </div>
                  {requiredTierPrice > 0 && (
                    <div className="mt-2 text-white font-semibold">
                      Next upgrade: ${requiredTierPrice.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-semibold py-3 rounded-lg transition-colors"
            >
              Go to Mining Shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (assetLocked) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-[#181A20] w-full max-w-[480px] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white">Withdraw {currency}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-10 h-10 text-orange-400" />
            </div>
            <h3 className="font-bold text-white text-xl mb-3">Withdrawal Restricted</h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Your account is configured for {allowedWithdrawalAsset}-only withdrawals. To withdraw funds, please convert your assets to <span className="text-yellow-400 font-semibold">{allowedWithdrawalAsset}</span> first.
            </p>
            <div className="bg-[#2B3139] rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <div className="text-sm text-gray-300">
                  Only <span className="text-white font-semibold">{allowedWithdrawalAsset}</span> withdrawals are available for your account. Other assets cannot be withdrawn directly.
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-semibold py-3 rounded-lg transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showMainnetWarning && isMainnet(selectedNetwork)) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-[#181A20] w-full max-w-[480px] rounded-2xl p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="font-bold text-white mb-3">
              MAINNET WITHDRAWAL WARNING
            </h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              You are about to withdraw <span className="text-red-400 font-bold">REAL {currency}</span> on <span className="text-red-400 font-bold">{getNetworkName()}</span>.
            </p>

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-left">
              <div className="text-sm space-y-2">
                <div className="font-semibold mb-2">CRITICAL WARNINGS:</div>
                <ul className="list-inside space-y-1">
                  <li>Withdrawals are 100% IRREVERSIBLE</li>
                  <li>Wrong address = PERMANENT loss of funds</li>
                  <li>Wrong network = PERMANENT loss of funds</li>
                  <li>Triple-check the recipient address</li>
                  <li>Ensure recipient supports {getNetworkName()}</li>
                  <li>Start with a test transaction (small amount)</li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-6">
              <div className="text-xs">
                <strong>SCAM WARNING:</strong> Never send to addresses from emails, DMs, or unknown sources. Always verify addresses through official channels.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowMainnetWarning(false)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                I Accept the Risks
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-[#181A20] w-full max-w-[480px] rounded-2xl p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="text-4xl">✓</div>
            </div>
            <h3 className="font-semibold text-white mb-2">
              Withdrawal Requested
            </h3>
            <p className="text-gray-400 mb-6">
              Your withdrawal request has been submitted and is pending approval.
            </p>

            <div className="bg-[#2B3139] rounded-lg p-4 mb-6 text-left">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount</span>
                  <span className="text-white font-semibold">{amount} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fee</span>
                  <span className="text-white">{fee} {currency}</span>
                </div>
                <div className="border-gray-600 pt-2 flex justify-between">
                  <span className="text-gray-400">Total</span>
                  <span className="text-white font-semibold">{total.toFixed(6)} {currency}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <div className="text-sm">
                <div className="font-semibold mb-1">Processing Time</div>
                <div>Your withdrawal will be processed within 24 hours. You'll receive a notification once completed.</div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-semibold py-3 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mfaFactor) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-[#181A20] w-full max-w-md rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F0B90B]/10 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-[#F0B90B]" />
              </div>
              <div>
                <h2 className="font-bold text-white">Withdrawal Verification</h2>
                <p className="text-xs text-gray-400">Open Google Authenticator</p>
              </div>
            </div>
            <button onClick={() => { setMfaFactor(null); setMfaCode(''); }} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-[#0B0E11] rounded-lg p-3 mb-3 text-xs">
            <div className="flex justify-between text-gray-400 mb-1"><span>Amount</span><span className="text-white font-mono">{amount} {currency}</span></div>
            <div className="flex justify-between text-gray-400 mb-1"><span>Network</span><span className="text-white">{selectedNetwork}</span></div>
            <div className="flex justify-between text-gray-400"><span>To</span><span className="text-white font-mono truncate ml-2 max-w-[180px]">{toAddress}</span></div>
          </div>
          <p className="text-xs text-gray-400 mb-3">Enter the 6-digit code from your authenticator app to confirm this withdrawal.</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full bg-[#0B0E11] text-white text-center text-3xl tracking-[0.5em] font-mono rounded-lg p-4 border border-[#2B3139] focus:border-[#F0B90B] outline-none mb-3"
            autoFocus
          />
          {mfaError && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs mb-3 flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {mfaError}
          </div>}
          <button
            onClick={verifyMfaAndContinue}
            disabled={mfaCode.length !== 6 || mfaBusy}
            className="w-full bg-[#F0B90B] text-black rounded-lg py-3 font-bold disabled:opacity-40"
          >
            {mfaBusy ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Withdrawal'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#181A20] w-full rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-white">
                Withdraw {currency}
              </h2>
              <div className={`text-xs font-semibold mt-1 ${networkInfo.badgeColor}`}>
                {networkInfo.badge}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          {isMainnet(selectedNetwork) && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2 text-xs">
                <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-1">MAINNET - REAL MONEY</div>
                  <div className="text-red-300">Withdrawals are irreversible. Double-check everything.</div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="text-gray-400 mb-2 block">Select Network</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(BLOCKCHAIN_NETWORKS).map((net) => {
                const network = net as NetworkKey;
                const info = getNetworkDisplayInfo(network);
                const isSelected = network === selectedNetwork;

                return (
                  <button
                    key={network}
                    onClick={() => handleNetworkChange(network)}
                    className={`p-3 rounded-lg border-2 transition-all ${ isSelected ? 'border-[#F0B90B] bg-[#F0B90B]/10' : 'border-gray-600 bg-[#2B3139] hover:border-gray-500' }`}
                  >
                    <div className="font-semibold text-sm mb-1">
                      {info.name}
                    </div>
                    <div className={`text-xs font-semibold ${info.badgeColor}`}>
                      {info.badge}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-[#2B3139] rounded-lg p-4 mb-4">
            <div className="text-gray-400 mb-2">Available Balance</div>
            <div className="font-semibold text-lg">
              {availableBalance.toFixed(6)} {currency}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-gray-400 mb-2 block">
              Withdrawal Address
            </label>
            <input
              type="text"
              placeholder="Enter recipient wallet address"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              className="w-full bg-[#2B3139] text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[#F0B90B] outline-none"
            />
          </div>

          <div className="mb-4">
            <label className="text-gray-400 mb-2 block">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#2B3139] text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-[#F0B90B] outline-none pr-20"
                step="0.000001"
                min="0"
              />
              <button
                onClick={() => setAmount((availableBalance - fee).toFixed(6))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold hover:text-[#F0B90B]/80"
              >
                MAX
              </button>
            </div>
          </div>

          {customFeeUsdt > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-orange-400 mb-1">Custom Withdrawal Fee</div>
                  <div className="text-sm text-gray-300">
                    A service fee of <span className="text-white font-bold">{customFeeUsdt} USDT</span> applies to your account. This will be deducted from your USDT balance.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[#2B3139] rounded-lg p-4 mb-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Network Fee</span>
                <span className="text-white">{fee} {currency}</span>
              </div>
              {customFeeUsdt > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Service Fee</span>
                  <span className="text-orange-400 font-semibold">{customFeeUsdt} USDT</span>
                </div>
              )}
              <div className="border-gray-700 pt-2 flex justify-between">
                <span className="text-gray-400">You will receive</span>
                <span className="text-white font-semibold">
                  {amount ? parseFloat(amount).toFixed(6) : '0.000000'} {currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total deducted</span>
                <span className="text-white font-semibold">
                  {total.toFixed(6)} {currency}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
            <div className="text-xs space-y-1">
              <div className="font-semibold flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4" />
                Important
              </div>
              <ul className="list-inside space-y-1">
                <li>Double-check the withdrawal address</li>
                <li>Withdrawals are irreversible</li>
                <li>Processing time: up to 24 hours</li>
                <li>Make sure address supports {getNetworkName()}</li>
              </ul>
            </div>
          </div>

          <button
            onClick={handleWithdraw}
            disabled={loading}
            className="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg transition-colors mb-3"
          >
            {loading ? 'Processing...' : 'Confirm Withdrawal'}
          </button>

          <button
            onClick={onClose}
            className="w-full bg-[#2B3139] hover:bg-[#353D47] text-white py-3 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
