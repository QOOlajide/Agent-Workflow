import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { Profile } from "@/types/workflow";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "profile", "profile.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const profile: Profile = JSON.parse(raw);
    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load profile";
    return NextResponse.json(
      {
        success: false,
        error: `Could not read data/profile/profile.json: ${message}`,
      },
      { status: 500 }
    );
  }
}
