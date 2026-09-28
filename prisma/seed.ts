import { PrismaClient } from "@prisma/client";
import { computeSaleFinance } from "../src/lib/finance";
import { computeMilestoneAmounts } from "../src/lib/finance";
import { money } from "../src/lib/money";

const prisma = new PrismaClient();

async function code(name: string, prefix: string, start = 1) {
  await prisma.sequenceCounter.upsert({
    where: { name },
    update: { value: start },
    create: { name, value: start },
  });
}

async function main() {
  await prisma.userPermissionOverride.deleteMany();
  await prisma.userProjectAccess.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.document.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.salePaymentMilestone.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.projectStageHistory.deleteMany();
  await prisma.project.updateMany({ data: { currentMilestoneId: null } });
  await prisma.projectPaymentMilestone.deleteMany();
  await prisma.project.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.sequenceCounter.deleteMany();

  const { ensureRbac, resetRbacCache } = await import("../src/lib/ensure-rbac");
  resetRbacCache();
  await ensureRbac();
  const admin = await prisma.user.findFirst({
    where: { role: { slug: "administrator" } },
  });
  if (!admin) throw new Error("Administrator user was not created. Set AUTH_EMAIL and AUTH_PASSWORD.");

  const stages = [
    ["Booking", "10"],
    ["Foundation", "10"],
    ["First Slab", "10"],
    ["Second Slab", "10"],
    ["Brick Work", "10"],
    ["Tiles", "10"],
    ["Finishing", "10"],
    ["Handover", "10"],
    ["Registration", "20"],
  ] as const;

  const project = await prisma.project.create({
    data: {
      code: "PRJ-ABC",
      name: "ABC Residency",
      propertyType: "apartment",
      location: "Hyderabad",
      status: "active",
      createdById: admin.id,
      updatedById: admin.id,
      milestones: {
        create: stages.map(([stageName, pct], i) => ({
          sequenceNumber: i + 1,
          stageName,
          calculationType: "percentage",
          paymentPercentage: pct,
          isActive: true,
        })),
      },
    },
    include: { milestones: { orderBy: { sequenceNumber: "asc" } } },
  });

  const firstSlab = project.milestones.find((m) => m.stageName === "First Slab")!;
  const booking = project.milestones.find((m) => m.stageName === "Booking")!;
  const foundation = project.milestones.find((m) => m.stageName === "Foundation")!;
  const secondSlab = project.milestones.find((m) => m.stageName === "Second Slab")!;

  await prisma.project.update({
    where: { id: project.id },
    data: { currentMilestoneId: firstSlab.id },
  });

  await prisma.projectStageHistory.createMany({
    data: [
      {
        projectId: project.id,
        previousMilestoneId: null,
        newMilestoneId: booking.id,
        previousStageName: null,
        newStageName: "Booking",
        changedAt: new Date("2026-09-01T10:00:00"),
        changedById: admin.id,
        customersAffected: 0,
        newAmountBecomingDue: 0,
      },
      {
        projectId: project.id,
        previousMilestoneId: booking.id,
        newMilestoneId: foundation.id,
        previousStageName: "Booking",
        newStageName: "Foundation",
        changedAt: new Date("2026-09-05T10:00:00"),
        changedById: admin.id,
      },
      {
        projectId: project.id,
        previousMilestoneId: foundation.id,
        newMilestoneId: firstSlab.id,
        previousStageName: "Foundation",
        newStageName: "First Slab",
        changedAt: new Date("2026-09-20T10:00:00"),
        changedById: admin.id,
      },
    ],
  });

  const plotProject = await prisma.project.create({
    data: {
      code: "PRJ-PLT",
      name: "Green Meadows Plots",
      propertyType: "plot",
      location: "Shamshabad",
      status: "active",
      createdById: admin.id,
      milestones: {
        create: [
          { sequenceNumber: 1, stageName: "Booking", calculationType: "percentage", paymentPercentage: "20" },
          { sequenceNumber: 2, stageName: "Agreement", calculationType: "percentage", paymentPercentage: "30" },
          { sequenceNumber: 3, stageName: "Development Completion", calculationType: "percentage", paymentPercentage: "30" },
          { sequenceNumber: 4, stageName: "Registration", calculationType: "percentage", paymentPercentage: "20" },
        ],
      },
    },
    include: { milestones: { orderBy: { sequenceNumber: "asc" } } },
  });
  const plotBooking = plotProject.milestones[0];
  await prisma.project.update({
    where: { id: plotProject.id },
    data: { currentMilestoneId: plotBooking.id },
  });

  async function makeCustomer(code: string, name: string, mobile: string, email: string) {
    return prisma.customer.create({
      data: {
        customerCode: code,
        fullName: name,
        customerType: "individual",
        primaryMobile: mobile,
        email,
        status: "active",
        createdById: admin.id,
      },
    });
  }

  const ravi = await makeCustomer("CUS-0001", "Ravi Kumar", "9876500001", "ravi@example.com");
  const meena = await makeCustomer("CUS-0002", "Meena Sharma", "9876500002", "meena@example.com");
  const arjun = await makeCustomer("CUS-0003", "Arjun Reddy", "9876500003", "arjun@example.com");

  async function makeSale(opts: {
    code: string;
    customerId: string;
    projectId: string;
    propertyType: string;
    flat?: string;
    plot?: string;
    value: string;
    projectMilestones: typeof project.milestones;
    currentSeq: number;
    receipts?: { amount: string; date: string; mode?: string }[];
  }) {
    const amounts = computeMilestoneAmounts(
      opts.value,
      opts.projectMilestones.map((m) => ({
        calculationType: m.calculationType,
        paymentPercentage: m.paymentPercentage,
        fixedAmount: m.fixedAmount,
      })),
    );
    const sale = await prisma.sale.create({
      data: {
        saleCode: opts.code,
        customerId: opts.customerId,
        projectId: opts.projectId,
        propertyType: opts.propertyType,
        flatNumber: opts.flat,
        plotNumber: opts.plot,
        unitNumber: opts.flat || opts.plot,
        bookingDate: new Date("2026-08-15"),
        baseSaleValue: opts.value,
        finalAgreedSaleValue: opts.value,
        saleStatus: "active",
        createdById: admin.id,
        milestones: {
          create: opts.projectMilestones.map((m, i) => ({
            projectMilestoneId: m.id,
            sequenceNumber: m.sequenceNumber,
            stageName: m.stageName,
            calculationType: m.calculationType,
            paymentPercentage: m.paymentPercentage,
            amountDue: amounts[i],
            becameDueAt: m.sequenceNumber <= opts.currentSeq ? new Date("2026-08-15") : null,
          })),
        },
      },
    });
    let n = 1;
    for (const r of opts.receipts ?? []) {
      await prisma.receipt.create({
        data: {
          receiptNumber: `${opts.code}-R${n++}`,
          customerId: opts.customerId,
          saleId: sale.id,
          projectId: opts.projectId,
          receiptDate: new Date(r.date),
          amount: r.amount,
          paymentMode: r.mode || "neft",
          status: "active",
          createdById: admin.id,
        },
      });
    }
    return sale;
  }

  await makeSale({
    code: "SAL-0001",
    customerId: ravi.id,
    projectId: project.id,
    propertyType: "apartment",
    flat: "301",
    value: "8000000",
    projectMilestones: project.milestones,
    currentSeq: 3,
    receipts: [{ amount: "2400000", date: "2026-09-10", mode: "neft" }],
  });

  await makeSale({
    code: "SAL-0002",
    customerId: meena.id,
    projectId: project.id,
    propertyType: "apartment",
    flat: "302",
    value: "10000000",
    projectMilestones: project.milestones,
    currentSeq: 3,
    receipts: [{ amount: "1500000", date: "2026-09-12", mode: "upi" }],
  });

  await makeSale({
    code: "SAL-0003",
    customerId: arjun.id,
    projectId: project.id,
    propertyType: "apartment",
    flat: "401",
    value: "12000000",
    projectMilestones: project.milestones,
    currentSeq: 3,
    receipts: [{ amount: "3600000", date: "2026-09-08", mode: "rtgs" }],
  });

  await makeSale({
    code: "SAL-0004",
    customerId: ravi.id,
    projectId: plotProject.id,
    propertyType: "plot",
    plot: "25",
    value: "4000000",
    projectMilestones: plotProject.milestones,
    currentSeq: 1,
    receipts: [{ amount: "500000", date: "2026-09-18", mode: "cheque" }],
  });

  await prisma.conversation.create({
    data: {
      customerId: ravi.id,
      projectId: project.id,
      occurredAt: new Date("2026-09-27T11:00:00"),
      interactionType: "phone_call",
      subject: "First slab payment reminder",
      notes: "Customer informed about first slab payment becoming due.",
      followUpRequired: true,
      followUpAt: new Date("2026-10-02T10:00:00"),
      followUpNotes: "Call again if NEFT not received.",
      createdById: admin.id,
    },
  });

  await code("customer", "CUS", 4);
  await code("sale", "SAL", 4);
  await code("receipt", "RCP", 4);
  await code("project", "PRJ", 2);

  const sales = await prisma.sale.findMany({
    include: {
      milestones: true,
      receipts: true,
      project: { include: { currentMilestone: true, milestones: true } },
    },
  });
  console.log("Seed complete. Login: admin@local / admin123\n");
  for (const s of sales) {
    const seq = s.project.currentMilestone?.sequenceNumber ?? 0;
    const f = computeSaleFinance(
      s.finalAgreedSaleValue,
      s.milestones,
      s.receipts,
      seq,
    );
    console.log(
      `${s.saleCode} value=${f.saleValue} recv=${f.received} out=${f.outstanding} dueNow=${f.dueNow} future=${f.futureOutstanding}`,
    );
  }

  const ravi301 = sales.find((s) => s.saleCode === "SAL-0001")!;
  const f = computeSaleFinance(
    ravi301.finalAgreedSaleValue,
    ravi301.milestones,
    ravi301.receipts,
    3,
  );
  if (!money(f.dueNow).eq(0)) {
    console.log("Check: at First Slab with 24L paid, Due Now should be 0:", f.dueNow);
  }
  const f2 = computeSaleFinance(
    ravi301.finalAgreedSaleValue,
    ravi301.milestones,
    ravi301.receipts,
    4,
  );
  console.log("If stage moves to Second Slab, Ravi 301 Due Now should be 800000:", f2.dueNow);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
