import { db, subscriptionPlansTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const SUBSCRIPTION_PLANS = [
  {
    planId: "free",
    name: "Free",
    description: "Starter plan for exploring BELKA AI.",
    price: 0,
    discountPercent: 0,
    tokensPerMonth: 10_000,
    agentsLimit: 1,
    features: JSON.stringify([
      "BELKA CODER access",
      "10K requests/month",
    ]),
    isActive: true,
  },
  {
    planId: "pro",
    name: "Pro",
    description: "Full plan for daily development work.",
    price: 29,
    discountPercent: 0,
    tokensPerMonth: 500_000,
    agentsLimit: 5,
    features: JSON.stringify([
      "500K requests/month",
      "5 agents",
      "MCP access",
      "Priority support",
    ]),
    isActive: true,
  },
  {
    planId: "enterprise",
    name: "Enterprise",
    description: "Advanced plan for teams and companies.",
    price: 99,
    discountPercent: 0,
    tokensPerMonth: 999_999_999,
    agentsLimit: 99,
    features: JSON.stringify([
      "Unlimited requests",
      "99 agents",
      "Dedicated support",
      "API access",
    ]),
    isActive: true,
  },
];

async function seedSubscriptions() {
  console.log("Seeding subscription plans...");

  for (const plan of SUBSCRIPTION_PLANS) {
    const existing = await db
      .select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.planId, plan.planId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(subscriptionPlansTable)
        .set({
          name: plan.name,
          description: plan.description,
          price: plan.price,
          discountPercent: plan.discountPercent,
          tokensPerMonth: plan.tokensPerMonth,
          agentsLimit: plan.agentsLimit,
          features: plan.features,
          isActive: plan.isActive,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionPlansTable.id, existing[0].id));
      console.log(`  Updated: ${plan.planId} (id=${existing[0].id})`);
      continue;
    }

    const inserted = await db
      .insert(subscriptionPlansTable)
      .values(plan)
      .returning();
    console.log(`  Created: ${plan.planId} (id=${inserted[0].id})`);
  }

  console.log(`\nDone! ${SUBSCRIPTION_PLANS.length} subscription plans seeded.`);
  process.exit(0);
}

seedSubscriptions().catch((err) => {
  console.error("Subscription seed failed:", err);
  process.exit(1);
});
