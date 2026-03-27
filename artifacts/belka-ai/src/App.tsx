import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { initTheme, ThemeContext, useThemeProvider } from "@/lib/theme";
import { AuthContext, useAuthProvider, useAuth } from "@/lib/auth";
import { lazy, Suspense } from "react";

const Home = lazy(() => import("./pages/Home"));
const ChatPage = lazy(() => import("./pages/chat/Chat"));
const AuthPage = lazy(() => import("./pages/Auth"));
const DocsPage = lazy(() => import("./pages/Docs"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminModels = lazy(() => import("./pages/admin/Models"));
const AdminAgents = lazy(() => import("./pages/admin/Agents"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminSubscriptions = lazy(() => import("./pages/admin/Subscriptions"));
const AdminVoiceAssistant = lazy(() => import("./pages/admin/VoiceAssistant"));
const AdminReferrals = lazy(() => import("./pages/admin/Referrals"));
const SharedChat = lazy(() => import("./pages/shared/SharedChat"));

initTheme();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    }
  }
});

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AdminGuard({ component: Component }: { component: React.ComponentType }) {
  const auth = useAuth();
  if (auth.loading) {
    return <PageLoader />;
  }
  if (!auth.user || auth.user.role !== "admin") {
    return <Redirect to="/chat" />;
  }
  return <Component />;
}

function AuthGuard({ component: Component }: { component: React.ComponentType }) {
  const auth = useAuth();
  if (auth.loading) {
    return <PageLoader />;
  }
  if (!auth.user) {
    return <Redirect to="/auth" />;
  }
  return <Component />;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />

        <Route path="/auth" component={AuthPage} />
        <Route path="/docs" component={DocsPage} />

        <Route path="/chat">{() => <AuthGuard component={ChatPage} />}</Route>
        <Route path="/chat/:id">{() => <AuthGuard component={ChatPage} />}</Route>
        <Route path="/shared/:token" component={SharedChat} />

        <Route path="/admin">{() => <AdminGuard component={AdminDashboard} />}</Route>
        <Route path="/admin/models">{() => <AdminGuard component={AdminModels} />}</Route>
        <Route path="/admin/agents">{() => <AdminGuard component={AdminAgents} />}</Route>
        <Route path="/admin/users">{() => <AdminGuard component={AdminUsers} />}</Route>
        <Route path="/admin/subscriptions">{() => <AdminGuard component={AdminSubscriptions} />}</Route>
        <Route path="/admin/referrals">{() => <AdminGuard component={AdminReferrals} />}</Route>
        <Route path="/admin/voice">{() => <AdminGuard component={AdminVoiceAssistant} />}</Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const auth = useAuthProvider();
  const themeCtx = useThemeProvider();

  return (
    <AuthContext.Provider value={auth}>
      <ThemeContext.Provider value={themeCtx}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;
