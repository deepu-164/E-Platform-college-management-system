import fs from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CollegeRow = {
  name: string;
  location: string;
  type: string;
  rank: string;
  rating: string;
  feesPerYear: string;
  description: string;
  website?: string;
  phone?: string;
  email?: string;
  established?: string;
  courses?: string;
};

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  };

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cols[index] ?? "";
    });
    return row;
  });
}

function toInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toFloat(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  const csvPath = path.resolve(process.cwd(), "data", "karnataka-colleges.csv");
  const csv = await fs.readFile(csvPath, "utf8");
  const rows = parseCsv(csv) as CollegeRow[];

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    if (!row.name || !row.location) {
      continue;
    }

    const existing = await prisma.college.findFirst({
      where: {
        name: row.name,
        location: row.location
      },
      include: { courses: true }
    });

    const courseNames = (row.courses ?? "MCA")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!existing) {
      await prisma.college.create({
        data: {
          name: row.name,
          location: row.location,
          type: row.type || "Private",
          rank: toInt(row.rank, 9999),
          rating: toFloat(row.rating, 4),
          feesPerYear: toInt(row.feesPerYear, 150000),
          description: row.description || `${row.name} in ${row.location}`,
          website: row.website || null,
          phone: row.phone || null,
          email: row.email || null,
          established: row.established ? toInt(row.established, 2000) : null,
          courses: {
            create: courseNames.map((courseName) => ({
              name: courseName,
              duration: "2 Years",
              feesPerYear: toInt(row.feesPerYear, 150000),
              seats: 60
            }))
          }
        }
      });
      created += 1;
      continue;
    }

    await prisma.college.update({
      where: { id: existing.id },
      data: {
        type: row.type || existing.type,
        rank: toInt(row.rank, existing.rank),
        rating: toFloat(row.rating, existing.rating),
        feesPerYear: toInt(row.feesPerYear, existing.feesPerYear),
        description: row.description || existing.description,
        website: row.website || existing.website,
        phone: row.phone || existing.phone,
        email: row.email || existing.email,
        established: row.established ? toInt(row.established, existing.established ?? 2000) : existing.established
      }
    });

    const existingNames = new Set(existing.courses.map((course) => course.name.toLowerCase()));
    const missing = courseNames.filter((courseName) => !existingNames.has(courseName.toLowerCase()));

    if (missing.length > 0) {
      await prisma.course.createMany({
        data: missing.map((courseName) => ({
          collegeId: existing.id,
          name: courseName,
          duration: "2 Years",
          feesPerYear: toInt(row.feesPerYear, existing.feesPerYear),
          seats: 60
        }))
      });
    }

    updated += 1;
  }

  console.log(`Karnataka colleges import complete. Created: ${created}, Updated: ${updated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
