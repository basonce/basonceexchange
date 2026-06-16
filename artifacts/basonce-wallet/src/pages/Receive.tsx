import { useState, useEffect } from "react";
import { useProfile } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { getDepositAddress } from "@/lib/wallet";
import { CRYPTO_NETWORKS } from "@/lib/networks";
import { QRCodeSVG } from "qrcode.react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Copy, ArrowDownLeft } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export function Receive() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  
  const [coin, setCoin] = useState("USDT");
  const [network, setNetwork] = useState("TRC20");
  const [address, setAddress] = useState("");
  const [loadingAddr, setLoadingAddr] = useState(false);

  const networksForCoin = CRYPTO_NETWORKS[coin] || [];

  // Reset network if it's not available for the new coin
  useEffect(() => {
    if (!networksForCoin.find(n => n.id === network)) {
      setNetwork(networksForCoin[0]?.id || "");
    }
  }, [coin]);

  useEffect(() => {
    if (!user || !coin || !network) return;
    let mounted = true;
    setLoadingAddr(true);
    getDepositAddress(coin, network, user.id).then(addr => {
      if (mounted) {
        setAddress(addr);
        setLoadingAddr(false);
      }
    });
    return () => { mounted = false; };
  }, [coin, network, user]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const payId = profile?.email || profile?.userIdDisplay || user?.id || "";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-6 pt-12 pb-20 flex flex-col h-full"
    >
      <div className="mb-8">
        <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mb-4">
          <ArrowDownLeft className="w-6 h-6 text-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Receive</h1>
      </div>

      <Tabs defaultValue="basonce" className="w-full flex-1 flex flex-col">
        <TabsList className="w-full h-12 bg-card p-1 rounded-xl mb-8 border border-border shrink-0">
          <TabsTrigger value="basonce" className="w-1/2 rounded-lg text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Internal (Free)</TabsTrigger>
          <TabsTrigger value="crypto" className="w-1/2 rounded-lg text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">External Crypto</TabsTrigger>
        </TabsList>

        <TabsContent value="basonce" className="mt-0 focus:outline-none flex-1 flex flex-col">
          <div className="bg-card rounded-[32px] p-8 border border-border flex flex-col items-center flex-1 justify-center">
            <div className="bg-white p-4 rounded-2xl mb-6 shadow-xl">
              <QRCodeSVG value={payId} size={200} />
            </div>
            <p className="text-muted-foreground mb-2 text-xs uppercase tracking-wider font-semibold">Your Basonce Pay ID</p>
            <p className="font-bold text-lg mb-8 text-center break-all">{payId}</p>
            <Button variant="outline" className="w-full h-14 text-lg border-border hover:bg-secondary" onClick={() => copyToClipboard(payId)}>
              <Copy className="w-5 h-5 mr-2" /> Copy Pay ID
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground px-4 mt-6">
            Show this QR code to another Basonce user to receive funds instantly with zero fees.
          </p>
        </TabsContent>

        <TabsContent value="crypto" className="mt-0 focus:outline-none flex flex-col space-y-6">
          <div className="space-y-4">
            <Select value={coin} onValueChange={setCoin}>
              <SelectTrigger className="h-14 bg-card border-border text-lg px-4">
                <SelectValue placeholder="Select coin" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(CRYPTO_NETWORKS).map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {networksForCoin.length > 0 && (
              <Select value={network} onValueChange={setNetwork}>
                <SelectTrigger className="h-14 bg-card border-border text-lg px-4">
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {networksForCoin.map(n => (
                    <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="bg-card rounded-[32px] p-8 border border-border flex flex-col items-center">
            {loadingAddr ? (
              <div className="w-[200px] h-[200px] bg-secondary animate-pulse rounded-2xl mb-6" />
            ) : (
              <div className="bg-white p-4 rounded-2xl mb-6 shadow-xl">
                <QRCodeSVG value={address} size={200} />
              </div>
            )}
            
            <p className="text-muted-foreground mb-2 text-xs uppercase tracking-wider font-semibold">Deposit Address</p>
            <div className="w-full bg-secondary/50 rounded-xl p-4 mb-6 break-all text-sm text-center font-mono">
              {loadingAddr ? "Generating address..." : address || "No address available"}
            </div>
            <Button variant="outline" className="w-full h-14 text-lg border-border hover:bg-secondary" onClick={() => copyToClipboard(address)} disabled={loadingAddr || !address}>
              <Copy className="w-5 h-5 mr-2" /> Copy Address
            </Button>
          </div>
          
          {networksForCoin.find(n => n.id === network) && (
            <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-2">
              <p>• Minimum deposit: <span className="font-medium text-foreground">{networksForCoin.find(n => n.id === network)?.minDeposit} {coin}</span></p>
              <p>• Expected time: <span className="font-medium text-foreground">{networksForCoin.find(n => n.id === network)?.estimatedTime}</span></p>
              <p className="text-primary font-medium mt-2">Send only {coin} on the {network} network to this address. Other assets will be lost.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
