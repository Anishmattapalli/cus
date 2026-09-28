"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clearSession, createSession, requireUser, verifyLogin } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { ensureRbac } from "@/lib/ensure-rbac";

export async function loginAction(_prev: { error: string } | null, formData: FormData) {
  await ensureRbac();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");
  const user = await verifyLogin(email, password);
  if (!user) return { error: "Invalid email or password." };
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  redirect(next.startsWith("/") ? next : "/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function changeOwnPassword(formData: FormData) {
  const user = await requireUser();
  if (!user) return { error: "Not signed in." };
  const current = String(formData.get("currentPassword") || "");
  const next = String(formData.get("newPassword") || "");
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) return { error: "Current password is incorrect." };
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 10) },
  });
  return { ok: true };
}

export async function updateOwnProfile(formData: FormData) {
  const user = await requireUser();
  if (!user) return { error: "Not signed in." };
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: String(formData.get("name") || "").trim() || user.name,
      mobile: String(formData.get("mobile") || "").trim() || null,
      designation: String(formData.get("designation") || "").trim() || null,
    },
  });
  return { ok: true };
}
