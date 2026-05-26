import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { JournalProvider } from './contexts/JournalContext';
import { AuthProvider } from './contexts/AuthContext';
import { DraftsProvider } from './contexts/DraftsContext';
import { NowPlayingProvider } from './contexts/NowPlayingContext';
import { WeatherOverlayProvider } from './contexts/WeatherOverlayContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Index from './pages/Index';
import { useVisitLogger } from './hooks/useVisitLogger';

// Code-split secondary routes. Index stays eager because it's the landing/home
// page and we don't want a loader flash on first paint. Everything else
// (Auth, Settings, Habits, Memories, About, NotFound) is gated behind a
// click and tolerates a brief loader.
const Memories = lazy(() => import('./pages/Memories'));
const Auth = lazy(() => import('./pages/Auth'));
const Settings = lazy(() => import('./pages/Settings'));
const Habits = lazy(() => import('./pages/Habits'));
const About = lazy(() => import('./pages/About'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient();

const VisitLogger = ({ children }: { children: React.ReactNode }) => {
  useVisitLogger();
  return <>{children}</>;
};

const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <ErrorBoundary scope="App">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <VisitLogger>
            <JournalProvider>
              <DraftsProvider>
                <NowPlayingProvider>
                  <WeatherOverlayProvider>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                      <ErrorBoundary scope="Routes">
                        <Suspense fallback={<RouteFallback />}>
                          <Routes>
                            <Route path="/auth" element={<Auth />} />
                            <Route path="/about" element={<About />} />
                            <Route path="/" element={<Index />} />
                            <Route
                              path="/memories"
                              element={
                                <ProtectedRoute>
                                  <Memories />
                                </ProtectedRoute>
                              }
                            />
                            <Route path="/archive" element={<Navigate to="/memories" replace />} />
                            <Route path="/callback" element={<Navigate to="/" replace />} />
                            <Route
                              path="/habits"
                              element={
                                <ProtectedRoute>
                                  <Habits />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/settings"
                              element={
                                <ProtectedRoute>
                                  <Settings />
                                </ProtectedRoute>
                              }
                            />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </Suspense>
                      </ErrorBoundary>
                    </BrowserRouter>
                  </WeatherOverlayProvider>
                </NowPlayingProvider>
              </DraftsProvider>
            </JournalProvider>
          </VisitLogger>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
