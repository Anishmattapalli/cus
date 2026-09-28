"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actor, can } from "@/lib/access";
import { createSaleSchedule, nextCode, parseRupees, recalculateSaleMilestoneAmounts } from "@/lib/ops";
import { money } from "@/lib/money";
import { computeMilestoneAmounts, sumStagePercentages, validateStagePercentageCap } from "@/lib/finance";
import { financeForSale } from "@/lib/queries";

function emptyToNull(value: string) {
  const v = value.trim();
  return v ? v : null;
}

function customerFields(formData: FormData) {
  const dob = String(formData.get("dateOfBirth") || "").trim();
  return {
    fullName: String(formData.get("fullName") || "").trim(),
    fatherOrSpouseName: emptyToNull(String(formData.get("fatherOrSpouseName") || "")),
    customerType: String(formData.get("customerType") || "individual"),
    pan: emptyToNull(String(formData.get("pan") || "")),
    idReference: emptyToNull(String(formData.get("idReference") || "")),
    dateOfBirth: dob ? new Date(dob) : null,
    gender: emptyToNull(String(formData.get("gender") || "")),
    primaryMobile: String(formData.get("primaryMobile") || "").trim(),
    alternateMobile: emptyToNull(String(formData.get("alternateMobile") || "")),
    whatsapp: emptyToNull(String(formData.get("whatsapp") || "")),
    email: emptyToNull(String(formData.get("email") || "")),
    residentialAddress: emptyToNull(String(formData.get("residentialAddress") || "")),
    permanentAddress: emptyToNull(String(formData.get("permanentAddress") || "")),
    leadSource: emptyToNull(String(formData.get("leadSource") || "")),
    referredBy: emptyToNull(String(formData.get("referredBy") || "")),
    salesPerson: emptyToNull(String(formData.get("salesPerson") || "")),
    status: String(formData.get("status") || "active"),
    internalNotes: emptyToNull(String(formData.get("internalNotes") || "")),
  };
}

export async function createCustomer(formData: FormData) {
  const auth = await actor("customers.create");
  if ("error" in auth) return auth;
  const user = auth.user;
  const data = customerFields(formData);
  if (!data.fullName || !data.primaryMobile) return { error: "Name and mobile are required." };
  const customer = await prisma.customer.create({
    data: {
      customerCode: await nextCode("customer", "CUS"),
      ...data,
      createdById: user.id,
      updatedById: user.id,
    },
  });
  revalidatePath("/customers");
  return { id: customer.id };
}

export async function updateCustomer(formData: FormData) {
  const auth = await actor("customers.edit");
  if ("error" in auth) return auth;
  const user = auth.user;
  const customerId = String(formData.get("customerId") || "");
  const data = customerFields(formData);
  if (!customerId) return { error: "Customer is required." };
  if (!data.fullName || !data.primaryMobile) return { error: "Name and mobile are required." };
  const existing = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!existing) return { error: "Customer not found." };
  if (data.status === "cancelled" && existing.status !== "cancelled" && !(await can(user.id, "customers.archive"))) {
    return { error: "You do not have permission to cancel this customer." };
  }
  await prisma.customer.update({
    where: { id: customerId },
    data: { ...data, updatedById: user.id },
  });
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      entityType: "customer",
      entityId: customerId,
      action: "update",
      afterJson: JSON.stringify({ fullName: data.fullName, primaryMobile: data.primaryMobile }),
    },
  });
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return { id: customerId, ok: true };
}

export async function updateCustomerNotes(formData: FormData) {
  const auth = await actor("customers.edit");
  if ("error" in auth) return auth;
  const user = auth.user;
  const customerId = String(formData.get("customerId") || "");
  if (!customerId) return { error: "Customer is required." };
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      internalNotes: emptyToNull(String(formData.get("internalNotes") || "")),
      updatedById: user.id,
    },
  });
  revalidatePath(`/customers/${customerId}`);
  return { ok: true };
}

export async function createSale(formData: FormData) {
  const auth = await actor("sales.create");
  if ("error" in auth) return auth;
  const user = auth.user;
  const customerId = String(formData.get("customerId") || "");
  const projectId = String(formData.get("projectId") || "");
  const propertyType = String(formData.get("propertyType") || "apartment");
  const final = parseRupees(String(formData.get("finalAgreedSaleValue") || "0"));
  const base = parseRupees(String(formData.get("baseSaleValue") || final));
  if (!customerId || !projectId) return { error: "Customer and project are required." };
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { milestones: true },
  });
  if (!project) return { error: "Project not found." };
  if (project.milestones.length === 0) return { error: "Add payment stages to the project first." };
  const sale = await prisma.sale.create({
    data: {
      saleCode: await nextCode("sale", "SAL"),
      customerId,
      projectId,
      propertyType,
      unitNumber: String(formData.get("unitNumber") || "") || null,
      flatNumber: String(formData.get("flatNumber") || "") || null,
      plotNumber: String(formData.get("plotNumber") || "") || null,
      villaNumber: String(formData.get("villaNumber") || "") || null,
      block: String(formData.get("block") || "") || null,
      tower: String(formData.get("tower") || "") || null,
      floor: String(formData.get("floor") || "") || null,
      bookingDate: formData.get("bookingDate") ? new Date(String(formData.get("bookingDate"))) : new Date(),
      baseSaleValue: base,
      additionalCharges: parseRupees(String(formData.get("additionalCharges") || "0")),
      discount: parseRupees(String(formData.get("discount") || "0")),
      finalAgreedSaleValue: final,
      notes: String(formData.get("notes") || "") || null,
      createdById: user.id,
      updatedById: user.id,
    },
  });
  await createSaleSchedule({
    saleId: sale.id,
    projectId,
    saleValue: final,
    bookingDate: sale.bookingDate,
  });
  revalidatePath("/sales");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath(`/projects/${projectId}`);
  return { id: sale.id, customerId };
}

function saleFields(formData: FormData) {
  const final = parseRupees(String(formData.get("finalAgreedSaleValue") || "0"));
  const base = parseRupees(String(formData.get("baseSaleValue") || final));
  return {
    propertyType: String(formData.get("propertyType") || "apartment"),
    unitNumber: emptyToNull(String(formData.get("unitNumber") || "")),
    flatNumber: emptyToNull(String(formData.get("flatNumber") || "")),
    plotNumber: emptyToNull(String(formData.get("plotNumber") || "")),
    villaNumber: emptyToNull(String(formData.get("villaNumber") || "")),
    block: emptyToNull(String(formData.get("block") || "")),
    tower: emptyToNull(String(formData.get("tower") || "")),
    floor: emptyToNull(String(formData.get("floor") || "")),
    bookingDate: formData.get("bookingDate") ? new Date(String(formData.get("bookingDate"))) : null,
    baseSaleValue: base,
    additionalCharges: parseRupees(String(formData.get("additionalCharges") || "0")),
    discount: parseRupees(String(formData.get("discount") || "0")),
    finalAgreedSaleValue: final,
    saleStatus: String(formData.get("saleStatus") || "active"),
    notes: emptyToNull(String(formData.get("notes") || "")),
  };
}

export async function updateSale(formData: FormData) {
  const auth = await actor("sales.edit");
  if ("error" in auth) return auth;
  const user = auth.user;
  const saleId = String(formData.get("saleId") || "");
  if (!saleId) return { error: "Sale is required." };
  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) return { error: "Sale not found." };
  const data = saleFields(formData);
  if (moneyZero(String(data.finalAgreedSaleValue))) return { error: "Sale value must be greater than zero." };
  if (data.saleStatus === "cancelled" && sale.saleStatus !== "cancelled" && !(await can(user.id, "sales.cancel"))) {
    return { error: "You do not have permission to cancel a sale." };
  }
  await prisma.sale.update({
    where: { id: saleId },
    data: { ...data, updatedById: user.id },
  });
  await recalculateSaleMilestoneAmounts(saleId);
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      entityType: "sale",
      entityId: saleId,
      action: "update",
      beforeJson: JSON.stringify({ value: sale.finalAgreedSaleValue.toString() }),
      afterJson: JSON.stringify({ value: data.finalAgreedSaleValue }),
    },
  });
  revalidatePath("/sales");
  revalidatePath("/");
  revalidatePath("/payments-due");
  revalidatePath(`/customers/${sale.customerId}`);
  revalidatePath(`/projects/${sale.projectId}`);
  return { ok: true, customerId: sale.customerId };
}

export async function updateSaleMilestone(formData: FormData) {
  const auth = await actor("payment_schedule.edit");
  if ("error" in auth) return auth;
  const user = auth.user;
  const milestoneId = String(formData.get("milestoneId") || "");
  const stageName = String(formData.get("stageName") || "").trim();
  const calculationType = String(formData.get("calculationType") || "percentage");
  if (!milestoneId) return { error: "Stage is required." };
  if (!stageName) return { error: "Stage name is required." };
  const milestone = await prisma.salePaymentMilestone.findUnique({
    where: { id: milestoneId },
    include: { sale: { include: { milestones: true } } },
  });
  if (!milestone) return { error: "Stage not found." };

  let paymentPercentage: string | null = null;
  let amountDue = milestone.amountDue.toString();
  if (calculationType === "percentage") {
    let pct;
    try {
      pct = money(String(formData.get("paymentPercentage") || "").replace(/%/g, "").trim() || "0");
    } catch {
      return { error: "Enter a valid payment percentage." };
    }
    const siblings = milestone.sale.milestones.filter((m) => m.id !== milestoneId);
    const capError = validateStagePercentageCap(sumStagePercentages(siblings), pct);
    if (capError) return { error: capError };
    paymentPercentage = pct.toFixed(2);
  } else {
    amountDue = parseRupees(String(formData.get("fixedAmount") || formData.get("amountDue") || "0"));
    if (moneyZero(amountDue)) return { error: "Enter a fixed amount greater than zero." };
  }

  await prisma.salePaymentMilestone.update({
    where: { id: milestoneId },
    data: {
      stageName,
      description: emptyToNull(String(formData.get("description") || "")),
      calculationType,
      paymentPercentage,
      amountDue: calculationType === "fixed_amount" ? amountDue : milestone.amountDue,
    },
  });
  await prisma.sale.update({
    where: { id: milestone.saleId },
    data: { scheduleIsCustomized: true, updatedById: user.id },
  });
  await recalculateSaleMilestoneAmounts(milestone.saleId);
  revalidatePath(`/customers/${milestone.sale.customerId}`);
  revalidatePath("/");
  revalidatePath("/payments-due");
  return { ok: true, warn: "This customer schedule is now customized. Later project default changes will not overwrite it." };
}

export async function moveSaleMilestone(formData: FormData) {
  const auth = await actor("payment_schedule.edit");
  if ("error" in auth) return auth;
  const user = auth.user;
  const milestoneId = String(formData.get("milestoneId") || "");
  const direction = String(formData.get("direction") || "");
  const milestone = await prisma.salePaymentMilestone.findUnique({ where: { id: milestoneId } });
  if (!milestone) return { error: "Stage not found." };
  const neighbor = await prisma.salePaymentMilestone.findFirst({
    where: {
      saleId: milestone.saleId,
      sequenceNumber: direction === "up" ? { lt: milestone.sequenceNumber } : { gt: milestone.sequenceNumber },
    },
    orderBy: { sequenceNumber: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return { error: "Already at the end of the list." };
  await prisma.$transaction(async (tx) => {
    await tx.salePaymentMilestone.update({ where: { id: milestone.id }, data: { sequenceNumber: -1 } });
    await tx.salePaymentMilestone.update({
      where: { id: neighbor.id },
      data: { sequenceNumber: milestone.sequenceNumber },
    });
    await tx.salePaymentMilestone.update({
      where: { id: milestone.id },
      data: { sequenceNumber: neighbor.sequenceNumber },
    });
  });
  const sale = await prisma.sale.update({
    where: { id: milestone.saleId },
    data: { scheduleIsCustomized: true, updatedById: user.id },
  });
  revalidatePath(`/customers/${sale.customerId}`);
  return { ok: true };
}

export async function deleteSaleMilestone(formData: FormData) {
  const auth = await actor("payment_schedule.edit");
  if ("error" in auth) return auth;
  const user = auth.user;
  const milestoneId = String(formData.get("milestoneId") || "");
  const milestone = await prisma.salePaymentMilestone.findUnique({
    where: { id: milestoneId },
    include: {
      sale: { include: { milestones: true, receipts: true, project: { include: { currentMilestone: true, milestones: true } } } },
    },
  });
  if (!milestone) return { error: "Stage not found." };
  const finance = financeForSale(milestone.sale);
  const row = finance.milestones.find((m) => m.id === milestoneId);
  if (row && money(row.amountPaid).gt(0)) {
    return { error: "This stage already has receipts allocated to it. Edit the percentage instead of deleting." };
  }
  await prisma.salePaymentMilestone.delete({ where: { id: milestoneId } });
  await prisma.sale.update({
    where: { id: milestone.saleId },
    data: { scheduleIsCustomized: true, updatedById: user.id },
  });
  await recalculateSaleMilestoneAmounts(milestone.saleId);
  revalidatePath(`/customers/${milestone.sale.customerId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function addSaleMilestone(formData: FormData) {
  const auth = await actor("payment_schedule.create");
  if ("error" in auth) return auth;
  const user = auth.user;
  const saleId = String(formData.get("saleId") || "");
  const stageName = String(formData.get("stageName") || "").trim();
  const calculationType = String(formData.get("calculationType") || "percentage");
  if (!saleId) return { error: "Sale is required." };
  if (!stageName) return { error: "Stage name is required." };
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { milestones: true, project: { include: { currentMilestone: true } } },
  });
  if (!sale) return { error: "Sale not found." };
  const last = sale.milestones.reduce((n, m) => Math.max(n, m.sequenceNumber), 0);
  let paymentPercentage: string | null = null;
  let amountDue = "0";
  if (calculationType === "percentage") {
    let pct;
    try {
      pct = money(String(formData.get("paymentPercentage") || "").replace(/%/g, "").trim() || "0");
    } catch {
      return { error: "Enter a valid payment percentage." };
    }
    const capError = validateStagePercentageCap(sumStagePercentages(sale.milestones), pct);
    if (capError) return { error: capError };
    paymentPercentage = pct.toFixed(2);
    amountDue = computeMilestoneAmounts(sale.finalAgreedSaleValue, [
      { calculationType: "percentage", paymentPercentage: pct, fixedAmount: null },
    ])[0].toFixed(2);
  } else {
    amountDue = parseRupees(String(formData.get("fixedAmount") || "0"));
    if (moneyZero(amountDue)) return { error: "Enter a fixed amount greater than zero." };
  }
  const currentSeq = sale.project.currentMilestone?.sequenceNumber ?? 0;
  await prisma.salePaymentMilestone.create({
    data: {
      saleId,
      sequenceNumber: last + 1,
      stageName,
      calculationType,
      paymentPercentage,
      amountDue,
      becameDueAt: last + 1 <= currentSeq ? new Date() : null,
    },
  });
  await prisma.sale.update({
    where: { id: saleId },
    data: { scheduleIsCustomized: true, updatedById: user.id },
  });
  await recalculateSaleMilestoneAmounts(saleId);
  revalidatePath(`/customers/${sale.customerId}`);
  revalidatePath("/");
  return { ok: true, warn: "This customer schedule is now customized." };
}

export async function createReceipt(formData: FormData) {
  const auth = await actor("receipts.create");
  if ("error" in auth) return auth;
  const user = auth.user;
  const saleId = String(formData.get("saleId") || "");
  const amount = parseRupees(String(formData.get("amount") || "0"));
  if (!saleId) return { error: "Sale is required." };
  if (moneyZero(amount)) return { error: "Amount must be greater than zero." };
  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) return { error: "Sale not found." };
  if (sale.saleStatus === "cancelled") {
    return { error: "Cannot record a receipt on a cancelled booking. Advance already received stays on the receipt list." };
  }
  await prisma.receipt.create({
    data: {
      receiptNumber: await nextCode("receipt", "RCP"),
      customerId: sale.customerId,
      saleId: sale.id,
      projectId: sale.projectId,
      receiptDate: formData.get("receiptDate") ? new Date(String(formData.get("receiptDate"))) : new Date(),
      amount,
      paymentMode: String(formData.get("paymentMode") || "neft"),
      bankName: String(formData.get("bankName") || "") || null,
      utrOrTransactionNumber: String(formData.get("utrOrTransactionNumber") || "") || null,
      chequeNumber: String(formData.get("chequeNumber") || "") || null,
      reference: String(formData.get("reference") || "") || null,
      remarks: String(formData.get("remarks") || "") || null,
      status: "active",
      createdById: user.id,
      updatedById: user.id,
    },
  });
  revalidatePath("/receipts");
  revalidatePath("/payments-due");
  revalidatePath("/");
  return { ok: true, customerId: sale.customerId };
}

function moneyZero(v: string) {
  try {
    return money(v).lte(0);
  } catch {
    return true;
  }
}

export async function cancelReceipt(receiptId: string, reason: string) {
  const auth = await actor("receipts.cancel");
  if ("error" in auth) return auth;
  const user = auth.user;
  const receipt = await prisma.receipt.findUnique({ where: { id: receiptId } });
  if (!receipt) return { error: "Receipt not found." };
  if (receipt.status === "cancelled") return { error: "Already cancelled." };
  await prisma.receipt.update({
    where: { id: receiptId },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledById: user.id,
      cancellationReason: reason || "Cancelled",
      updatedById: user.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      entityType: "receipt",
      entityId: receiptId,
      action: "cancel",
      beforeJson: JSON.stringify({ amount: receipt.amount.toString(), status: receipt.status }),
    },
  });
  revalidatePath("/receipts");
  revalidatePath("/");
  return { ok: true };
}

export async function addConversation(formData: FormData) {
  const auth = await actor("conversations.create");
  if ("error" in auth) return auth;
  const user = auth.user;
  const customerId = String(formData.get("customerId") || "");
  const notes = String(formData.get("notes") || "").trim();
  if (!customerId || !notes) return { error: "Customer and notes are required." };
  await prisma.conversation.create({
    data: {
      customerId,
      saleId: String(formData.get("saleId") || "") || null,
      projectId: String(formData.get("projectId") || "") || null,
      occurredAt: formData.get("occurredAt") ? new Date(String(formData.get("occurredAt"))) : new Date(),
      interactionType: String(formData.get("interactionType") || "phone_call"),
      subject: String(formData.get("subject") || "") || null,
      notes,
      followUpRequired: formData.get("followUpRequired") === "on",
      followUpAt: formData.get("followUpAt") ? new Date(String(formData.get("followUpAt"))) : null,
      followUpNotes: String(formData.get("followUpNotes") || "") || null,
      createdById: user.id,
      updatedById: user.id,
    },
  });
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/conversations");
  revalidatePath("/");
  return { ok: true };
}

export async function saveDocumentMeta(formData: FormData) {
  const auth = await actor("documents.upload");
  if ("error" in auth) return auth;
  const user = auth.user;
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Document name is required." };
  await prisma.document.create({
    data: {
      name,
      documentType: String(formData.get("documentType") || "other"),
      customerId: String(formData.get("customerId") || "") || null,
      saleId: String(formData.get("saleId") || "") || null,
      projectId: String(formData.get("projectId") || "") || null,
      description: String(formData.get("description") || "") || null,
      notes: String(formData.get("notes") || "") || null,
      documentDate: formData.get("documentDate") ? new Date(String(formData.get("documentDate"))) : null,
      storagePath: "manual-entry",
      originalFilename: name,
      mimeType: "text/plain",
      fileSizeBytes: 0,
      createdById: user.id,
      updatedById: user.id,
    },
  });
  revalidatePath("/");
  return { ok: true };
}

export async function cancelSale(formData: FormData) {
  const auth = await actor("sales.cancel");
  if ("error" in auth) return auth;
  const user = auth.user;
  const saleId = String(formData.get("saleId") || "");
  const reason = String(formData.get("reason") || "").trim();
  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) return { error: "Sale not found." };
  if (sale.saleStatus === "cancelled") return { error: "This booking is already cancelled." };
  const note = [sale.notes, reason ? `Cancelled: ${reason}` : "Cancelled after booking."]
    .filter(Boolean)
    .join("\n");
  await prisma.sale.update({
    where: { id: saleId },
    data: { saleStatus: "cancelled", notes: note, updatedById: user.id },
  });
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      entityType: "sale",
      entityId: saleId,
      action: "cancel",
      afterJson: JSON.stringify({ reason: reason || "Cancelled", receiptsKept: true }),
    },
  });
  revalidatePath("/sales");
  revalidatePath("/");
  revalidatePath("/payments-due");
  revalidatePath(`/customers/${sale.customerId}`);
  revalidatePath(`/projects/${sale.projectId}`);
  return { ok: true, customerId: sale.customerId };
}

export async function cancelCustomerBookings(formData: FormData) {
  const auth = await actor("customers.archive");
  if ("error" in auth) return auth;
  const user = auth.user;
  const customerId = String(formData.get("customerId") || "");
  const reason = String(formData.get("reason") || "").trim() || "Customer cancelled after advance.";
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { sales: true },
  });
  if (!customer) return { error: "Customer not found." };
  const active = customer.sales.filter((s) => s.saleStatus !== "cancelled");
  await prisma.$transaction(async (tx) => {
    for (const sale of active) {
      const note = [sale.notes, `Cancelled: ${reason}`].filter(Boolean).join("\n");
      await tx.sale.update({
        where: { id: sale.id },
        data: { saleStatus: "cancelled", notes: note, updatedById: user.id },
      });
    }
    await tx.customer.update({
      where: { id: customerId },
      data: { status: "cancelled", updatedById: user.id },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        entityType: "customer",
        entityId: customerId,
        action: "cancel_bookings",
        afterJson: JSON.stringify({ reason, salesCancelled: active.length, receiptsKept: true }),
      },
    });
  });
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/");
  revalidatePath("/payments-due");
  return { ok: true, id: customerId };
}

export async function deleteCustomer(formData: FormData) {
  const auth = await actor("customers.archive");
  if ("error" in auth) return auth;
  const user = auth.user;
  const customerId = String(formData.get("customerId") || "");
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { _count: { select: { sales: true, receipts: true } } },
  });
  if (!customer) return { error: "Customer not found." };
  if (customer._count.sales > 0 || customer._count.receipts > 0) {
    return {
      error:
        "This customer has bookings or receipts. Cancel the booking instead of deleting so the advance (receipts) stays in history.",
    };
  }
  await prisma.conversation.deleteMany({ where: { customerId } });
  await prisma.document.deleteMany({ where: { customerId } });
  await prisma.customer.delete({ where: { id: customerId } });
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      entityType: "customer",
      entityId: customerId,
      action: "delete",
      beforeJson: JSON.stringify({ fullName: customer.fullName, customerCode: customer.customerCode }),
    },
  });
  revalidatePath("/customers");
  return { ok: true };
}
