import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { getDepositAddress } from "@/lib/wallet";
import { receivableCoins, networksForCoin, NETWORK_NAMES, INTERNAL_TOKENS, NOWPAY_SUPPORTED } from "@/lib/nowpay-supported";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Copy, ChevronLeft, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Link, useSearch } from "wouter";

export function Receive() {
  const { user } = useAuth();
  const search = useSearch();

  const coins = receivableCoins();
  const requested = new URLSearchParams(search).get("coin")?.toUpperCase() || "";
  const initialCoin = coins.includes(requested) ? requested : "USDT";

  const [coin, setCoin] = useState(initialCoin);
  const [network, setNetwork] = useState(() => networksForCoin(initialCoin)[0] || "");
  const [address, setAddress] = useState("");
  const [extraId, setExtraId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isInternal = INTERNAL_TOKENS.has(coin);
  const networks = networksForCoin(coin);

  useEffect(() => {
    if (!networks.includes(network)) {
      setNetwork(networks[0] || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coin]);

  useEffect(() => {
    setAddress("");
    setExtraId(null);
    setError("");
    if (!user || !coin || isInternal || !network) return;
    if (!NOWPAY_SUPPORTED.has(`${coin}:${network}`)) return;
    let mounted = true;
    setLoading(true);
    getDepositAddress(coin, network).then(res => {
      if (!mounted) return;
      setLoading(false);
      if (res.error || !res.address) {
        setError(res.error || "Could not generate a deposit address.");
      } else {
        setAddress(res.address);
        setExtraId(res.extraId || null);
      }
    });
    return () => { mounted = false; };
  }, [coin, network, user, isInternal]);

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <div className="px-4 pt-12 pb-4 bg-background sticky top-0 z-10 flex items-center gap-4">
        <Link href="/" className="p-2"><ChevronLeft className="w-6 h-6" /></Link>
        <h1 className="text-2xl font-bold">Receive</h1>
      </div>

      <div className="flex-1 px-4 flex flex-col items-center pt-8 pb-10">
        <div className="w-full max-w-sm bg-card rounded-3xl p-8 flex flex-col items-center shadow-lg border border-border">
          <div className="w-full flex gap-2 mb-6">
            <select value={coin} onChange={e => setCoin(e.target.value)} className="flex-1 min-w-0 h-12 bg-secondary rounded-lg px-3 outline-none font-bold">
              {coins.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {!isInternal && (
              <select value={network} onChange={e => setNetwork(e.target.value)} className="flex-1 min-w-0 h-12 bg-secondary rounded-lg px-3 outline-none font-bold">
                {networks.map(n => <option key={n} value={n}>{NETWORK_NAMES[n] || n}</option>)}
              </select>
            )}
          </div>

          {isInternal ? (
            <div className="text-center px-2">
              <p className="font-semibold mb-2">{coin} is a Basonce platform token</p>
              <p className="text-sm text-muted-foreground">
                It has no on-chain deposit address. You can receive {coin} instantly
                from another Basonce user — just share your username or email with them
                and they can use the Send feature.
              </p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Generating your address…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center text-center py-6 px-2">
              <AlertTriangle className="w-8 h-8 text-destructive mb-3" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : address ? (
            <>
              <div className="bg-white p-4 rounded-xl mb-6">
                <QRCodeSVG value={address} size={200} />
              </div>

              <p className="text-xs text-muted-foreground text-center mb-2">
                Send only <span className="font-bold text-foreground">{coin}</span> on the{" "}
                <span className="font-bold text-foreground">{NETWORK_NAMES[network] || network}</span> network to this address.
              </p>

              <p className="text-sm font-mono text-center break-all mb-4 px-4">{address}</p>

              {extraId && (
                <p className="text-xs text-center mb-4 px-2 text-amber-500">
                  Memo / Tag required: <span className="font-mono font-bold">{extraId}</span>
                </p>
              )}

              <Button onClick={() => { navigator.clipboard.writeText(address); toast.success("Copied"); }} className="w-full h-12 rounded-full">
                <Copy className="w-4 h-4 mr-2" /> Copy Address
              </Button>
            </>
          ) : !user ? (
            <p className="text-sm text-muted-foreground py-6">Please sign in to see your deposit address.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
