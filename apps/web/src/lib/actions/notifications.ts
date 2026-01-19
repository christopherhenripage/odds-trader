'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NotificationChannel } from '@prisma/client';
import { Resend } from 'resend';

interface NotificationSettingData {
  channel: NotificationChannel;
  discordWebhook?: string | null;
  telegramBotToken?: string | null;
  telegramChatId?: string | null;
  emailTo?: string | null;
}

export async function getNotificationSettings() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const settings = await prisma.notificationSetting.findUnique({
    where: { userId: session.user.id },
  });

  if (!settings) {
    // Return default settings
    return {
      channel: 'NONE' as NotificationChannel,
      discordWebhook: null,
      telegramBotToken: null,
      telegramChatId: null,
      emailTo: session.user.email,
    };
  }

  return settings;
}

export async function updateNotificationSettings(data: NotificationSettingData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Validate settings based on channel
  if (data.channel === 'DISCORD' && !data.discordWebhook) {
    throw new Error('Discord webhook URL is required');
  }
  if (data.channel === 'TELEGRAM' && !data.telegramChatId) {
    throw new Error('Telegram chat ID is required');
  }
  if (data.channel === 'EMAIL' && !data.emailTo) {
    throw new Error('Email address is required');
  }

  // Basic URL validation for Discord webhook
  if (data.discordWebhook && !isValidDiscordWebhook(data.discordWebhook)) {
    throw new Error('Invalid Discord webhook URL');
  }

  const settings = await prisma.notificationSetting.upsert({
    where: { userId: session.user.id },
    update: {
      channel: data.channel,
      discordWebhook: data.discordWebhook,
      telegramBotToken: data.telegramBotToken,
      telegramChatId: data.telegramChatId,
      emailTo: data.emailTo,
    },
    create: {
      userId: session.user.id,
      channel: data.channel,
      discordWebhook: data.discordWebhook,
      telegramBotToken: data.telegramBotToken,
      telegramChatId: data.telegramChatId,
      emailTo: data.emailTo,
    },
  });

  return settings;
}

export async function sendTestNotification() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const settings = await prisma.notificationSetting.findUnique({
    where: { userId: session.user.id },
  });

  if (!settings || settings.channel === 'NONE') {
    throw new Error('No notification channel configured');
  }

  const testMessage = {
    title: 'Test Notification from Odds Trader',
    message: 'If you received this, your notifications are working!',
    timestamp: new Date().toISOString(),
  };

  switch (settings.channel) {
    case 'DISCORD':
      return await sendDiscordNotification(settings.discordWebhook!, testMessage);
    case 'TELEGRAM':
      return await sendTelegramNotification(
        settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN!,
        settings.telegramChatId!,
        testMessage
      );
    case 'EMAIL':
      return await sendEmailNotification(settings.emailTo!, testMessage);
    default:
      throw new Error('Unknown notification channel');
  }
}

async function sendDiscordNotification(
  webhookUrl: string,
  message: { title: string; message: string; timestamp: string }
) {
  const payload = {
    embeds: [
      {
        title: message.title,
        description: message.message,
        color: 0x3b82f6, // Blue color
        timestamp: message.timestamp,
        footer: {
          text: 'Odds Trader',
        },
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.statusText}`);
  }

  return { success: true, channel: 'DISCORD' as const };
}

async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  message: { title: string; message: string }
) {
  const text = `*${message.title}*\n\n${message.message}`;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram API failed: ${error.description || response.statusText}`);
  }

  return { success: true, channel: 'TELEGRAM' as const };
}

async function sendEmailNotification(
  email: string,
  message: { title: string; message: string }
) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    throw new Error('Email notifications not configured (RESEND_API_KEY missing)');
  }

  const resend = new Resend(resendApiKey);

  const { error } = await resend.emails.send({
    from: 'Odds Trader <notifications@odds-trader.com>',
    to: email,
    subject: message.title,
    text: message.message,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">${message.title}</h1>
        <p>${message.message}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">
          Sent by Odds Trader
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Email send failed: ${error.message}`);
  }

  return { success: true, channel: 'EMAIL' as const };
}

function isValidDiscordWebhook(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'discord.com' &&
      parsed.pathname.startsWith('/api/webhooks/')
    );
  } catch {
    return false;
  }
}
