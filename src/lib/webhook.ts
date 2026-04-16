export async function sendWebhook(opts: {
  url: string;
  text: string;
  title?: string;
  jobUrl?: string;
}): Promise<boolean> {
  try {
    // Slack and Discord both accept JSON with specific schemas
    const isDiscord = opts.url.includes("discord.com") || opts.url.includes("discordapp.com");

    const payload = isDiscord
      ? {
          embeds: [{
            title: opts.title || "BatchBase",
            description: opts.text,
            color: 0x06b6d4, // cyan
            url: opts.jobUrl,
          }],
        }
      : {
          text: opts.title || "BatchBase",
          blocks: [
            { type: "header", text: { type: "plain_text", text: opts.title || "BatchBase" } },
            { type: "section", text: { type: "mrkdwn", text: opts.text } },
            ...(opts.jobUrl ? [{
              type: "actions",
              elements: [{
                type: "button",
                text: { type: "plain_text", text: "Review job" },
                url: opts.jobUrl,
              }],
            }] : []),
          ],
        };

    const res = await fetch(opts.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error("[webhook] err:", err);
    return false;
  }
}
