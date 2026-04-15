import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const {
    name,
    emailNotifications,
    weeklyDigest,
    slackWebhookUrl,
    notifyJobReady,
    notifyClientComment,
    notifyPhotoFailed,
    businessName,
    businessEmail,
    businessPhone,
    businessAddress,
    invoiceRate,
    invoicePrefix,
    timezone,
    budgetPerJob,
    emailSignature,
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
  if (invoicePrefix !== undefined) updateData.invoicePrefix = invoicePrefix?.trim() || "INV";
  if (timezone !== undefined) updateData.timezone = timezone?.trim() || null;
  if (budgetPerJob !== undefined) updateData.budgetPerJob = parseFloat(budgetPerJob) || 20;
  if (emailSignature !== undefined) updateData.emailSignature = emailSignature?.trim() || null;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: auth.userId },
    data: updateData,
  });

  return NextResponse.json({ success: true });
}
