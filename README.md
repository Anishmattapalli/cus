# Customer Loger

Standalone project receivables and customer follow-up for plots, apartments, and villas.

## Run locally

From this folder:

```powershell
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Login: `admin@local` / `admin123`

## Seeded test data

- **ABC Residency** (apartments) is at **First Slab**
- Ravi Kumar — Flat 301 — ₹80L — received ₹24L — Due now ₹0 (booking + foundation + first slab covered)
- Meena Sharma — Flat 302 — ₹1 Cr — received ₹15L — Due now includes unpaid earlier stages
- Arjun Reddy — Flat 401 — ₹1.20 Cr — received ₹36L — Due now ₹0 at First Slab
- Ravi also bought **Green Meadows Plots** Plot 25 — ₹40L

On ABC Residency → Overview, change the current stage to **Second Slab**. Confirm the preview. Ravi 301 should show Due now ₹8,00,000. Receipts must stay unchanged.
