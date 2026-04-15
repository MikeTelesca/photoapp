import { prisma } from "@/lib/db";

export const MAINTENANCE_FLAG_KEY = "maintenance_mode";

export interface MaintenanceState {
  enabled: boolean;
  message: string | null;
}

/**
 * Returns the current maintenance mode state. Stored on the existing
 * FeatureFlag model: `enabled` toggles the mode and `description` carries
 * the user-visible message. Falls back to disabled if the table or row
 * doesn't exist (e.g. on first boot before the flag has ever been set).
 */
export async function getMaintenanceState(): Promise<MaintenanceState> {
  try {
    const flag = await prisma.featureFlag.findUnique({
      where: { key: MAINTENANCE_FLAG_KEY },
    });
    if (!flag) return { enabled: false, message: null };
    return { enabled: flag.enabled, message: flag.description ?? null };
  } catch {
    return { enabled: false, message: null };
  }
}

export async function setMaintenanceState(
  enabled: boolean,
  message?: string | null,
): Promise<MaintenanceState> {
  const desc = message?.trim() ? message.trim() : null;
  const flag = await prisma.featureFlag.upsert({
    where: { key: MAINTENANCE_FLAG_KEY },
    update: { enabled, description: desc },
    create: {
      key: MAINTENANCE_FLAG_KEY,
      name: "Maintenance Mode",
      enabled,
      description: desc,
    },
  });
  return { enabled: flag.enabled, message: flag.description ?? null };
}
