import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeName(name: string): string {
  return name
    .replace(/\s+\d{2,}$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function groupKey(name: string, location: string): string {
  return `${normalizeName(name).toLowerCase()}::${location.toLowerCase().trim()}`;
}

async function main() {
  const colleges = await prisma.college.findMany({
    orderBy: [{ rank: "asc" }, { rating: "desc" }, { createdAt: "asc" }],
    include: {
      courses: true
    }
  });

  const groups = new Map<string, typeof colleges>();

  for (const college of colleges) {
    const key = groupKey(college.name, college.location);
    const list = groups.get(key) ?? [];
    list.push(college);
    groups.set(key, list);
  }

  let mergedGroups = 0;
  let deletedColleges = 0;
  let renamedColleges = 0;

  for (const group of groups.values()) {
    if (group.length === 0) continue;

    const keeper = group[0];
    const normalized = normalizeName(keeper.name);

    if (normalized !== keeper.name) {
      await prisma.college.update({
        where: { id: keeper.id },
        data: { name: normalized }
      });
      renamedColleges += 1;
    }

    if (group.length === 1) {
      continue;
    }

    mergedGroups += 1;

    for (let index = 1; index < group.length; index += 1) {
      const duplicate = group[index];

      await prisma.$transaction(async (tx) => {
        await tx.application.updateMany({ where: { collegeId: duplicate.id }, data: { collegeId: keeper.id } });
        await tx.inquiry.updateMany({ where: { collegeId: duplicate.id }, data: { collegeId: keeper.id } });

        const existingCourseNames = new Set(
          (await tx.course.findMany({ where: { collegeId: keeper.id }, select: { name: true } })).map((course) => course.name.toLowerCase())
        );

        const duplicateCourses = await tx.course.findMany({ where: { collegeId: duplicate.id } });
        for (const course of duplicateCourses) {
          if (!existingCourseNames.has(course.name.toLowerCase())) {
            await tx.course.create({
              data: {
                collegeId: keeper.id,
                name: course.name,
                duration: course.duration,
                feesPerYear: course.feesPerYear,
                seats: course.seats
              }
            });
          }
        }

        await tx.course.deleteMany({ where: { collegeId: duplicate.id } });
        await tx.college.delete({ where: { id: duplicate.id } });
      });

      deletedColleges += 1;
    }
  }

  const totalAfter = await prisma.college.count();
  console.log(`Cleanup complete. Merged groups: ${mergedGroups}, Deleted duplicates: ${deletedColleges}, Renamed: ${renamedColleges}, Total colleges now: ${totalAfter}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
