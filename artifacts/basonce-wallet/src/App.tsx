import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/Layout";
import { AuthGate } from "@/pages/AuthGate";
import NotFound from "@/pages/not-found";

import { Home } from "@/pages/Home";
import { Send } from "@/pages/Send";
import { Receive } from "@/pages/Receive";
import { Withdraw } from "@/pages/Withdraw";
import { History } from "@/pages/History";
import { Settings } from "@/pages/Settings";
import { Zap } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/send" component={Send} />
        <Route path="/receive" component={Receive} />
        <Route path="/withdraw" component={Withdraw} />
        <Route path="/history" component={History} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center">
        <Zap className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <AuthGate />;
  }

  return <ProtectedRoutes />;
}

function App() {
  // Adding the 'dark' class globally
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('dark');
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppContent />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
