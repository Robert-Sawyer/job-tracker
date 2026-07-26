import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      passwordHash: "PLACEHOLDER_REPLACED_ON_DAY_5",
      displayName: "Demo User",
    },
  });

  await prisma.application.deleteMany({ where: { userId: user.id } });

  await prisma.application.create({
    data: {
      userId: user.id,
      company: "Acme Software",
      position: "Fullstack Developer (Next.js / Node)",
      location: "Kraków / remote",
      status: "interview",
      appliedAt: new Date("2026-07-10"),
      statusChanges: {
        create: [
          { fromStatus: null, toStatus: "saved", changedAt: new Date("2026-07-08") },
          { fromStatus: "saved", toStatus: "applied", changedAt: new Date("2026-07-10") },
          { fromStatus: "applied", toStatus: "interview", changedAt: new Date("2026-07-18") },
        ],
      },
    },
  });

  console.log("Seed done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
