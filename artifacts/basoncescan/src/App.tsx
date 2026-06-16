import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";

// Pages
import Home from "@/pages/Home";
import Transactions from "@/pages/Transactions";
import Blocks from "@/pages/Blocks";
import BlockDetail from "@/pages/BlockDetail";
import TransactionDetail from "@/pages/TransactionDetail";
import AddressDetail from "@/pages/AddressDetail";
import TokenDetail from "@/pages/TokenDetail";
import TopAccounts from "@/pages/TopAccounts";
import Validators from "@/pages/Validators";
import VerifiedContracts from "@/pages/VerifiedContracts";
import TopTokens from "@/pages/TopTokens";
import Charts from "@/pages/Charts";
import GasTracker from "@/pages/GasTracker";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/txs" component={Transactions} />
      <Route path="/blocks" component={Blocks} />
      <Route path="/accounts" component={TopAccounts} />
      <Route path="/validators" component={Validators} />
      <Route path="/contracts" component={VerifiedContracts} />
      <Route path="/tokens" component={TopTokens} />
      <Route path="/charts" component={Charts} />
      <Route path="/gastracker" component={GasTracker} />
      <Route path="/block/:number" component={BlockDetail} />
      <Route path="/tx/:hash" component={TransactionDetail} />
      <Route path="/address/:hash" component={AddressDetail} />
      <Route path="/token/:address" component={TokenDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
