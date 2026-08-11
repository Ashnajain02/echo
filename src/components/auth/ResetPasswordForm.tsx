
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  onBackToSignIn: () => void;
  tokenError: boolean;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ onBackToSignIn, tokenError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const { resetPassword } = useAuth();

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleResetPassword = async (values: ResetPasswordValues) => {
    setIsLoading(true);
    try {
      await resetPassword(values.email);
      setResetSuccess(true);
      form.reset();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Alert variant="info" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Enter your email address and we'll send you a link to reset your password.
        </AlertDescription>
      </Alert>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleResetPassword)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Your email address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>
          
          <Button
            type="button"
            variant="link"
            className="w-full text-sm"
            onClick={onBackToSignIn}
          >
            Back to Sign In
          </Button>
        </form>
      </Form>
    </>
  );
};
