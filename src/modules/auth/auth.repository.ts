import {
  MongoServerError,
  ObjectId,
  type Collection,
  type WithId,
} from "mongodb";

import { getDatabase } from "@/infrastructure/database/mongodb";

import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  verifyPassword,
} from "./auth.crypto";
import type {
  AuthUser,
  CreatedSession,
  Session,
  UserStatus,
} from "./auth.types";

interface UserDocument {
  normalizedEmail: string;
  passwordHash: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionDocument {
  userId: ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface AuthRepository {
  provisionAdmin(email: string, password: string): Promise<AuthUser>;
  createSession(userId: string, expiresAt: Date): Promise<CreatedSession>;
  findActiveSession(token: string, now?: Date): Promise<Session | null>;
}

async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const database = await getDatabase();
  return database.collection<UserDocument>("users");
}

async function getSessionsCollection(): Promise<Collection<SessionDocument>> {
  const database = await getDatabase();
  return database.collection<SessionDocument>("sessions");
}

function mapUser(document: WithId<UserDocument>): AuthUser {
  return {
    id: document._id.toHexString(),
    normalizedEmail: document.normalizedEmail,
    status: document.status,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function mapSession(document: WithId<SessionDocument>): Session {
  return {
    id: document._id.toHexString(),
    userId: document.userId.toHexString(),
    expiresAt: document.expiresAt,
    createdAt: document.createdAt,
  };
}

export function createMongoAuthRepository(): AuthRepository {
  return {
    async provisionAdmin(email, password) {
      const collection = await getUsersCollection();
      const normalizedEmail = normalizeEmail(email);
      const existing = await collection.findOne({ normalizedEmail });

      if (existing) {
        if (await verifyPassword(password, existing.passwordHash)) {
          return mapUser(existing);
        }
        const updatedAt = new Date();
        const passwordHash = await hashPassword(password);
        const updated = await collection.findOneAndUpdate(
          { _id: existing._id },
          { $set: { passwordHash, updatedAt } },
          { returnDocument: "after" },
        );
        if (!updated) throw new Error("Admin provisioning did not complete.");
        return mapUser(updated);
      }

      const now = new Date();
      const document: UserDocument = {
        normalizedEmail,
        passwordHash: await hashPassword(password),
        status: "active",
        createdAt: now,
        updatedAt: now,
      };
      try {
        const result = await collection.insertOne(document);
        return mapUser({ ...document, _id: result.insertedId });
      } catch (error) {
        if (error instanceof MongoServerError && error.code === 11_000) {
          return this.provisionAdmin(normalizedEmail, password);
        }
        throw error;
      }
    },

    async createSession(userId, expiresAt) {
      if (!ObjectId.isValid(userId)) throw new Error("Invalid user id.");
      const collection = await getSessionsCollection();
      const token = createSessionToken();
      const document: SessionDocument = {
        userId: new ObjectId(userId),
        tokenHash: hashSessionToken(token),
        expiresAt,
        createdAt: new Date(),
      };
      const result = await collection.insertOne(document);
      return {
        ...mapSession({ ...document, _id: result.insertedId }),
        token,
      };
    },

    async findActiveSession(token, now = new Date()) {
      const collection = await getSessionsCollection();
      const document = await collection.findOne({
        tokenHash: hashSessionToken(token),
        expiresAt: { $gt: now },
      });
      return document ? mapSession(document) : null;
    },
  };
}
