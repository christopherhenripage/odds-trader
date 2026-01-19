import { Resend } from 'resend';
import {
  Opportunity,
  OpportunityLeg,
  NotificationChannel,
  addStakesToOpportunity,
  formatStake,
  formatOdds,
} from '@odds-trader/shared';

interface NotificationSettings {
  userId: string;
  channel: NotificationChannel;
  discordWebhook: string | null;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  emailTo: string | null;
}

export interface NotificationResult {
  userId: string;
  success: boolean;
  channel: NotificationChannel;
  error?: string;
}

export async function sendNotification(
  opportunity: Opportunity,
  settings: NotificationSettings,
  stakeAmount: number = 100
): Promise<NotificationResult> {
  const oppWithStakes = addStakesToOpportunity(opportunity, stakeAmount);

  try {
    switch (settings.channel) {
      case 'DISCORD':
        await sendDiscordNotification(settings.discordWebhook!, oppWithStakes);
        break;
      case 'TELEGRAM':
        await sendTelegramNotification(
          settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN!,
          settings.telegramChatId!,
          oppWithStakes
        );
        break;
      case 'EMAIL':
        await sendEmailNotification(settings.emailTo!, oppWithStakes);
        break;
      case 'NONE':
        return {
          userId: settings.userId,
          success: true,
          channel: 'NONE',
        };
    }

    return {
      userId: settings.userId,
      success: true,
      channel: settings.channel,
    };
  } catch (error) {
    return {
      userId: settings.userId,
      success: false,
      channel: settings.channel,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

interface OpportunityWithStakes extends Opportunity {
  totalStake: number;
  guaranteedProfit: number;
}

async function sendDiscordNotification(
  webhookUrl: string,
  opp: OpportunityWithStakes
): Promise<void> {
  const color = opp.type === 'ARB' ? 0x10b981 : 0x3b82f6; // Emerald for ARB, Blue for MIDDLE
  const typeEmoji = opp.type === 'ARB' ? ':chart_with_upwards_trend:' : ':dart:';

  const legsText = opp.legs
    .map((leg) => {
      const point = leg.point !== undefined ? ` (${leg.point > 0 ? '+' : ''}${leg.point})` : '';
      const stake = leg.stake ? ` - $${formatStake(leg.stake)}` : '';
      return `**${leg.outcome}**${point} @ ${formatOdds(leg.odds)} - ${leg.bookmakerTitle}${stake}`;
    })
    .join('\n');

  const embed = {
    title: `${typeEmoji} ${opp.type} Found: ${opp.homeTeam} vs ${opp.awayTeam}`,
    color,
    fields: [
      {
        name: 'Sport',
        value: opp.sportKey,
        inline: true,
      },
      {
        name: 'Market',
        value: opp.marketKey.toUpperCase(),
        inline: true,
      },
      {
        name: 'Edge',
        value: `${opp.edgePct >= 0 ? '+' : ''}${opp.edgePct.toFixed(2)}%`,
        inline: true,
      },
      ...(opp.middleWidth
        ? [
            {
              name: 'Width',
              value: `${opp.middleWidth.toFixed(1)} pts`,
              inline: true,
            },
          ]
        : []),
      {
        name: 'Legs',
        value: legsText,
        inline: false,
      },
      ...(opp.type === 'ARB' && opp.guaranteedProfit > 0
        ? [
            {
              name: 'Guaranteed Profit',
              value: `$${opp.guaranteedProfit.toFixed(2)} on $${opp.totalStake} stake`,
              inline: false,
            },
          ]
        : []),
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Odds Trader',
    },
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.status}`);
  }
}

async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  opp: OpportunityWithStakes
): Promise<void> {
  const typeEmoji = opp.type === 'ARB' ? '📈' : '🎯';

  const legsText = opp.legs
    .map((leg) => {
      const point = leg.point !== undefined ? ` (${leg.point > 0 ? '+' : ''}${leg.point})` : '';
      const stake = leg.stake ? ` - $${formatStake(leg.stake)}` : '';
      return `• *${leg.outcome}*${point} @ ${formatOdds(leg.odds)} - ${leg.bookmakerTitle}${stake}`;
    })
    .join('\n');

  const edgeText = `${opp.edgePct >= 0 ? '+' : ''}${opp.edgePct.toFixed(2)}%`;
  const widthText = opp.middleWidth ? ` | Width: ${opp.middleWidth.toFixed(1)} pts` : '';
  const profitText =
    opp.type === 'ARB' && opp.guaranteedProfit > 0
      ? `\n💰 *Guaranteed Profit:* $${opp.guaranteedProfit.toFixed(2)} on $${opp.totalStake}`
      : '';

  const text = `${typeEmoji} *${opp.type} FOUND*

*${opp.homeTeam} vs ${opp.awayTeam}*
${opp.sportKey} | ${opp.marketKey.toUpperCase()}
Edge: ${edgeText}${widthText}

${legsText}${profitText}`;

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
    const error = await response.json() as { description?: string };
    throw new Error(`Telegram API failed: ${error.description || response.status}`);
  }
}

async function sendEmailNotification(
  email: string,
  opp: OpportunityWithStakes
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const resend = new Resend(resendApiKey);

  const legsHtml = opp.legs
    .map((leg) => {
      const point = leg.point !== undefined ? ` (${leg.point > 0 ? '+' : ''}${leg.point})` : '';
      const stake = leg.stake ? ` - $${formatStake(leg.stake)}` : '';
      return `<li><strong>${leg.outcome}</strong>${point} @ ${formatOdds(leg.odds)} - ${leg.bookmakerTitle}${stake}</li>`;
    })
    .join('');

  const edgeColor = opp.edgePct >= 0 ? '#10b981' : '#ef4444';
  const typeColor = opp.type === 'ARB' ? '#10b981' : '#3b82f6';
  const profitHtml =
    opp.type === 'ARB' && opp.guaranteedProfit > 0
      ? `<p style="background: #10b98120; padding: 12px; border-radius: 8px; color: #10b981;">
          <strong>Guaranteed Profit:</strong> $${opp.guaranteedProfit.toFixed(2)} on $${opp.totalStake} stake
        </p>`
      : '';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #fff; padding: 20px; border-radius: 12px;">
      <div style="display: inline-block; background: ${typeColor}20; color: ${typeColor}; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px;">
        ${opp.type}
      </div>
      <h1 style="margin: 0 0 8px 0; font-size: 24px;">${opp.homeTeam} vs ${opp.awayTeam}</h1>
      <p style="color: #888; margin: 0 0 16px 0;">${opp.sportKey} | ${opp.marketKey.toUpperCase()}</p>

      <div style="display: flex; gap: 16px; margin-bottom: 20px;">
        <div style="background: #2a2a3e; padding: 12px; border-radius: 8px; flex: 1;">
          <div style="color: #888; font-size: 12px;">Edge</div>
          <div style="color: ${edgeColor}; font-size: 20px; font-weight: bold;">${opp.edgePct >= 0 ? '+' : ''}${opp.edgePct.toFixed(2)}%</div>
        </div>
        ${
          opp.middleWidth
            ? `<div style="background: #2a2a3e; padding: 12px; border-radius: 8px; flex: 1;">
                <div style="color: #888; font-size: 12px;">Width</div>
                <div style="color: #3b82f6; font-size: 20px; font-weight: bold;">${opp.middleWidth.toFixed(1)} pts</div>
              </div>`
            : ''
        }
      </div>

      <h3 style="margin: 0 0 12px 0;">Legs</h3>
      <ul style="list-style: none; padding: 0; margin: 0 0 20px 0;">
        ${legsHtml}
      </ul>

      ${profitHtml}

      <hr style="border: none; border-top: 1px solid #333; margin: 20px 0;" />
      <p style="color: #666; font-size: 12px; margin: 0;">Sent by Odds Trader</p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: 'Odds Trader <notifications@odds-trader.com>',
    to: email,
    subject: `${opp.type}: ${opp.homeTeam} vs ${opp.awayTeam} (${opp.edgePct.toFixed(2)}% edge)`,
    html,
  });

  if (error) {
    throw new Error(`Email send failed: ${error.message}`);
  }
}
