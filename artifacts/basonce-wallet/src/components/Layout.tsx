import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Wallet, BarChart2, ArrowLeftRight, Activity, Compass } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const tabs = [
    { href: "/", icon: Wallet, label: "Home" },
    { href: "/markets", icon: BarChart2, label: "Markets" },
    { href: "/swap", icon: ArrowLeftRight, label: "Swap", isCenter: true },
    { href: "/perps", icon: Activity, label: "Perps" },
    { href: "/discover", icon: Compass, label: "Discover" },
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-black flex items-center justify-center font-sans text-foreground">
      <div className="w-full h-[100dvh] max-w-[440px] bg-background relative flex flex-col overflow-hidden sm:h-[850px] sm:max-h-[100dvh] sm:rounded-[40px] sm:border sm:border-border sm:shadow-2xl">
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-[80px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <div className="absolute bottom-0 w-full h-[80px] bg-card border-t border-border flex items-center justify-around px-2 pb-2 z-50">
          {tabs.map((tab) => {
            const isActive = location === tab.href;
            const Icon = tab.icon;

            if (tab.isCenter) {
              return (
                <Link key={tab.href} href={tab.href} className="relative -top-4 flex flex-col items-center justify-center outline-none">
                  <div className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg border-[4px] border-card">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground mt-1">{tab.label}</span>
                </Link>
              );
            }
            
            return (
              <Link key={tab.href} href={tab.href} className="flex flex-col items-center justify-center w-16 h-full gap-1 outline-none">
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  <Icon className="w-6 h-6 relative z-10" />
                </div>
                <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
