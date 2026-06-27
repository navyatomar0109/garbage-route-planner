import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/app-layout";
import Dashboard from "@/pages/dashboard";
import Routes from "@/pages/routes";
import Alerts from "@/pages/alerts";
import Fuel from "@/pages/fuel";
import AiInsights from "@/pages/ai";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/">
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Route>
      <Route path="/routes">
        <AppLayout>
          <Routes />
        </AppLayout>
      </Route>
      <Route path="/alerts">
        <AppLayout>
          <Alerts />
        </AppLayout>
      </Route>
      <Route path="/fuel">
        <AppLayout>
          <Fuel />
        </AppLayout>
      </Route>
      <Route path="/ai">
        <AppLayout>
          <AiInsights />
        </AppLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
