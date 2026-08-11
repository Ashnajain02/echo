
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const updatePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>;

interface UpdatePasswordFormProps {
  onBackToSignIn: () => void;
  recoveryToken?: string | null;
  refreshToken?: string | null;
}

export const UpdatePasswordForm: React.FC<UpdatePasswordFormProps> = ({ 
  onBackToSignIn, 
  recoveryToken, 
  refreshToken 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const { updatePassword } = useAuth();

  const form = useForm<UpdatePasswordValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const handleUpdatePassword = async (values: UpdatePasswordValues) => {
    setIsLoading(true);
    try {
      // Pass both tokens to the updatePassword function
      await updatePassword(values.password, recoveryToken, refreshToken);
      setUpdateSuccess(true);
      form.reset();
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        onBackToSignIn();
      }, 3000);
    } catch (error) {
      console.error('Error updating password:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {updateSuccess ? (
        <Alert variant="success" className="mb-4">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Your password has been updated successfully! You will be redirected to sign in.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="info" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {recoveryToken ?
              "Please enter your new password below." :
              "Enter your new password below."
            }
          </AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleUpdatePassword)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="New password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Confirm new password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || updateSuccess}
          >
            {isLoading ? "Updating..." : "Update Password"}
          </Button>
          
          <Button
            type="button"
            variant="link"
            className="w-full text-sm"
            onClick={onBackToSignIn}
            disabled={isLoading}
          >
            Back to Sign In
          </Button>
        </form>
      </Form>
    </>
  );
};
