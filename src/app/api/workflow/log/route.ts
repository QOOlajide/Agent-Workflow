import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type {
  JDAnalysis,
  FitScore,
  TailoredProfile,
  ApplicationLogRow,
} from "@/types/workflow";

async function appendToLocalLog(row: ApplicationLogRow) {
  const logPath = path.join(process.cwd(), "data", "applications.json");
  let rows: ApplicationLogRow[] = [];
  try {
    const raw = await fs.readFile(logPath, "utf-8");
    rows = JSON.parse(raw);
  } catch {
    // File doesn't exist yet
  }
  rows.push(row);
  await fs.writeFile(logPath, JSON.stringify(rows, null, 2));
}

async function appendToGoogleSheets(row: ApplicationLogRow) {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!sheetId || !serviceEmail || !privateKey) return false;

  const { google } = await import("googleapis");
  const auth = new google.auth.JWT({
    email: serviceEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Applications!A:I",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          row.timestamp,
          row.company,
          row.title,
          row.location,
          row.jdUrl || "",
          row.fitScore,
          row.recommendation,
          row.resumeVersionId,
          row.status,
        ],
      ],
    },
  });

  return true;
}

export async function POST(request: Request) {
  try {
    const { jd, fit, tailoredProfile } = (await request.json()) as {
      jd: JDAnalysis;
      fit: FitScore;
      tailoredProfile: TailoredProfile;
    };

    if (!jd || !fit || !tailoredProfile) {
      return NextResponse.json(
        { success: false, error: "jd, fit, and tailoredProfile are required" },
        { status: 400 }
      );
    }

    const row: ApplicationLogRow = {
      timestamp: new Date().toISOString(),
      company: jd.title.includes(" at ") ? jd.title.split(" at ").pop()! : "Unknown",
      title: jd.title,
      location: jd.location,
      jdUrl: undefined,
      fitScore: fit.score,
      recommendation: fit.recommendation,
      resumeVersionId: tailoredProfile.versionId,
      status: "ready_to_apply",
    };

    // Always save locally
    await appendToLocalLog(row);

    // Try Google Sheets if configured
    let sheetsLogged = false;
    try {
      sheetsLogged = await appendToGoogleSheets(row);
    } catch (e) {
      console.warn("Google Sheets append failed (continuing):", e);
    }

    return NextResponse.json({
      success: true,
      data: row,
      sheetsLogged,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Logging failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
