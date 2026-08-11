import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';


export const WeatherEffectsSettings: React.FC = () => {
  const { authState } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['weather-effects-settings', authState.user?.id],
    queryFn: async () => {
      if (!authState.user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('disable_weather_effects')
        .eq('id', authState.user.id)
        .single();

      if (error) {
        console.error('Error fetching weather effects preference:', error);
        return null;
      }

      return data;
    },
    enabled: !!authState.user
  });

  const updateWeatherEffectsSetting = useMutation({
    mutationFn: async (disableWeatherEffects: boolean) => {
      if (!authState.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ disable_weather_effects: disableWeatherEffects })
        .eq('id', authState.user.id);

      if (error) throw error;
      return disableWeatherEffects;
    },
    onSuccess: () => {
      // Also used by useEntryState to gate the weather overlay everywhere
      // entries are shown, so invalidate that cache key too.
      queryClient.invalidateQueries({ queryKey: ['weather-effects-settings'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile-settings'] });
    },
    onError: (error) => {
      console.error('Error updating weather effects setting:', error);
    }
  });

  const handleToggle = (checked: boolean) => {
    // Switch reads as "Weather effects" (on = show), setting is the inverse.
    updateWeatherEffectsSetting.mutate(!checked);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weather Effects</CardTitle>
        <CardDescription>
          Control the animated weather (rain, snow, sun, stars) shown behind your entries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-md border p-4">
          <div className="space-y-0.5 flex-1 mr-4">
            <Label htmlFor="weather-effects" className="font-medium">
              Show weather effects
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, entries display an animated weather overlay matching the recorded
              weather as you scroll through them
            </p>
          </div>
          <Switch
            id="weather-effects"
            checked={!(profile?.disable_weather_effects ?? false)}
            onCheckedChange={handleToggle}
            disabled={isLoading || updateWeatherEffectsSetting.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
};
