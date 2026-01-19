'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  getNotificationSettings,
  updateNotificationSettings,
  sendTestNotification,
} from '@/lib/actions/notifications';
import { Bell, Send, Loader2, MessageSquare, Mail, Hash } from 'lucide-react';

type NotificationChannel = 'DISCORD' | 'TELEGRAM' | 'EMAIL' | 'NONE';

interface NotificationSettings {
  channel: NotificationChannel;
  discordWebhook: string | null;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  emailTo: string | null;
}

export default function NotificationsSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    channel: 'NONE',
    discordWebhook: null,
    telegramBotToken: null,
    telegramChatId: null,
    emailTo: null,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getNotificationSettings();
      setSettings(data as NotificationSettings);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load notification settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotificationSettings(settings);
      toast({
        title: 'Settings saved',
        description: 'Your notification preferences have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await sendTestNotification();
      toast({
        title: 'Test sent!',
        description: 'Check your notification channel for the test message.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Test failed',
        description: error instanceof Error ? error.message : 'Failed to send test',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground">
          Configure how you want to receive opportunity alerts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alert Channel
          </CardTitle>
          <CardDescription>
            Choose where you want to receive notifications when opportunities are found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Notification Channel</Label>
            <Select
              value={settings.channel}
              onValueChange={(value: NotificationChannel) =>
                setSettings({ ...settings, channel: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">
                  <span className="flex items-center gap-2">
                    None (Dashboard only)
                  </span>
                </SelectItem>
                <SelectItem value="DISCORD">
                  <span className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Discord
                  </span>
                </SelectItem>
                <SelectItem value="TELEGRAM">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Telegram
                  </span>
                </SelectItem>
                <SelectItem value="EMAIL">
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Discord Settings */}
          {settings.channel === 'DISCORD' && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-[#5865F2]" />
                <span className="font-medium">Discord Webhook</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discordWebhook">Webhook URL</Label>
                <Input
                  id="discordWebhook"
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={settings.discordWebhook || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, discordWebhook: e.target.value })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Create a webhook in your Discord server settings under
                  Integrations &gt; Webhooks
                </p>
              </div>
            </div>
          )}

          {/* Telegram Settings */}
          {settings.channel === 'TELEGRAM' && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#0088cc]" />
                <span className="font-medium">Telegram</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegramChatId">Chat ID</Label>
                <Input
                  id="telegramChatId"
                  placeholder="123456789"
                  value={settings.telegramChatId || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, telegramChatId: e.target.value })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Message @userinfobot on Telegram to get your chat ID
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegramBotToken">
                  Bot Token{' '}
                  <Badge variant="secondary" className="ml-2">
                    Optional
                  </Badge>
                </Label>
                <Input
                  id="telegramBotToken"
                  placeholder="Leave empty to use global bot"
                  value={settings.telegramBotToken || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, telegramBotToken: e.target.value })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty to use the app&apos;s bot, or provide your own bot
                  token
                </p>
              </div>
            </div>
          )}

          {/* Email Settings */}
          {settings.channel === 'EMAIL' && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <span className="font-medium">Email</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailTo">Email Address</Label>
                <Input
                  id="emailTo"
                  type="email"
                  placeholder="your@email.com"
                  value={settings.emailTo || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, emailTo: e.target.value })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Defaults to your account email
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
            {settings.channel !== 'NONE' && (
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || saving}
              >
                {testing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Test
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>How Notifications Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            When our scanner detects an arbitrage or middle opportunity, it will
            send you an alert through your chosen channel with:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Event details (teams, sport, time)</li>
            <li>Opportunity type (ARB or MIDDLE)</li>
            <li>Edge percentage and middle width</li>
            <li>Legs with bookmakers and odds</li>
            <li>Suggested stake amounts</li>
          </ul>
          <p>
            Alerts are deduplicated, so you won&apos;t receive the same
            opportunity multiple times within a 3-minute window.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
