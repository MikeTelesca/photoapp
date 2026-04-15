import { prisma } from "@/lib/db";

/**
 * Send a Slack notification to a user's configured webhook URL.
 * Supports both Slack and Discord webhook URLs.
 * Fails silently — logs errors but never throws.
 *
 * @param userId - The user whose webhook URL should be used
 * @param message - The main text message (Slack mrkdwn supported)
 * @param blocks - Optional Slack Block Kit blocks to override the default layout
 */
export async function sendSlackNotification(
  userId: string,
  message: string,
  blocks?: unknown[]
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { slackWebhookUrl: true },
    });

    const url = user?.slackWebhookUrl;
    if (!url) return false;

    const isDiscord =
      url.includes("discord.com") || url.includes("discordapp.com");

    const payload = isDiscord
      ? {
          content: message,
        }
      : blocks && blocks.length > 0
        ? { text: message, blocks }
        : {
            text: message,
            blocks: [
              {
                type: "section",
                text: { type: "mrkdwn", text: message },
              },
            ],
          };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(
        `[slack] webhook returned ${res.status} for user ${userId}`
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("[slack] failed to send notification:", err);
    return false;
  }
}
