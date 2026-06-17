import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 3) return NextResponse.json({ suggestions: [] });

  const key = process.env.GETADDRESS_API_KEY;
  if (!key) return NextResponse.json({ suggestions: [] });

  try {
    const res = await fetch(
      `https://api.getAddress.io/autocomplete/${encodeURIComponent(q)}?api-key=${key}&all=true`,
      { next: { revalidate: 0 } },
    );
    if (!res.ok) return NextResponse.json({ suggestions: [] });
    const data = await res.json();
    return NextResponse.json({ suggestions: data.suggestions ?? [] });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
