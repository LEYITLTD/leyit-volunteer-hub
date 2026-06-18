import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { createServiceClient } from "@/lib/supabase/service";

function fmtDob(d: string | null): string {
  if (!d) return "";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dt  = new Date(d);
  const day = String(dt.getUTCDate()).padStart(2, "0");
  const mon = months[dt.getUTCMonth()];
  const yr  = String(dt.getUTCFullYear()).slice(-2);
  return `${day}-${mon}-${yr}`;
}

export async function GET() {
  const { error } = await requireAdminUser();
  if (error) return error;

  const service = createServiceClient();

  // Volunteers who need LSEG screening (no clear status)
  const { data: volunteers } = await service
    .from("volunteers")
    .select(`
      first_name, last_name, gender, date_of_birth,
      volunteer_compliance ( lseg_status )
    `);

  const toExport = (volunteers ?? []).filter(v => {
    const comp = Array.isArray(v.volunteer_compliance) ? v.volunteer_compliance[0] : v.volunteer_compliance;
    return !comp?.lseg_status || comp.lseg_status !== "clear";
  });

  const headers = [
    "Name", "Alternate Name(s)", "Case ID", "Entity Type",
    "Gender", "Date of Birth", "Country Location", "Place of Birth",
    "Citizenship", "Registered Country", "IMO Number",
    "Primary Case ID", "Identification Number(s)",
  ];

  const rows = toExport.map(v => {
    const name   = `${v.first_name} ${v.last_name}`;
    const gender = v.gender ? (v.gender.charAt(0).toUpperCase() + v.gender.slice(1)) : "";
    const dob    = fmtDob(v.date_of_birth);
    return [name, "", "", "Individual", gender, dob, "United Kingdom", "", "", "", "", "", ""];
  });

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="lseg-batch-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
