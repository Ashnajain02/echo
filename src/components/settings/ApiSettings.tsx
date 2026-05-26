import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { apiKeysTable } from '@/integrations/supabase/extensions';
import { useToast } from '@/hooks/use-toast';
import { Copy, Key, RefreshCw, Trash2, Eye, EyeOff } from 'lucide-react';
import { formatShortDate, formatDateTimeStamp } from '@/utils/dateUtils';
import { logger } from '@/lib/logger';

interface KeyMeta {
  created_at: string;
  last_used_at: string | null;
}

export const ApiSettings: React.FC = () => {
  const { toast } = useToast();
  // freshKey is the raw key shown only right after generation
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [keyMeta, setKeyMeta] = useState<KeyMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);

  const hasKey = !!keyMeta || !!freshKey;

  // Check if user already has an API key on mount
  useEffect(() => {
    const fetchKeyMeta = async () => {
      try {
        const { data, error } = await apiKeysTable()
          .select('created_at, last_used_at')
          .maybeSingle();

        if (!error && data) {
          setKeyMeta({
            created_at: data.created_at,
            last_used_at: data.last_used_at,
          });
        }
      } catch (error) {
        logger.warn('ApiSettings', 'failed to fetch api_keys metadata:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchKeyMeta();
  }, []);

  const generateKey = async () => {
    const confirmed = hasKey
      ? window.confirm('This will revoke your current API key. Any integrations using it will stop working. Continue?')
      : true;
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-api-key', {
        method: 'POST',
      });

      if (error) throw error;
      setFreshKey(data.key);
      setKeyMeta({ created_at: new Date().toISOString(), last_used_at: null });
      setShowKey(true);
    } catch (error) {
      logger.error('ApiSettings', 'failed to generate API key:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate API key.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const revokeKey = async () => {
    const confirmed = window.confirm('This will permanently revoke your API key. Continue?');
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('generate-api-key', {
        method: 'DELETE',
      });

      if (error) throw error;
      setFreshKey(null);
      setKeyMeta(null);
      setShowKey(false);
    } catch (error) {
      logger.error('ApiSettings', 'failed to revoke API key:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke API key.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyKey = () => {
    if (!freshKey) return;
    navigator.clipboard.writeText(freshKey);
  };

  const endpoint = `${SUPABASE_URL}/functions/v1/journal-stats`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-4 w-4" />
          API Access
        </CardTitle>
        <CardDescription>
          Generate an API key to access your journal stats from external sites.
          Only aggregated statistics are exposed — never your entry content.
          You can have one active key at a time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : hasKey ? (
          <div className="space-y-3">
            {/* Show raw key if just generated */}
            {freshKey ? (
              <>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono break-all">
                    {showKey ? freshKey : '••••••••••••••••••••••••••••••••'}
                  </code>
                  <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)} className="shrink-0">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={copyKey} className="shrink-0">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Copy this key now — you won't be able to see it again after leaving this page.
                </p>
              </>
            ) : (
              <div className="bg-muted/50 rounded-md px-3 py-2 text-sm">
                <p className="text-foreground">You have an active API key.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The key value is hidden for security. If you've lost it, regenerate a new one.
                </p>
              </div>
            )}

            {/* Key metadata */}
            {keyMeta && (
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Created: {formatShortDate(keyMeta.created_at)}</span>
                {keyMeta.last_used_at && (
                  <span>Last used: {formatDateTimeStamp(keyMeta.last_used_at)}</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No API key generated yet.</p>
        )}

        <div className="flex gap-2">
          <Button onClick={generateKey} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-3 w-3 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {hasKey ? 'Regenerate Key' : 'Generate Key'}
          </Button>
          {hasKey && (
            <Button onClick={revokeKey} disabled={isLoading} variant="outline" size="sm" className="text-destructive">
              <Trash2 className="h-3 w-3 mr-2" />
              Revoke
            </Button>
          )}
        </div>

        <div className="border-t pt-4 mt-4">
          <p className="text-xs font-medium mb-1">Endpoint</p>
          <code className="block bg-muted px-3 py-2 rounded-md text-xs font-mono break-all">
            GET {endpoint}
          </code>
          <p className="text-xs font-medium mt-3 mb-1">Usage</p>
          <code className="block bg-muted px-3 py-2 rounded-md text-xs font-mono whitespace-pre break-all">
{`fetch("${endpoint}", {
  headers: { Authorization: "Bearer YOUR_KEY" }
})`}
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            Rate limited to 60 requests per hour.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
