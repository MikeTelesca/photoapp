import webpush from "web-push";
import { prisma } from "@/lib/db";
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, isVapidConfigured } from "./vapid";

if (isVapidConfigured()) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export async function sendPushNotification(opts: {
  userId: string;
  title: string;
  body?: string;
  url?: string;
}): Promise<number> {
  if (!isVapidConfigured()) {
    console.warn("[push] VAPID not configured");
    return 0;
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: opts.userId },
  });

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: opts.title,
          body: opts.body || "",
          url: opts.url || "/dashboard",
        })
      );
      sent++;
    } catch (err: any) {
      // 410 = subscription expired/invalid
      if (err.statusCode === 410 || err.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
      console.error("[push] send err:", err.message);
    }
  }
  return sent;
}
