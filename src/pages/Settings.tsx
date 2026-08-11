
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { TemperatureSettings } from '@/components/settings/TemperatureSettings';
import { BlurSettings } from '@/components/settings/BlurSettings';
import { WeatherEffectsSettings } from '@/components/settings/WeatherEffectsSettings';
import { ApiSettings } from '@/components/settings/ApiSettings';

const Settings = () => {
  const { authState } = useAuth();

  if (!authState.user) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto text-center py-16">
          <h1 className="text-3xl font-bold mb-4">Settings</h1>
          <p className="mb-6">Please sign in to access your settings.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl py-8">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>

        <Tabs defaultValue="account">
          <TabsList className="mb-6">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <AccountSettings user={authState.user} />
          </TabsContent>

          <TabsContent value="display">
            <div className="space-y-6">
              <TemperatureSettings />
              <BlurSettings />
              <WeatherEffectsSettings />
            </div>
          </TabsContent>

          <TabsContent value="api">
            <ApiSettings />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
