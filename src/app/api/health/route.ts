import { NextResponse } from "next/server";

import { getDatabase } from "@/infrastructure/database/mongodb";

export const dynamic = "force-dynamic";

type HealthResponse =
  | {
      ok: true;
      status: "ready";
    }
  | {
      ok: false;
      status: "unavailable";
    };

export async function GET(): Promise<NextResponse<HealthResponse>> {
  try {
    const database = await getDatabase();
    await database.command({ ping: 1 });

    return NextResponse.json(
      { ok: true, status: "ready" },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { ok: false, status: "unavailable" },
      {
        status: 503,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }
}
