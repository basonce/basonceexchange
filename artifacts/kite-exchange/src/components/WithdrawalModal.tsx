import { useState, useEffect } from 'react';
import { X, AlertCircle, Check } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { CRYPTO_NETWORKS, validateAddress, Network } from '../lib/crypto-utils';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  coinSymbol: string;
  coinName: string;
  availableBalance: number;
}

export default function WithdrawalModal({
  isOpen,
  onClose,
  coinSymbol,
  coinName,
  availableBalance
}: WithdrawalModalProps) {
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [addressValid, setAddressValid] = useState<boolean | null>(null);

  const networks = CRYPTO_NETWORKS[coinSymbol] || [];

  useEffect(() => {
    if (networks.length > 0 && !selectedNetwork) {
      setSelectedNetwork(networks[0]);
    }
  }, [networks, selectedNetwork]);

  useEffect(() => {
    if (address && selectedNetwork) {
      const isValid = validateAddress(address, selectedNetwork.id);
      setAddressValid(isValid);
    } else {
      setAddressValid(null);
    }
  }, [address, selectedNetwork]);

  const receiveAmount = selectedNetwork && amount
    ? Math.max(0, parseFloat(amount) - selectedNetwork.withdrawFee)
    : 0;

  const handleWithdraw = async () => {
    if (!address || !amount || !selectedNetwork) {
      alert('Please fill all required fields');
      return;
    }

    if (!addressValid) {
      alert('Invalid address format');
      return;
    }

    const withdrawAmount = parseFloat(amount);

    if (withdrawAmount < selectedNetwork.minWithdraw) {
      alert(`Minimum withdrawal is ${selectedNetwork.minWithdraw} ${coinSymbol}`);
      return;
    }

    if (withdrawAmount > availableBalance) {
      alert('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('minimum_withdrawal_limit')
        .eq('id', user.id)
        .maybeSingle();

      const minWithdrawalLimit = profile?.minimum_withdrawal_limit || 500;

      if (availableBalance < minWithdrawalLimit) {
        alert(
          `⚠️ Withdrawal Limit Not Met!\n\n` +
          `Your balance: $${availableBalance.toFixed(2)} USDT\n` +
          `Minimum required: $${minWithdrawalLimit.toLocaleString()} USDT\n\n` +
          `You need to earn $${(minWithdrawalLimit - availableBalance).toFixed(2)} more.\n\n` +
          `💡 Upgrade your mining equipment in SHOP to:\n` +
          `• Earn faster\n` +
          `• Unlock higher withdrawal limits\n` +
          `• Access premium features`
        );
        setLoading(false);
        return;
      }

      const { data: balance } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', user.id)
        .eq('symbol', coinSymbol)
        .maybeSingle();

      const currentBalance = parseFloat(balance?.balance || '0');

      if (withdrawAmount > currentBalance) {
        alert('Insufficient balance');
        setLoading(false);
        return;
      }

      await supabase.from('withdrawal_transactions').insert({
        user_id: user.id,
        coin_symbol: coinSymbol,
        network: selectedNetwork.id,
        amount: withdrawAmount,
        network_fee: selectedNetwork.withdrawFee,
        receive_amount: receiveAmount,
        destination_address: address,
        status: 'pending'
      });

      await supabase
        .from('user_balances')
        .update({ balance: (currentBalance - withdrawAmount).toString() })
        .eq('user_id', user.id)
        .eq('symbol', coinSymbol);

      alert('Withdrawal request submitted! Admin will process your transaction.');
      setAddress('');
      setAmount('');
      onClose();
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      alert('Failed to submit withdrawal request');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#181A20] rounded-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-[#2B3139]">
          <h2 className="font-bold text-white">Withdraw {coinName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <label className="text-gray-400 mb-2 block">Select Network</label>
            <div className="space-y-2">
              {networks.map((network) => (
                <button
                  key={network.id}
                  onClick={() => setSelectedNetwork(network)}
                  className={`w-full p-3 rounded-lg border transition-colors text-left ${ selectedNetwork?.id === network.id ? 'border-[#F0B90B] bg-[#F0B90B]/10' : 'border-[#2B3139] hover:border-[#474D57]' }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{network.name}</div>
                      <div className="text-gray-400 mt-1">
                        Fee: {network.withdrawFee} {coinSymbol} • Min: {network.minWithdraw} {coinSymbol}
                      </div>
                    </div>
                    {selectedNetwork?.id === network.id && (
                      <Check className="w-5 h-5 text-[#F0B90B]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedNetwork && (
            <>
              <div className="bg-[#2B3139] rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#F0B90B] mt-0.5 flex-shrink-0" />
                  <div className="text-gray-400 space-y-1">
                    <div>• Ensure the address is correct for {selectedNetwork.name}</div>
                    <div>• Minimum withdrawal: {selectedNetwork.minWithdraw} {coinSymbol}</div>
                    <div>• Network fee: {selectedNetwork.withdrawFee} {coinSymbol}</div>
                    <div>• Processing time: {selectedNetwork.estimatedTime}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 mb-2 block">
                    Withdrawal Address <span className="text-[#F6465D]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={`Enter ${selectedNetwork.name} address`}
                      className={`w-full bg-[#2B3139] text-white px-4 py-3 rounded border outline-none ${ addressValid === false ? 'border-[#F6465D]' : addressValid === true ? 'border-[#00FF7F]' : 'border-[#474D57] focus:border-[#F0B90B]' }`}
                    />
                    {addressValid !== null && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {addressValid ? (
                          <Check className="w-5 h-5 text-[#00FF7F]" />
                        ) : (
                          <X className="w-5 h-5 text-[#F6465D]" />
                        )}
                      </div>
                    )}
                  </div>
                  {addressValid === false && (
                    <div className="text-[#F6465D] mt-1">Invalid address format</div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-gray-400">
                      Amount <span className="text-[#F6465D]">*</span>
                    </label>
                    <div className="text-gray-400">
                      Available: <span className="text-white">{availableBalance.toFixed(8)} {coinSymbol}</span>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Min: ${selectedNetwork.minWithdraw} ${coinSymbol}`}
                      className="w-full bg-[#2B3139] text-white px-4 py-3 rounded border border-[#474D57] focus:border-[#F0B90B] outline-none"
                    />
                    <button
                      onClick={() => setAmount(availableBalance.toString())}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium hover:text-[#F0B90B]/80"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                <div className="bg-[#2B3139] rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Network Fee</span>
                    <span className="text-white">{selectedNetwork.withdrawFee} {coinSymbol}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">You Will Receive</span>
                    <span className="text-[#00FF7F] font-bold">{receiveAmount.toFixed(8)} {coinSymbol}</span>
                  </div>
                </div>

                <button
                  onClick={handleWithdraw}
                  disabled={loading || !address || !amount || !addressValid}
                  className="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 disabled:cursor-not-allowed text-black font-bold py-3 rounded transition-colors"
                >
                  {loading ? 'Processing...' : 'Withdraw'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
