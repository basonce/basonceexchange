import { useState, useEffect } from "react";
import { useProfile } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { getDepositAddress } from "@/lib/wallet";
import { CRYPTO_NETWORKS } from "@/lib/networks";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Copy, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export function Receive() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  
  const [coin, setCoin] = useState("USDT");
  const [network, setNetwork] = useState("TRC20");
  const [address, setAddress] = useState("");
  
  const networksForCoin = CRYPTO_NETWORKS[coin] || [];

  useEffect(() => {
    if (!networksForCoin.find(n => n.id === network)) {
      setNetwork(networksForCoin[0]?.id || "");
    }
  }, [coin]);

  useEffect(() => {
    if (!user || !coin || !network) return;
    let mounted = true;
    getDepositAddress(coin, network, user.id).then(addr => {
      if (mounted) setAddress(addr);
    });
    return () => { mounted = false; };
  }, [coin, network, user]);

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <div className="px-4 pt-12 pb-4 bg-background sticky top-0 z-10 flex items-center gap-4">
        <Link href="/" className="p-2"><ChevronLeft className="w-6 h-6" /></Link>
        <h1 className="text-2xl font-bold">Receive</h1>
      </div>

      <div className="flex-1 px-4 flex flex-col items-center pt-8">
        <div className="w-full max-w-sm bg-card rounded-3xl p-8 flex flex-col items-center shadow-lg border border-border">
          <div className="bg-white p-4 rounded-xl mb-6">
            <QRCodeSVG value={address || "loading"} size={200} />
          </div>
          
          <div className="w-full flex gap-2 mb-4">
            <select value={coin} onChange={e => setCoin(e.target.value)} className="flex-1 h-12 bg-secondary rounded-lg px-3 outline-none font-bold">
              {Object.keys(CRYPTO_NETWORKS).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={network} onChange={e => setNetwork(e.target.value)} className="flex-1 h-12 bg-secondary rounded-lg px-3 outline-none font-bold">
              {networksForCoin.map(n => <option key={n.id} value={n.id}>{n.id}</option>)}
            </select>
          </div>

          <p className="text-sm font-mono text-center break-all mb-6 px-4">{address}</p>

          <Button onClick={() => { navigator.clipboard.writeText(address); toast.success("Copied"); }} className="w-full h-12 rounded-full">
            <Copy className="w-4 h-4 mr-2" /> Copy Address
          </Button>
        </div>
      </div>
    </div>
  );
}
