#!/usr/bin/env node
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SCRYPT_KEY_LENGTH = 64;

function normalize(input) {
  return input.trim();
}

function hashPassword(password) {
  const normalized = normalize(password);
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(normalized, salt, SCRYPT_KEY_LENGTH, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(`${salt}:${Buffer.from(key).toString("hex")}`);
    });
  });
}

async function main() {
  const passwordHash = await hashPassword("Password@123");
  const user = await prisma.user.upsert({
    where: { email: "admin@eduportal.com" },
    update: { passwordHash, role: "ADMIN", status: "ACTIVE", name: "Admin User" },
    create: {
      name: "Admin User",
      email: "admin@eduportal.com",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE"
    }
  });
  console.log("Admin user ready:", user.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
