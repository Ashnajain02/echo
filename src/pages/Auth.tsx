
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/Layout';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm';

const Auth = () => {
  const [activeTab, setActiveTab] = useState('signin');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [showUpdateTab, setShowUpdateTab] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Redirect if already authenticated
  useEffect(() => {
    if (authState.user && !authState.loading) {
      navigate('/');
    }
  }, [authState.user, authState.loading, navigate]);

  // Process URL hash parameters and query parameters only on initial load
  useEffect(() => {
    if (initialLoadComplete) return;

    // First check for hash parameters from recovery links
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshTokenFromHash = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      
      if (accessToken && type === 'recovery') {
        // We have a recovery token in the URL
        setActiveTab('update-password');
        setShowUpdateTab(true);
        setRecoveryToken(accessToken);
        setRefreshToken(refreshTokenFromHash);
        
        // Clean the URL to remove the token for security
        window.history.replaceState({}, document.title, window.location.pathname + '?tab=update-password');
        setInitialLoadComplete(true);
        return; // Exit early since we processed the token
      }
    }
    
    // Then check URL query parameters
    const tab = searchParams.get('tab');
    const error = searchParams.get('error');
    const errorCode = searchParams.get('error_code');
    
    if (error && (errorCode === 'otp_expired' || error === 'access_denied')) {
      setTokenError(true);
      setActiveTab('reset');
    } else if (tab === 'update-password') {
      setActiveTab('update-password');
      setShowUpdateTab(true);
    } else if (tab === 'reset-success') {
      setResetSuccess(true);
      setActiveTab('signin');
    } else if (tab === 'signup') {
      setActiveTab('signup');
    }
    
    setInitialLoadComplete(true);
  }, [searchParams, initialLoadComplete]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL without causing a page refresh
    const newSearchParams = new URLSearchParams(searchParams);
    if (value === 'signin') {
      newSearchParams.delete('tab');
    } else {
      newSearchParams.set('tab', value);
    }
    setSearchParams(newSearchParams, { replace: true });
  };
  
  const handleForgotPassword = () => {
    setActiveTab('reset');
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', 'reset');
    setSearchParams(newSearchParams, { replace: true });
  };
  
  const handleBackToSignIn = () => {
    setActiveTab('signin');
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('tab');
    setSearchParams(newSearchParams, { replace: true });
  };

  return (
    <Layout>
      <div className="container mx-auto flex flex-col items-center justify-center max-w-md py-8">
        <h1 className="text-3xl font-bold mb-8">Welcome to Echo</h1>
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">Account Access</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs 
              value={activeTab} 
              onValueChange={handleTabChange} 
              defaultValue="signin"
            >
              <TabsList className={`grid w-full ${showUpdateTab ? 'grid-cols-4' : 'grid-cols-3'} mb-6`}>
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="reset">Reset</TabsTrigger>
                {showUpdateTab && <TabsTrigger value="update-password">Update</TabsTrigger>}
              </TabsList>
              
              {resetSuccess && (
                <Alert variant="success" className="mb-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Password reset email sent! Check your inbox for a link to reset your password.
                  </AlertDescription>
                </Alert>
              )}

              {tokenError && (
                <Alert variant="warning" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Your password reset link has expired. Please request a new one.
                  </AlertDescription>
                </Alert>
              )}
              
              <TabsContent value="signin">
                <SignInForm onForgotPassword={handleForgotPassword} />
              </TabsContent>
              
              <TabsContent value="signup">
                <SignUpForm />
              </TabsContent>
              
              <TabsContent value="reset">
                <ResetPasswordForm 
                  onBackToSignIn={handleBackToSignIn}
                  tokenError={tokenError} 
                />
              </TabsContent>
              
              <TabsContent value="update-password">
                <UpdatePasswordForm 
                  onBackToSignIn={handleBackToSignIn} 
                  recoveryToken={recoveryToken}
                  refreshToken={refreshToken}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col text-sm text-center text-muted-foreground">
            <p>Your secure place to journal, track mood, weather, and music</p>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default Auth;
