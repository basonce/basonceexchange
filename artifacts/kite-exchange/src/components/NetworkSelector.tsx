import { ArrowLeft, AlertTriangle, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import StableCoinLogo from './CoinLogo';
import { NOWPAY_SUPPORTED } from '../lib/nowpay-supported';

interface Network {
  id: string;
  network_name: string;
  network_code: string;
  chain_id: string | null;
  contract_address: string | null;
  min_deposit: number;
  confirmations_required: number;
  estimated_arrival_minutes: number;
  withdrawal_fee: number;
  is_mainnet: boolean;
}

interface NetworkSelectorProps {
  coinId: string;
  coinSymbol: string;
  coinName: string;
  coinIconUrl: string | null;
  onClose: () => void;
  onBack?: () => void;
  onSelectNetwork: (network: Network) => void;
}

const NETWORK_SHORT: Record<string, string> = {
  BEP20: 'BSC',
  TRC20: 'TRX',
  ERC20: 'ETH',
  Polygon: 'MATIC',
  BTC: 'BTC',
  SOL: 'SOL',
  AVAX: 'AVAX',
  ADA: 'ADA',
  XRP: 'XRP',
  DOGE: 'DOGE',
  LTC: 'LTC',
  DOT: 'DOT',
  ATOM: 'ATOM',
  ALGO: 'ALGO',
  VET: 'VET',
  FIL: 'FIL',
  ICP: 'ICP',
  NEAR: 'NEAR',
  FTM: 'FTM',
  THETA: 'THETA',
  ARBITRUM: 'ARB',
  OPTIMISM: 'OP',
  BASE: 'BASE',
  AVAXC: 'AVAX-C',
  POLYGON: 'MATIC',
  EGLD: 'EGLD',
  INJ: 'INJ',
  SUI: 'SUI',
  APT: 'APT',
  BCH: 'BCH',
  ETC: 'ETC',
  ZEC: 'ZEC',
  XMR: 'XMR',
  QTUM: 'QTUM',
  ONT: 'ONT',
  ZIL: 'ZIL',
  WAVES: 'WAVES',
  CELO: 'CELO',
};

const NETWORK_FULL: Record<string, string> = {
  BEP20: 'BNB Smart Chain (BEP20)',
  TRC20: 'Tron (TRC20)',
  ERC20: 'Ethereum (ERC20)',
  Polygon: 'Polygon',
  BTC: 'Bitcoin',
  SOL: 'Solana',
  AVAX: 'Avalanche C-Chain',
  ADA: 'Cardano',
  XRP: 'Ripple',
  DOGE: 'Dogecoin',
  LTC: 'Litecoin',
  DOT: 'Polkadot',
  ATOM: 'Cosmos Hub',
  ALGO: 'Algorand',
  VET: 'VeChain',
  FIL: 'Filecoin',
  ICP: 'Internet Computer',
  NEAR: 'NEAR Protocol',
  FTM: 'Fantom Opera',
  THETA: 'Theta Network',
  ARBITRUM: 'Arbitrum One',
  OPTIMISM: 'Optimism',
  BASE: 'Base',
  AVAXC: 'Avalanche C-Chain',
  POLYGON: 'Polygon',
  EGLD: 'MultiversX',
  INJ: 'Injective',
  SUI: 'Sui',
  APT: 'Aptos',
  BCH: 'Bitcoin Cash',
  ETC: 'Ethereum Classic',
  ZEC: 'Zcash',
  XMR: 'Monero',
  QTUM: 'Qtum',
  ONT: 'Ontology',
  ZIL: 'Zilliqa',
  WAVES: 'Waves',
  CELO: 'Celo',
};

export default function NetworkSelector({
  coinId,
  coinSymbol,
  coinName,
  coinIconUrl,
  onClose,
  onBack,
  onSelectNetwork,
}: NetworkSelectorProps) {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  const FALLBACK_NETWORKS: Network[] = [
    {
      id: 'bep20-default',
      network_name: 'BNB Smart Chain (BEP20)',
      network_code: 'BEP20',
      chain_id: '56',
      contract_address: null,
      min_deposit: 0.0001,
      confirmations_required: 1,
      estimated_arrival_minutes: 2,
      withdrawal_fee: 0,
      is_mainnet: true,
    },
    {
      id: 'trc20-default',
      network_name: 'Tron (TRC20)',
      network_code: 'TRC20',
      chain_id: null,
      contract_address: null,
      min_deposit: 1,
      confirmations_required: 20,
      estimated_arrival_minutes: 3,
      withdrawal_fee: 0,
      is_mainnet: true,
    },
  ];

  useEffect(() => {
    loadNetworks();
  }, [coinId]);

  const loadNetworks = async () => {
    try {
      const { data, error } = await supabase
        .from('supported_networks')
        .select('*')
        .eq('coin_id', coinId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const sym = coinSymbol.toUpperCase();
      const all = (data || []) as Network[];
      // Only list networks that can actually generate a real deposit address
      // for this coin. Deduplicate by network_code.
      const seen = new Set<string>();
      const supported = all.filter(n => {
        const code = n.network_code.toUpperCase();
        if (seen.has(code)) return false;
        seen.add(code);
        return NOWPAY_SUPPORTED.has(`${sym}:${code}`);
      });
      if (supported.length > 0) {
        setNetworks(supported);
        setUsingFallback(false);
      } else if (all.length > 0) {
        // No address-capable network — keep the old list so the user still
        // sees the Instant Crypto Deposit guidance on the next screen.
        setNetworks(all);
        setUsingFallback(false);
      } else {
        setNetworks(FALLBACK_NETWORKS);
        setUsingFallback(true);
      }
    } catch (err) {
      console.error('Error loading networks:', err);
      setNetworks(FALLBACK_NETWORKS);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const shortCode = (code: string) => NETWORK_SHORT[code] || code;
  const fullName = (code: string) => NETWORK_FULL[code] || code;
  const isBep20 = (code: string) => code.toUpperCase() === 'BEP20';

  return (
    <div className="fixed inset-0 bg-[#0b0e11] z-[200] flex flex-col">
      <div className="flex items-center px-4 pt-12 pb-4 gap-3">
        <button onClick={onBack || onClose} className="p-1 text-gray-300">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
          {coinIconUrl && (
            <div className="w-6 h-6 rounded-full overflow-hidden bg-[#1e2329] flex items-center justify-center">
              <StableCoinLogo symbol={coinSymbol} dbUrl={coinIconUrl} />
            </div>
          )}
          <h1 className="text-[17px] font-semibold text-white">Deposit {coinSymbol}</h1>
        </div>
        <div className="w-7" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="px-4 pt-2 pb-1">
              <h2 className="text-[17px] font-semibold text-white">Choose Network</h2>
            </div>

            {usingFallback && (
              <div className="mx-4 mt-2 mb-1 p-3 bg-[#1a2535] border border-[#2a4a7f] rounded-xl flex items-start gap-2">
                <Info className="w-4 h-4 text-[#4d9fff] flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-gray-300 leading-relaxed">
                  <span className="text-white font-semibold">{coinSymbol}</span> can be deposited via BEP20 or TRC20 network.
                  Select a network below to receive your deposit address.
                </p>
              </div>
            )}

            <div className="px-4 py-3 space-y-3">
              {networks.map(network => (
                <button
                  key={network.id}
                  onClick={() => onSelectNetwork(network)}
                  className={`w-full text-left rounded-2xl p-4 active:opacity-80 transition-all ${
                    isBep20(network.network_code)
                      ? 'bg-[#1e2329] border border-[#F0B90B]/40 shadow-[0_0_12px_rgba(240,185,11,0.08)]'
                      : 'bg-[#1e2329] border border-[#2b3139]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[16px] font-bold text-white">{shortCode(network.network_code)}</span>
                    <span className="text-[14px] text-gray-400">{fullName(network.network_code)}</span>
                    {isBep20(network.network_code) && (
                      <span className="ml-auto text-[11px] px-2 py-0.5 bg-[#F0B90B]/15 text-[#F0B90B] rounded-full font-medium border border-[#F0B90B]/25">
                        Recommended
                      </span>
                    )}
                    {!network.is_mainnet && !isBep20(network.network_code) && (
                      <span className="ml-auto text-[11px] px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">Testnet</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[13px] text-gray-400">
                      <span>{network.confirmations_required} block confirmation/s</span>
                    </div>
                    <div className="text-[13px] text-gray-400">
                      Min. deposit &gt;{network.min_deposit} {coinSymbol}
                    </div>
                    <div className="text-[13px] text-gray-400">
                      Est. arrival {network.estimated_arrival_minutes} mins
                    </div>
                  </div>
                </button>
              ))}

              {networks.length === 0 && (
                <div className="text-center text-gray-500 py-8 text-sm">No networks available</div>
              )}
            </div>

            <div className="mx-4 mb-4 p-4 bg-[#1e2329] rounded-2xl border border-[#2b3139]">
              <div className="flex gap-3">
                <AlertTriangle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-gray-400 leading-relaxed">
                  Please note that only supported networks on our platform are shown, if you deposit via another network your assets may be lost.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
