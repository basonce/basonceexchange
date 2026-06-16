import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Zap } from "lucide-react";

export function AuthGate() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    
    try {
      if (isLogin) {
        const res = await signIn(email, password);
        if (res.error) throw new Error(res.error);
        toast.success("Welcome back");
      } else {
        const res = await signUp(email, password, fullName);
        if (res.error) throw new Error(res.error);
        toast.success("Account created successfully");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-black flex items-center justify-center text-foreground">
      <div className="w-full max-w-[440px] h-[100dvh] sm:h-[850px] sm:max-h-[100dvh] bg-background relative flex flex-col px-6 py-12 sm:rounded-[40px] sm:border sm:border-border overflow-hidden">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col justify-center"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-8">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight mb-2">Basonce Wallet</h1>
          <p className="text-muted-foreground text-lg mb-10">
            {isLogin ? "Sign in to access your assets" : "Create a premium wallet"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-muted-foreground">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-card border-border h-14 text-lg px-4 focus-visible:ring-primary"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-card border-border h-14 text-lg px-4 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-card border-border h-14 text-lg px-4 focus-visible:ring-primary"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-medium mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? "Please wait..." : (isLogin ? "Sign In" : "Create Wallet")}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
