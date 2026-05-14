import { NextResponse } from "next/server";
import { listPatents, upsertPatent } from "@/lib/db";

export async function GET() {
  const rows = listPatents();
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  upsertPatent({
    registration_number: body.registration_number ?? "",
    publication_number: body.publication_number ?? "",
    application_number: body.application_number ?? "",
    title: body.title ?? "",
    assignee: body.assignee ?? "",
    filing_date: body.filing_date ?? "",
    registration_date: body.registration_date ?? "",
    jplatpat_url: body.jplatpat_url ?? "",
  });
  return NextResponse.json({ ok: true });
}
