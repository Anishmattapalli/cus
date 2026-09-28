"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actor, can } from "@/lib/access";
import { nextCode, syncUncustomizedSaleSchedules } from "@/lib/ops";
import { amountBecomingDue, sumStagePercentages, validateStagePercentageCap } from "@/lib/finance";
import { financeForSale } from "@/lib/queries";
import { money } from "@/lib/money";

function parseOptionalCost(raw: string): { value: string | null; error?: string } {
  const cleaned = String(raw || "").replace(/[₹,\s]/g, "").trim();
  if (!cleaned) return { value: null };
  try {
    const n = money(cleaned);
    if (n.lt(0)) return { error: "Estimated project cost cannot be negative." };
    return { value: n.toFixed(2) };
  } catch {
    return { error: "Enter a valid estimated project cost." };
  }
}

export async function createProject(formData: FormData) {
  const auth = await actor("projects.create");
  if ("error" in auth) return auth;
  const user = auth.user;
  const name = String(formData.get("name") || "").trim();
  const propertyType = String(formData.get("propertyType") || "apartment");
  const location = String(formData.get("location") || "").trim() || null;
  if (!name) return { error: "Project name is required." };
  const cost = parseOptionalCost(String(formData.get("estimatedCost") || ""));
  if (cost.error) return { error: cost.error };
  const code = await nextCode("project", "PRJ", 3);
  const project = await prisma.project.create({
    data: {
      code,
      name,
      propertyType,
      location,
      estimatedCost: cost.value,
      createdById: user.id,
      updatedById: user.id,
    },
  });
  revalidatePath("/projects");
  return { id: project.id };
}

export async function addProjectMilestone(formData: FormData) {
  const auth = await actor("payment_schedule.create");
  if ("error" in auth) return auth;
  const user = auth.user;
  const projectId = String(formData.get("projectId") || "");
  const stageName = String(formData.get("stageName") || "").trim();
  if (!projectId) return { error: "Project is required." };
  const calculationType = String(formData.get("calculationType") || "percentage");
  let paymentPercentage: string | null = String(formData.get("paymentPercentage") || "") || null;
  const fixedAmount = String(formData.get("fixedAmount") || "") || null;
  if (!stageName) return { error: "Stage name is required." };

  if (calculationType === "percentage") {
    let pct;
    try {
      pct = money(String(paymentPercentage || "").replace(/%/g, "").trim() || "0");
    } catch {
      return { error: "Enter a valid payment percentage." };
    }
    const siblings = await prisma.projectPaymentMilestone.findMany({
      where: { projectId, isActive: true },
    });
    const allocated = sumStagePercentages(siblings);
    const capError = validateStagePercentageCap(allocated, pct);
    if (capError) return { error: capError };
    paymentPercentage = pct.toFixed(2);
  }

  const last = await prisma.projectPaymentMilestone.findFirst({
    where: { projectId },
    orderBy: { sequenceNumber: "desc" },
  });
  const salesCount = await prisma.sale.count({ where: { projectId } });
  const m = await prisma.projectPaymentMilestone.create({
    data: {
      projectId,
      sequenceNumber: (last?.sequenceNumber ?? 0) + 1,
      stageName,
      calculationType,
      paymentPercentage: calculationType === "percentage" ? paymentPercentage : null,
      fixedAmount: calculationType === "fixed_amount" ? fixedAmount : null,
      createdById: user.id,
      updatedById: user.id,
    },
  });
  if (!last) {
    await prisma.project.update({
      where: { id: projectId },
      data: { currentMilestoneId: m.id },
    });
  }
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      entityType: "project_milestone",
      entityId: m.id,
      action: "create",
      afterJson: JSON.stringify({ stageName, salesCount }),
    },
  });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, warn: salesCount > 0 ? `${salesCount} existing sales will not be rewritten. New sales will use this stage.` : null };
}

export async function previewStageChange(projectId: string, newMilestoneId: string) {
  const auth = await actor("projects.change_stage");
  if ("error" in auth) return auth;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      currentMilestone: true,
      milestones: { orderBy: { sequenceNumber: "asc" } },
      sales: {
        where: { saleStatus: { not: "cancelled" } },
        include: {
          milestones: { orderBy: { sequenceNumber: "asc" } },
          receipts: true,
          project: { include: { currentMilestone: true, milestones: true } },
        },
      },
    },
  });
  if (!project) return { error: "Project not found" };
  const next = project.milestones.find((m) => m.id === newMilestoneId);
  if (!next) return { error: "Stage not found" };
  const finances = project.sales.map((s) => financeForSale({ ...s, project }));
  const preview = amountBecomingDue(project.currentMilestone?.sequenceNumber ?? null, next.sequenceNumber, finances);
  return {
    currentStage: project.currentMilestone?.stageName ?? "None",
    newStage: next.stageName,
    customersAffected: preview.customersAffected,
    newAmountBecomingDue: preview.newAmount.toFixed(2),
  };
}

export async function confirmStageChange(projectId: string, newMilestoneId: string) {
  const auth = await actor("projects.change_stage");
  if ("error" in auth) return auth;
  const user = auth.user;
  const preview = await previewStageChange(projectId, newMilestoneId);
  if ("error" in preview && preview.error) return preview;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { currentMilestone: true, milestones: true },
  });
  if (!project) return { error: "Project not found" };
  const next = project.milestones.find((m) => m.id === newMilestoneId);
  if (!next) return { error: "Stage not found" };

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId },
      data: { currentMilestoneId: next.id, updatedById: user.id },
    });
    await tx.projectStageHistory.create({
      data: {
        projectId,
        previousMilestoneId: project.currentMilestoneId,
        newMilestoneId: next.id,
        previousStageName: project.currentMilestone?.stageName ?? null,
        newStageName: next.stageName,
        changedById: user.id,
        customersAffected: preview.customersAffected ?? 0,
        newAmountBecomingDue: preview.newAmountBecomingDue ?? "0",
      },
    });
    const sales = await tx.sale.findMany({
      where: { projectId, saleStatus: { not: "cancelled" } },
      select: { id: true },
    });
    const now = new Date();
    for (const sale of sales) {
      await tx.salePaymentMilestone.updateMany({
        where: {
          saleId: sale.id,
          sequenceNumber: { lte: next.sequenceNumber },
          becameDueAt: null,
        },
        data: { becameDueAt: now },
      });
    }
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        entityType: "project",
        entityId: projectId,
        action: "stage_change",
        beforeJson: JSON.stringify({ stage: project.currentMilestone?.stageName }),
        afterJson: JSON.stringify({ stage: next.stageName, preview }),
      },
    });
  });
  revalidatePath("/");
  revalidatePath("/payments-due");
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function updateProject(formData: FormData) {
  const auth = await actor("projects.edit");
  if ("error" in auth) return auth;
  const user = auth.user;
  const projectId = String(formData.get("projectId") || "");
  const name = String(formData.get("name") || "").trim();
  if (!projectId) return { error: "Project is required." };
  if (!name) return { error: "Project name is required." };
  const before = await prisma.project.findUnique({ where: { id: projectId } });
  if (!before) return { error: "Project not found." };
  const cost = parseOptionalCost(String(formData.get("estimatedCost") || ""));
  if (cost.error) return { error: cost.error };
  const status = String(formData.get("status") || "active");
  if (
    (status === "completed" || status === "on_hold" || status === "archived") &&
    before.status !== status &&
    !(await can(user.id, "projects.archive"))
  ) {
    return { error: "You do not have permission to archive this project." };
  }
  await prisma.project.update({
    where: { id: projectId },
    data: {
      name,
      propertyType: String(formData.get("propertyType") || "apartment"),
      location: String(formData.get("location") || "").trim() || null,
      description: String(formData.get("description") || "").trim() || null,
      status,
      notes: String(formData.get("notes") || "").trim() || null,
      estimatedCost: cost.value,
      updatedById: user.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      entityType: "project",
      entityId: projectId,
      action: "update",
      beforeJson: JSON.stringify({ name: before.name, propertyType: before.propertyType, location: before.location }),
      afterJson: JSON.stringify({ name }),
    },
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { id: projectId, ok: true };
}

export async function archiveProject(formData: FormData) {
  const auth = await actor("projects.archive");
  if ("error" in auth) return auth;
  const user = auth.user;
  const projectId = String(formData.get("projectId") || "");
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Project not found." };
  if (project.status === "archived") return { error: "This project is already archived." };
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "archived", updatedById: user.id },
  });
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      entityType: "project",
      entityId: projectId,
      action: "archive",
      beforeJson: JSON.stringify({ status: project.status }),
      afterJson: JSON.stringify({ status: "archived" }),
    },
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, id: projectId };
}

export async function deleteProject(formData: FormData) {
  const auth = await actor("projects.archive");
  if ("error" in auth) return auth;
  const user = auth.user;
  const projectId = String(formData.get("projectId") || "");
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { _count: { select: { sales: true, receipts: true } } },
  });
  if (!project) return { error: "Project not found." };
  if (project._count.sales > 0 || project._count.receipts > 0) {
    return {
      error:
        "This project has sales or receipts. Archive it instead of deleting so payment history stays intact.",
    };
  }
  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id: projectId }, data: { currentMilestoneId: null } });
    await tx.conversation.deleteMany({ where: { projectId } });
    await tx.document.deleteMany({ where: { projectId } });
    await tx.projectStageHistory.deleteMany({ where: { projectId } });
    await tx.projectPaymentMilestone.deleteMany({ where: { projectId } });
    await tx.project.delete({ where: { id: projectId } });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        entityType: "project",
        entityId: projectId,
        action: "delete",
        beforeJson: JSON.stringify({ name: project.name, code: project.code }),
      },
    });
  });
  revalidatePath("/projects");
  return { ok: true };
}

export async function updateProjectMilestone(formData: FormData) {
  const auth = await actor("payment_schedule.edit");
  if ("error" in auth) return auth;
  const user = auth.user;
  const milestoneId = String(formData.get("milestoneId") || "");
  const stageName = String(formData.get("stageName") || "").trim();
  const calculationType = String(formData.get("calculationType") || "percentage");
  const applyToSales = formData.get("applyToSales") === "on";
  if (!milestoneId) return { error: "Stage is required." };
  if (!stageName) return { error: "Stage name is required." };

  const milestone = await prisma.projectPaymentMilestone.findUnique({ where: { id: milestoneId } });
  if (!milestone) return { error: "Stage not found." };

  let paymentPercentage: string | null = String(formData.get("paymentPercentage") || "") || null;
  let fixedAmount: string | null = String(formData.get("fixedAmount") || "") || null;

  if (calculationType === "percentage") {
    let pct;
    try {
      pct = money(String(paymentPercentage || "").replace(/%/g, "").trim() || "0");
    } catch {
      return { error: "Enter a valid payment percentage." };
    }
    const siblings = await prisma.projectPaymentMilestone.findMany({
      where: { projectId: milestone.projectId, isActive: true, id: { not: milestoneId } },
    });
    const allocated = sumStagePercentages(siblings);
    const capError = validateStagePercentageCap(allocated, pct);
    if (capError) return { error: capError };
    paymentPercentage = pct.toFixed(2);
    fixedAmount = null;
  } else {
    paymentPercentage = null;
    if (!fixedAmount) return { error: "Enter a fixed amount." };
  }

  const usedCount = await prisma.salePaymentMilestone.count({ where: { projectMilestoneId: milestoneId } });
  await prisma.projectPaymentMilestone.update({
    where: { id: milestoneId },
    data: {
      stageName,
      description: String(formData.get("description") || "").trim() || null,
      calculationType,
      paymentPercentage,
      fixedAmount,
      updatedById: user.id,
    },
  });

  let synced = 0;
  if (applyToSales) {
    synced = await syncUncustomizedSaleSchedules(milestone.projectId);
  }

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      entityType: "project_milestone",
      entityId: milestoneId,
      action: "update",
      beforeJson: JSON.stringify({
        stageName: milestone.stageName,
        paymentPercentage: milestone.paymentPercentage?.toString(),
      }),
      afterJson: JSON.stringify({ stageName, paymentPercentage, applyToSales, synced }),
    },
  });
  revalidatePath(`/projects/${milestone.projectId}`);
  revalidatePath("/");
  revalidatePath("/payments-due");
  const warnings: string[] = [];
  if (usedCount > 0 && !applyToSales) {
    warnings.push(
      `${usedCount} existing sale schedule(s) were not changed. Tick “Apply to existing (non-customized) sales” if you want those amounts updated.`,
    );
  }
  if (applyToSales) {
    warnings.push(`Updated ${synced} non-customized sale schedule(s). Customized customer schedules were left unchanged.`);
  }
  return { ok: true, warn: warnings.join(" ") || null };
}

export async function moveProjectMilestone(formData: FormData) {
  const auth = await actor("payment_schedule.edit");
  if ("error" in auth) return auth;
  const milestoneId = String(formData.get("milestoneId") || "");
  const direction = String(formData.get("direction") || "");
  const milestone = await prisma.projectPaymentMilestone.findUnique({ where: { id: milestoneId } });
  if (!milestone) return { error: "Stage not found." };
  const neighbor = await prisma.projectPaymentMilestone.findFirst({
    where: {
      projectId: milestone.projectId,
      sequenceNumber: direction === "up" ? { lt: milestone.sequenceNumber } : { gt: milestone.sequenceNumber },
    },
    orderBy: { sequenceNumber: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return { error: "Already at the end of the list." };

  await prisma.$transaction(async (tx) => {
    await tx.projectPaymentMilestone.update({
      where: { id: milestone.id },
      data: { sequenceNumber: -1 },
    });
    await tx.projectPaymentMilestone.update({
      where: { id: neighbor.id },
      data: { sequenceNumber: milestone.sequenceNumber },
    });
    await tx.projectPaymentMilestone.update({
      where: { id: milestone.id },
      data: { sequenceNumber: neighbor.sequenceNumber },
    });
  });
  revalidatePath(`/projects/${milestone.projectId}`);
  return { ok: true, warn: "Order updated for the project default schedule. Existing customer schedules keep their own order unless you edit and apply them." };
}

export async function deleteProjectMilestone(formData: FormData) {
  const auth = await actor("payment_schedule.edit");
  if ("error" in auth) return auth;
  const user = auth.user;
  const milestoneId = String(formData.get("milestoneId") || "");
  const milestone = await prisma.projectPaymentMilestone.findUnique({ where: { id: milestoneId } });
  if (!milestone) return { error: "Stage not found." };
  const used = await prisma.salePaymentMilestone.count({ where: { projectMilestoneId: milestoneId } });
  if (used > 0) {
    return {
      error: `This stage is used on ${used} customer payment schedule(s). Edit it instead of deleting, so historical calculations stay intact.`,
    };
  }
  const project = await prisma.project.findUnique({ where: { id: milestone.projectId } });
  await prisma.$transaction(async (tx) => {
    if (project?.currentMilestoneId === milestoneId) {
      const fallback = await tx.projectPaymentMilestone.findFirst({
        where: { projectId: milestone.projectId, id: { not: milestoneId } },
        orderBy: { sequenceNumber: "asc" },
      });
      await tx.project.update({
        where: { id: milestone.projectId },
        data: { currentMilestoneId: fallback?.id ?? null, updatedById: user.id },
      });
    }
    await tx.projectPaymentMilestone.delete({ where: { id: milestoneId } });
  });
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      entityType: "project_milestone",
      entityId: milestoneId,
      action: "delete",
      beforeJson: JSON.stringify({ stageName: milestone.stageName }),
    },
  });
  revalidatePath(`/projects/${milestone.projectId}`);
  return { ok: true };
}
