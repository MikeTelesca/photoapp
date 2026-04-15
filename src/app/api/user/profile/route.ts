import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { checkPromptSafety } from "@/lib/prompt-safety";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const {
    name,
    emailNotifications,
    weeklyDigest,
    dailySummary,
    slackWebhookUrl,
    notifyJobReady,
    notifyClientComment,
    notifyPhotoFailed,
    businessName,
    businessEmail,
    businessPhone,
    businessAddress,
    invoiceRate,
    pricePerPhoto,
    fixedFeeCents,
    invoicePrefix,
    invoiceCounter,
    jobSequencePrefix,
    timezone,
    budgetPerJob,
    emailSignature,
    shareEmailSignature,
    autoArchiveDays,
    promptPrefix,
    filenamePattern,
    shareEmailSubject,
    jobReadyEmailSubject,
    portfolioSlug,
    portfolioEnabled,
    portfolioBio,
    statusSnippets,
    tagsInheritFromJob,
  } = body;

  const updateData: Record<string, any> = {};

  if (name !== undefined) {
    if (!name || name.trim().length < 1) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    updateData.name = name.trim();
  }

  if (emailNotifications !== undefined) {
    updateData.emailNotifications = Boolean(emailNotifications);
  }

  if (weeklyDigest !== undefined) {
    updateData.weeklyDigest = Boolean(weeklyDigest);
  }

  if (dailySummary !== undefined) {
    updateData.dailySummary = Boolean(dailySummary);
  }

  if (notifyJobReady !== undefined) {
    updateData.notifyJobReady = Boolean(notifyJobReady);
  }

  if (notifyClientComment !== undefined) {
    updateData.notifyClientComment = Boolean(notifyClientComment);
  }

  if (notifyPhotoFailed !== undefined) {
    updateData.notifyPhotoFailed = Boolean(notifyPhotoFailed);
  }

  if (slackWebhookUrl !== undefined) {
    updateData.slackWebhookUrl = slackWebhookUrl?.trim() || null;
  }

  if (businessName !== undefined) updateData.businessName = businessName?.trim() || null;
  if (businessEmail !== undefined) updateData.businessEmail = businessEmail?.trim() || null;
  if (businessPhone !== undefined) updateData.businessPhone = businessPhone?.trim() || null;
  if (businessAddress !== undefined) updateData.businessAddress = businessAddress?.trim() || null;
  if (invoiceRate !== undefined) updateData.invoiceRate = parseFloat(invoiceRate) || 50;
  if (pricePerPhoto !== undefined) {
    if (pricePerPhoto === null || pricePerPhoto === "") {
      updateData.pricePerPhoto = null;
    } else {
      const n = parseFloat(pricePerPhoto);
      updateData.pricePerPhoto = Number.isFinite(n) && n >= 0 ? n : null;
    }
  }
  if (fixedFeeCents !== undefined) {
    if (fixedFeeCents === null || fixedFeeCents === "") {
      updateData.fixedFeeCents = null;
    } else {
      // Accept dollars (float) and store as integer cents
      const dollars = parseFloat(fixedFeeCents);
      updateData.fixedFeeCents = Number.isFinite(dollars) && dollars >= 0 ? Math.round(dollars * 100) : null;
    }
  }
  if (invoicePrefix !== undefined) {
    const trimmed = (invoicePrefix ?? "").toString().trim();
    const prefix = trimmed || "INV";
    if (prefix.length < 1 || prefix.length > 6) {
      return NextResponse.json({ error: "Invoice prefix must be 1-6 characters" }, { status: 400 });
    }
    updateData.invoicePrefix = prefix;
  }
  if (invoiceCounter !== undefined) {
    const n = typeof invoiceCounter === "number" ? invoiceCounter : parseInt(invoiceCounter, 10);
    if (!Number.isFinite(n) || n < 0 || n > 999999999) {
      return NextResponse.json({ error: "Invoice counter must be a non-negative integer" }, { status: 400 });
    }
    updateData.invoiceCounter = Math.floor(n);
  }
  if (jobSequencePrefix !== undefined) updateData.jobSequencePrefix = jobSequencePrefix?.trim().toUpperCase() || "JOB";
  if (timezone !== undefined) updateData.timezone = timezone?.trim() || null;
  if (budgetPerJob !== undefined) updateData.budgetPerJob = parseFloat(budgetPerJob) || 20;
  if (emailSignature !== undefined) updateData.emailSignature = emailSignature?.trim() || null;
  if (shareEmailSignature !== undefined) updateData.shareEmailSignature = shareEmailSignature?.trim() || null;
  if (autoArchiveDays !== undefined) {
    updateData.autoArchiveDays = autoArchiveDays === null ? null : (parseInt(autoArchiveDays) || null);
  }
  if (promptPrefix !== undefined) {
    const safety = checkPromptSafety(promptPrefix);
    if (!safety.safe) {
      return NextResponse.json({ error: safety.reason }, { status: 400 });
    }
    updateData.promptPrefix = promptPrefix?.trim() || null;
  }

  if (filenamePattern !== undefined) {
    updateData.filenamePattern = filenamePattern?.trim() || "{address}-{seq}";
  }

  if (shareEmailSubject !== undefined) {
    updateData.shareEmailSubject = shareEmailSubject?.trim() || null;
  }

  if (jobReadyEmailSubject !== undefined) {
    updateData.jobReadyEmailSubject = jobReadyEmailSubject?.trim() || null;
  }

  if (portfolioSlug !== undefined) {
    const raw = (portfolioSlug ?? "").toString().trim().toLowerCase();
    if (raw) {
      const normalized = raw.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      if (!normalized) {
        return NextResponse.json({ error: "Invalid portfolio slug" }, { status: 400 });
      }
      const existing = await prisma.user.findUnique({ where: { portfolioSlug: normalized } });
      if (existing && existing.id !== auth.userId) {
        return NextResponse.json({ error: "That slug is already taken" }, { status: 409 });
      }
      updateData.portfolioSlug = normalized;
    } else {
      updateData.portfolioSlug = null;
    }
  }

  if (portfolioEnabled !== undefined) {
    updateData.portfolioEnabled = Boolean(portfolioEnabled);
  }

  if (portfolioBio !== undefined) {
    updateData.portfolioBio = portfolioBio?.toString().trim() || null;
  }

  if (statusSnippets !== undefined) {
    if (statusSnippets === null || statusSnippets === "") {
      updateData.statusSnippets = null;
    } else if (typeof statusSnippets === "object") {
      const allowed = ["pending", "processing", "review", "approved", "rejected"] as const;
      const sanitized: Record<string, string[]> = {};
      for (const key of allowed) {
        const raw = (statusSnippets as Record<string, unknown>)[key];
        if (Array.isArray(raw)) {
          sanitized[key] = raw
            .map((s) => (typeof s === "string" ? s.trim() : ""))
            .filter((s) => s.length > 0 && s.length <= 2000)
            .slice(0, 50);
        } else {
          sanitized[key] = [];
        }
      }
      updateData.statusSnippets = JSON.stringify(sanitized);
    } else if (typeof statusSnippets === "string") {
      try {
        JSON.parse(statusSnippets);
        updateData.statusSnippets = statusSnippets;
      } catch {
        return NextResponse.json({ error: "Invalid statusSnippets JSON" }, { status: 400 });
      }
    }
  }

  if (tagsInheritFromJob !== undefined) {
    updateData.tagsInheritFromJob = Boolean(tagsInheritFromJob);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: auth.userId },
    data: updateData,
  });

  return NextResponse.json({ success: true });
}
