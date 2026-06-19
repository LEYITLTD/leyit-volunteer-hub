import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { id: eventId } = await params;
  const service = createServiceClient();

  const { data, error: dbErr } = await service
    .from("points_transactions")
    .select("id, volunteer_id, amount, type, description, earned_at, volunteers(first_name, last_name)")
    .eq("event_id", eventId)
    .order("earned_at", { ascending: false });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdminUser();
  if (error) return error;

  const { id: eventId } = await params;
  const { volunteer_id, amount, reason } = await req.json() as {
    volunteer_id: string; amount: number; reason: string;
  };

  if (!volunteer_id) return NextResponse.json({ error: "volunteer_id required" }, { status: 400 });
  if (!amount || amount === 0) return NextResponse.json({ error: "amount must be non-zero" }, { status: 400 });
  if (!reason?.trim()) return NextResponse.json({ error: "reason required" }, { status: 400 });

  const service = createServiceClient();

  const { data: tx, error: txErr } = await service
    .from("points_transactions")
    .insert({
      volunteer_id,
      event_id:    eventId,
      type:        amount > 0 ? "manual_bonus" : "deduction",
      amount,
      description: reason.trim(),
      awarded_by:  user!.id,
    })
    .select("id, volunteer_id, amount, type, description, earned_at, volunteers(first_name, last_name)")
    .single();

  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

  // Log to activity feed
  await service.from("activity_log").insert({
    actor_type:  "admin",
    actor_id:    user!.id,
    event_id:    eventId,
    volunteer_id,
    action_type: "points_awarded",
    description: `${amount > 0 ? "+" : ""}${amount} points — ${reason.trim()}`,
    metadata:    { amount, reason: reason.trim(), transaction_id: tx.id },
  });

  return NextResponse.json(tx);
}
