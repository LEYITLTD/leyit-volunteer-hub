import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 3) return NextResponse.json({ suggestions: [] });

  const key = process.env.GETADDRESS_API_KEY;
  if (!key) return NextResponse.json({ suggestions: [] });

  try {
    const res = await fetch(
      `https://api.getAddress.io/autocomplete/${encodeURIComponent(q)}?api-key=${key}`,
      { next: { revalidate: 0 } },
    );
    const data = await res.json();
    // GetAddress.io returns { Message: "Unauthorized" } when key is invalid
    if (!res.ok || data.Message || !Array.isArray(data.suggestions)) {
      return NextResponse.json({ suggestions: [], error: data.Message ?? "Lookup unavailable" });
    }
    return NextResponse.json({ suggestions: data.suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
