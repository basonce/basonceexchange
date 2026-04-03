import { useState, useEffect } from 'react';
import { X, Copy, Check, AlertCircle, Globe, ArrowRight } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { CRYPTO_NETWORKS, generateDepositAddress, generateQRCodeUrl, Network } from '../lib/crypto-utils';
import P2PModal from './P2PModal';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  coinSymbol: string;
  coinName: string;
}

export default function DepositModal({ isOpen, onClose, coinSymbol, coinName }: DepositModalProps) {
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [depositAddress, setDepositAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [txid, setTxid] = useState('');
  const [showP2P, setShowP2P] = useState(false);

  const networks = CRYPTO_NETWORKS[coinSymbol] || [];

  useEffect(() => {
    if (networks.length > 0 && !selectedNetwork) {
      setSelectedNetwork(networks[0]);
    }
  }, [networks, selectedNetwork]);

  useEffect(() => {
    if (selectedNetwork) {
      loadOrCreateDepositAddress();
    }
  }, [selectedNetwork]);

  const loadOrCreateDepositAddress = async () => {
    try {
      const user = await getCurrentUser();
      if (!user || !selectedNetwork) return;

      const { data: existingAddress } = await supabase
        .from('deposit_addresses')
        .select('address')
        .eq('user_id', user.id)
        .eq('coin_symbol', coinSymbol)
        .eq('network', selectedNetwork.id)
        .maybeSingle();

      if (existingAddress) {
        setDepositAddress(existingAddress.address);
      } else {
        const newAddress = generateDepositAddress(coinSymbol, selectedNetwork.id, user.id);
        await supabase.from('deposit_addresses').insert({
          user_id: user.id,
          coin_symbol: coinSymbol,
          network: selectedNetwork.id,
          address: newAddress
        });
        setDepositAddress(newAddress);
      }
    } catch (error) {
      console.error('Error loading deposit address:', error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (selectedNetwork && parseFloat(amount) < selectedNetwork.minDeposit) {
      alert(`Minimum deposit is ${selectedNetwork.minDeposit} ${coinSymbol}`);
      return;
    }

    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user || !selectedNetwork) return;

      await supabase.from('deposit_transactions').insert({
        user_id: user.id,
        coin_symbol: coinSymbol,
        network: selectedNetwork.id,
        amount: parseFloat(amount),
        address: depositAddress,
        txid: txid || null,
        status: 'pending'
      });

      alert('Deposit request submitted! Admin will confirm your transaction.');
      setAmount('');
      setTxid('');
      onClose();
    } catch (error) {
      console.error('Error submitting deposit:', error);
      alert('Failed to submit deposit request');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isUSDT = coinSymbol === 'USDT';
  const trc20Network = networks.find(n => n.id === 'trc20') || networks[0];

  return (
    <>
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-[#181A20] rounded-xl w-full max-w-[420px] max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-[#2B3139]">
            <h2 className="font-bold text-white text-base">Deposit {coinName}</h2>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#2B3139] text-gray-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4">
            {isUSDT && (
              <button
                onClick={() => setShowP2P(true)}
                className="w-full mb-4 bg-gradient-to-r from-[#F0B90B]/15 to-[#0ECB81]/10 border border-[#F0B90B]/30 rounded-xl p-3.5 flex items-center gap-3 hover:from-[#F0B90B]/25 hover:to-[#0ECB81]/15 transition-all group"
              >
                <div className="w-10 h-10 bg-[#F0B90B]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-[#F0B90B]" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-bold text-white">Buy with Local Currency</div>
                  <div className="text-xs text-gray-400 mt-0.5">100+ countries · TRY, EUR, USD, NGN & more</div>
                </div>
                <div className="flex items-center gap-1 text-[#F0B90B] text-xs font-semibold">
                  P2P <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            )}

            <div className="mb-4">
              <label className="text-gray-400 text-xs mb-2 block font-medium">Select Network</label>
              <div className="space-y-2">
                {networks.map((network) => (
                  <button
                    key={network.id}
                    onClick={() => setSelectedNetwork(network)}
                    className={`w-full p-3 rounded-xl border transition-colors text-left ${
                      selectedNetwork?.id === network.id
                        ? 'border-[#F0B90B] bg-[#F0B90B]/10'
                        : 'border-[#2B3139] hover:border-[#474D57]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium text-sm">{network.name}</div>
                        <div className="text-gray-400 text-xs mt-0.5">
                          Fee: {network.withdrawFee} {coinSymbol} · {network.estimatedTime}
                        </div>
                      </div>
                      {selectedNetwork?.id === network.id && (
                        <Check className="w-4 h-4 text-[#F0B90B]" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedNetwork && depositAddress && (
              <>
                <div className="bg-[#2B3139] rounded-xl p-3.5 mb-4">
                  <div className="text-gray-400 text-xs mb-2 font-medium">Deposit Address</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={depositAddress}
                      readOnly
                      className="flex-1 bg-[#181A20] text-xs px-3 py-2 rounded-lg border border-[#474D57] font-mono text-gray-200"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="p-2 bg-[#F0B90B] hover:bg-[#F0B90B]/90 rounded-lg transition-colors flex-shrink-0"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <Copy className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-center mb-4">
                  <div className="bg-white p-3 rounded-xl">
                    <img
                      src={generateQRCodeUrl(depositAddress)}
                      alt="QR Code"
                      className="w-44 h-44"
                    />
                  </div>
                </div>

                <div className="bg-[#2B3139] rounded-xl p-3.5 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-[#F0B90B] mt-0.5 flex-shrink-0" />
                    <div className="text-gray-400 text-xs space-y-1">
                      <div>Send only {coinSymbol} to this address via {selectedNetwork.name}</div>
                      <div>Minimum deposit: {selectedNetwork.minDeposit} {coinSymbol}</div>
                      <div>Required confirmations: {selectedNetwork.confirmations}</div>
                      <div>Estimated arrival: {selectedNetwork.estimatedTime}</div>
                    </div>
                  </div>
                </div>

                {isUSDT && (
                  <div className="bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-xl p-3 mb-4">
                    <div className="text-xs text-gray-300 flex items-start gap-2">
                      <Globe className="w-4 h-4 text-[#0ECB81] flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[#0ECB81] font-semibold">No crypto yet?</span> Use P2P to buy USDT with your local currency (TRY, EUR, USD, etc.) and send it to this address.
                        <button onClick={() => setShowP2P(true)} className="text-[#F0B90B] underline ml-1">Open P2P</button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-gray-400 text-xs mb-2 block font-medium">
                      Amount <span className="text-[#F6465D]">*</span>
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Min: ${selectedNetwork.minDeposit} ${coinSymbol}`}
                      className="w-full bg-[#2B3139] text-white px-4 py-3 rounded-xl border border-[#474D57] focus:border-[#F0B90B] outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-xs mb-2 block font-medium">
                      Transaction ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={txid}
                      onChange={(e) => setTxid(e.target.value)}
                      placeholder="Enter TxID if you already sent"
                      className="w-full bg-[#2B3139] text-white px-4 py-3 rounded-xl border border-[#474D57] focus:border-[#F0B90B] outline-none text-sm"
                    />
                  </div>

                  <button
                    onClick={handleConfirmDeposit}
                    disabled={loading || !amount}
                    className="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition-colors text-sm"
                  >
                    {loading ? 'Submitting...' : 'Confirm Deposit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <P2PModal
        isOpen={showP2P}
        onClose={() => setShowP2P(false)}
        depositAddress={depositAddress}
        depositNetwork={selectedNetwork?.name || 'TRC20'}
      />
    </>
  );
}
