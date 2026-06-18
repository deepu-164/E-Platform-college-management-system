import fs from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type OfficialCollege = {
  code: string;
  name: string;
  location: string;
  type: string;
  rank: string;
  rating: string;
  feesPerYear: string;
  description: string;
  courses: string;
};

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/univesity/g, "university")
    .replace(/[^a-z0-9]/g, "");
}

function collegeKey(name: string, location: string): string {
  return `${normalizeKey(name)}::${normalizeKey(location)}`;
}

function parseCsv(content: string): OfficialCollege[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];

      if (char === "\"") {
        if (inQuotes && line[index + 1] === "\"") {
          current += "\"";
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current);
    return values.map((value) => value.trim());
  };

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row = {} as Record<string, string>;

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row as OfficialCollege;
  });
}

async function main() {
  const csvPath = path.resolve(process.cwd(), "data", "kea-kcet-engineering-colleges.csv");
  const csv = await fs.readFile(csvPath, "utf8");
  const official = parseCsv(csv);

  const current = await prisma.college.findMany({
    include: {
      courses: true,
      applications: { select: { id: true } },
      inquiries: { select: { id: true } },
      reviews: { select: { id: true } },
      appointments: { select: { id: true } },
      managers: { select: { id: true } }
    }
  });

  let deletedSynthetic = 0;
  for (const college of current) {
    const relationCount =
      college.applications.length +
      college.inquiries.length +
      college.reviews.length +
      college.appointments.length +
      college.managers.length;

    if (/\d{2,}$/.test(college.name.trim()) && relationCount === 0) {
      await prisma.college.delete({ where: { id: college.id } });
      deletedSynthetic += 1;
    }
  }

  const refreshed = await prisma.college.findMany({
    include: { courses: true }
  });

  const currentByKey = new Map<string, typeof refreshed[number]>();
  for (const college of refreshed) {
    currentByKey.set(collegeKey(college.name, college.location), college);
  }

  let created = 0;
  let updated = 0;
  let addedCourses = 0;

  for (const college of official) {
    const existing = currentByKey.get(collegeKey(college.name, college.location));
    const courseNames = college.courses
      .split("|")
      .map((course) => course.trim())
      .filter(Boolean);

    if (!existing) {
      const item = await prisma.college.create({
        data: {
          name: college.name,
          location: college.location,
          type: college.type,
          rank: Number.parseInt(college.rank, 10),
          rating: Number.parseFloat(college.rating),
          feesPerYear: Number.parseInt(college.feesPerYear, 10),
          description: college.description,
          admissionRequirements: [
            "KCET / UGCET eligibility as per KEA rules",
            "Verification of documents during counselling",
            "Seat allotment based on rank, category, and availability"
          ],
          courses: {
            create: courseNames.map((courseName) => ({
              name: courseName,
              duration: "4 Years",
              feesPerYear: Number.parseInt(college.feesPerYear, 10),
              seats: 60
            }))
          }
        },
        include: { courses: true }
      });

      currentByKey.set(collegeKey(item.name, item.location), item);
      created += 1;
      continue;
    }

    await prisma.college.update({
      where: { id: existing.id },
      data: {
        name: college.name,
        location: college.location,
        type: college.type,
        rank: Number.parseInt(college.rank, 10),
        rating: Number.parseFloat(college.rating),
        description: college.description,
        admissionRequirements: [
          "KCET / UGCET eligibility as per KEA rules",
          "Verification of documents during counselling",
          "Seat allotment based on rank, category, and availability"
        ]
      }
    });

    const existingCourseKeys = new Set(existing.courses.map((course) => normalizeKey(course.name)));
    const missingCourses = courseNames.filter((courseName) => !existingCourseKeys.has(normalizeKey(courseName)));

    if (missingCourses.length > 0) {
      await prisma.course.createMany({
        data: missingCourses.map((courseName) => ({
          collegeId: existing.id,
          name: courseName,
          duration: "4 Years",
          feesPerYear: existing.feesPerYear,
          seats: 60
        }))
      });
      addedCourses += missingCourses.length;
    }

    updated += 1;
  }

  const total = await prisma.college.count();
  console.log(`OFFICIAL_COLLEGES=${official.length}`);
  console.log(`DELETED_SYNTHETIC=${deletedSynthetic}`);
  console.log(`CREATED=${created}`);
  console.log(`UPDATED=${updated}`);
  console.log(`ADDED_COURSES=${addedCourses}`);
  console.log(`TOTAL_COLLEGES=${total}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
