import { NextResponse } from "next/server";

type NominatimItem = {
  address?: Record<string, string>;
  display_name?: string;
};

function parseAddress(item: NominatimItem) {
  const a = item.address ?? {};
  const houseNum = a.house_number ?? "";
  const road     = a.road ?? a.pedestrian ?? a.footway ?? a.path ?? "";
  const line1    = houseNum && road ? `${houseNum} ${road}` : (road || houseNum);
  const line2    = a.suburb ?? a.neighbourhood ?? a.quarter ?? "";
  const city     = a.city ?? a.town ?? a.village ?? a.hamlet ?? "";
  const county   = a.county ?? a.state_district ?? "";
  const postcode = a.postcode ?? "";
  return { line1, line2, city, county, postcode };
}

function formatDisplay(item: NominatimItem): string {
  const a = item.address ?? {};
  return [
    (a.house_number ? `${a.house_number} ` : "") + (a.road ?? ""),
    a.city ?? a.town ?? a.village ?? "",
    a.county ?? a.state_district ?? "",
    a.postcode ?? "",
  ].filter(Boolean).join(", ");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 3) return NextResponse.json({ suggestions: [] });

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&countrycodes=gb&limit=8`,
      {
        headers: { "User-Agent": "LULGlobalVolunteers/1.0 (volunteers@leyit.dev)" },
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) return NextResponse.json({ suggestions: [] });
    const data: NominatimItem[] = await res.json();
    const suggestions = data.map((item) => ({
      address: formatDisplay(item),
      ...parseAddress(item),
    }));
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
