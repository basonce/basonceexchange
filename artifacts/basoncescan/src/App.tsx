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

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/txs" component={Transactions} />
      <Route path="/blocks" component={Blocks} />
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
