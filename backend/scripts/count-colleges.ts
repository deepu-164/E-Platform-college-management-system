import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.college.count();
  const sample = await prisma.college.findMany({
    take: 5,
    orderBy: { name: "asc" },
    select: { name: true, location: true }
  });

  console.log(`TOTAL_COLLEGES=${total}`);
  console.log(`SAMPLE=${JSON.stringify(sample)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
