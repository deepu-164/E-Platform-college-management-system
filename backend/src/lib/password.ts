import crypto from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;

function normalize(input: string): string {
  return input.trim();
}

export async function hashPassword(password: string): Promise<string> {
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

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const normalized = normalize(password);
  const [salt, hashHex] = storedHash.split(":");

  if (!salt || !hashHex) {
    return false;
  }

  return new Promise((resolve, reject) => {
    crypto.scrypt(normalized, salt, SCRYPT_KEY_LENGTH, (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      const incomingHash = Buffer.from(key).toString("hex");
      const left = Buffer.from(hashHex, "hex");
      const right = Buffer.from(incomingHash, "hex");

      if (left.length !== right.length) {
        resolve(false);
        return;
      }

      resolve(crypto.timingSafeEqual(left, right));
    });
  });
}
