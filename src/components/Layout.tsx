
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AuthButtons } from './AuthButtons';
import { Notebook, Sparkles, Settings, Menu, X, ListChecks } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOnThisDayIndicator } from '@/hooks/useOnThisDayIndicator';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { showDot: showMemoriesDot } = useOnThisDayIndicator();

  const isActive = (pathname: string) => {
    return location.pathname === pathname;
  };

  // Check if the current route is the auth page
  const isAuthPage = location.pathname === '/auth';

  const navLinks = [
    { to: '/', icon: Notebook, label: 'Journal', showDot: false },
    { to: '/habits', icon: ListChecks, label: 'Habits', showDot: false },
    { to: '/memories', icon: Sparkles, label: 'Memories', showDot: showMemoriesDot },
    { to: '/settings', icon: Settings, label: 'Settings', showDot: false },
  ];

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-x-0 top-0 border-b border-border/50 bg-background/80 backdrop-blur-sm z-50">
        <div className="container px-4 flex items-center justify-between h-14 md:h-16">
          <Link to="/" className="font-display text-lg md:text-xl tracking-tight text-foreground">
            Echo
          </Link>
          
          <div className="flex items-center gap-2 md:gap-6">
            {/* Desktop Navigation */}
            {!isAuthPage && !isMobile && (
              <nav className="flex items-center space-x-1">
                {navLinks.map(({ to, icon: Icon, label, showDot }) => (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200",
                      isActive(to)
                        ? "text-foreground bg-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <span className="relative inline-flex">
                      <Icon className="h-4 w-4" />
                      {showDot && (
                        <span
                          aria-label="New memory from a past year"
                          className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary ring-1 ring-background"
                        />
                      )}
                    </span>
                    <span className="font-body">{label}</span>
                  </Link>
                ))}
              </nav>
            )}
            
            {/* Mobile Menu Button */}
            {!isAuthPage && isMobile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
            
            <AuthButtons />
          </div>
        </div>
        
        {/* Mobile Navigation Dropdown */}
        {!isAuthPage && isMobile && mobileMenuOpen && (
          <div className="border-t border-border/50 bg-background/95 backdrop-blur-sm">
            <nav className="container px-4 py-3 flex flex-col gap-1">
              {navLinks.map(({ to, icon: Icon, label, showDot }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-all duration-200",
                    isActive(to)
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <span className="relative inline-flex">
                    <Icon className="h-4 w-4" />
                    {showDot && (
                      <span
                        aria-label="New memory from a past year"
                        className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary ring-1 ring-background"
                      />
                    )}
                  </span>
                  <span className="font-body">{label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
      <main className="container px-4 pt-20 md:pt-24 pb-16">{children}</main>
    </div>
  );
};

export default Layout;
