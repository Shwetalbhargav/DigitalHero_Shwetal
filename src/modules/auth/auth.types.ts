export const USER_STATUSES = ["active", "disabled"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export interface AuthUser {
  id: string;
  normalizedEmail: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreatedSession extends Session {
  token: string;
}
