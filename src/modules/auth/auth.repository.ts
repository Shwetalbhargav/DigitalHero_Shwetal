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
  LoginOutcome,
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

interface LoginAttemptDocument {
  identifierHash: string;
  outcome: LoginOutcome;
  userId?: ObjectId;
  createdAt: Date;
  expiresAt: Date;
}

export interface AuthRepository {
  provisionAdmin(email: string, password: string): Promise<AuthUser>;
  authenticate(email: string, password: string): Promise<AuthUser | null>;
  findActiveUserById(userId: string): Promise<AuthUser | null>;
  createSession(userId: string, expiresAt: Date): Promise<CreatedSession>;
  findActiveSession(token: string, now?: Date): Promise<Session | null>;
  revokeSession(token: string): Promise<void>;
  revokeSessionsForUser(userId: string): Promise<void>;
  countRecentFailedLogins(
    identifierHash: string,
    since: Date,
  ): Promise<number>;
  recordLoginAttempt(input: {
    identifierHash: string;
    outcome: LoginOutcome;
    userId?: string;
    createdAt: Date;
    expiresAt: Date;
  }): Promise<void>;
}

async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const database = await getDatabase();
  return database.collection<UserDocument>("users");
}

async function getSessionsCollection(): Promise<Collection<SessionDocument>> {
  const database = await getDatabase();
  return database.collection<SessionDocument>("sessions");
}

async function getLoginAttemptsCollection(): Promise<
  Collection<LoginAttemptDocument>
> {
  const database = await getDatabase();
  return database.collection<LoginAttemptDocument>("loginAttempts");
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

    async authenticate(email, password) {
      const collection = await getUsersCollection();
      const document = await collection.findOne({
        normalizedEmail: normalizeEmail(email),
        status: "active",
      });
      if (!document) {
        await hashPassword(password);
        return null;
      }
      return (await verifyPassword(password, document.passwordHash))
        ? mapUser(document)
        : null;
    },

    async findActiveUserById(userId) {
      if (!ObjectId.isValid(userId)) return null;
      const collection = await getUsersCollection();
      const document = await collection.findOne({
        _id: new ObjectId(userId),
        status: "active",
      });
      return document ? mapUser(document) : null;
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

    async revokeSession(token) {
      const collection = await getSessionsCollection();
      await collection.deleteOne({ tokenHash: hashSessionToken(token) });
    },

    async revokeSessionsForUser(userId) {
      if (!ObjectId.isValid(userId)) throw new Error("Invalid user id.");
      const collection = await getSessionsCollection();
      await collection.deleteMany({ userId: new ObjectId(userId) });
    },

    async countRecentFailedLogins(identifierHash, since) {
      const collection = await getLoginAttemptsCollection();
      return collection.countDocuments({
        identifierHash,
        outcome: "invalid_credentials",
        createdAt: { $gte: since },
      });
    },

    async recordLoginAttempt(input) {
      const collection = await getLoginAttemptsCollection();
      const document: LoginAttemptDocument = {
        identifierHash: input.identifierHash,
        outcome: input.outcome,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt,
      };
      if (input.userId) document.userId = new ObjectId(input.userId);
      await collection.insertOne(document);
    },
  };
}
