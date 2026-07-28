import {
  createHash,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const SESSION_TOKEN_BYTES = 32;

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number; maxmem: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, keyLength, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
    maxmem: SCRYPT_MAX_MEMORY,
  });

  return [
    "scrypt",
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const [algorithm, cost, blockSize, parallelization, salt, expected] =
    encodedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    !cost ||
    !blockSize ||
    !parallelization ||
    !salt ||
    !expected
  ) {
    return false;
  }

  const parameters = [cost, blockSize, parallelization].map(Number);
  if (parameters.some((value) => !Number.isSafeInteger(value) || value <= 0)) {
    return false;
  }

  try {
    const expectedBuffer = Buffer.from(expected, "base64url");
    if (expectedBuffer.length !== SCRYPT_KEY_LENGTH) return false;
    const actual = await deriveKey(
      password,
      Buffer.from(salt, "base64url"),
      expectedBuffer.length,
      {
        N: parameters[0],
        r: parameters[1],
        p: parameters[2],
        maxmem: SCRYPT_MAX_MEMORY,
      },
    );
    return timingSafeEqual(actual, expectedBuffer);
  } catch {
    return false;
  }
}

export function createSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("base64url");
}

export function hashLoginIdentifier(email: string, ipAddress: string): string {
  return createHash("sha256")
    .update(`${normalizeEmail(email)}\0${ipAddress}`, "utf8")
    .digest("base64url");
}
