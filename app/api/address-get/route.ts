import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const key = process.env.GETADDRESS_API_KEY;
  if (!key) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  try {
    const res = await fetch(
      `https://api.getAddress.io${url}?api-key=${key}`,
      { next: { revalidate: 0 } },
    );
    if (!res.ok) return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
