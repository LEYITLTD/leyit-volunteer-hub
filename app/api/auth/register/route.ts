import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";
import { wrapEmailHtml, renderTemplate } from "@/lib/email-wrapper";
import { toMobileE164, toE164 } from "@/lib/phone";
import { logCommunication } from "@/lib/communications";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const firstName        = (formData.get("firstName") as string)?.trim();
    const lastName         = (formData.get("lastName") as string)?.trim();
    const email            = (formData.get("email") as string)?.toLowerCase().trim();
    const password         = formData.get("password") as string;
    const confirmPassword  = formData.get("confirmPassword") as string;
    const phone            = (formData.get("phone") as string)?.trim();
    const dateOfBirth      = formData.get("dateOfBirth") as string;
    const nationality      = (formData.get("nationality") as string)?.trim() || "GB";
    const address          = (formData.get("address") as string)?.trim();
    const emergencyName    = (formData.get("emergencyName") as string)?.trim();
    const emergencyPhone   = (formData.get("emergencyPhone") as string)?.trim();
    const gender           = (formData.get("gender") as string)?.trim() || null;
    const dietary          = (formData.get("dietary") as string)?.trim() || null;
    const medical          = (formData.get("medical") as string)?.trim() || null;
    const ageConfirmed     = formData.get("ageConfirmed") === "true";
    const privacyAccepted  = formData.get("privacyAccepted") === "true";
    const dbsFile          = formData.get("dbsFile") as File | null;

    // --- Validation ---
    if (!firstName || !lastName || !email || !password || !phone || !dateOfBirth || !address || !emergencyName || !emergencyPhone) {
      return NextResponse.json({ error: "Required fields are missing" }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!ageConfirmed) {
      return NextResponse.json({ error: "You must confirm you are 16 or older" }, { status: 400 });
    }
    if (!privacyAccepted) {
      return NextResponse.json({ error: "You must accept the privacy policy" }, { status: 400 });
    }

    // Normalise phone numbers. The main phone must be a valid mobile (used for SMS),
    // stored canonically as E.164. Emergency contact is normalised if possible but
    // not required to be a mobile.
    const phoneE164 = toMobileE164(phone, "GB");
    if (!phoneE164) {
      return NextResponse.json({ error: "Please enter a valid UK mobile number (e.g. 07700 900123)." }, { status: 400 });
    }
    const emergencyPhoneNormalised = toE164(emergencyPhone, "GB") ?? emergencyPhone;

    const service = createServiceClient();

    // --- Duplicate check ---
    const { data: existing } = await service
      .from("volunteers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    // --- Create auth user ---
    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      const dup = authError.message.toLowerCase().includes("already") || authError.message.toLowerCase().includes("exists");
      return NextResponse.json(
        { error: dup ? "An account with this email already exists" : authError.message },
        { status: dup ? 409 : 400 },
      );
    }

    // --- Create volunteer record ---
    const { data: volunteer, error: volunteerError } = await service
      .from("volunteers")
      .insert({
        auth_user_id:            authData.user.id,
        first_name:              firstName,
        last_name:               lastName,
        email,
        phone:                   phoneE164,
        address,
        date_of_birth:           dateOfBirth,
        nationality,
        gender,
        emergency_contact_name:  emergencyName,
        emergency_contact_phone: emergencyPhoneNormalised,
        dietary_requirements:    dietary,
        medical_info:            medical,
        age_verified:            ageConfirmed,
      })
      .select("id")
      .single();

    if (volunteerError) {
      await service.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
    }

    // --- Seed compliance record ---
    await service.from("volunteer_compliance").insert({ volunteer_id: volunteer.id });

    // --- Upload DBS if provided ---
    let dbsUploaded = false;
    if (dbsFile && dbsFile.size > 0) {
      const ext = dbsFile.name.split(".").pop() ?? "pdf";
      const path = `${volunteer.id}/dbs.${ext}`;
      const bytes = await dbsFile.arrayBuffer();

      const { error: uploadError } = await service.storage
        .from("dbs-documents")
        .upload(path, bytes, { contentType: dbsFile.type, upsert: true });

      if (!uploadError) {
        await service.from("volunteer_compliance").update({
          dbs_status:       "pending",
          dbs_document_url: path,
          dbs_uploaded_at:  new Date().toISOString(),
        }).eq("volunteer_id", volunteer.id);
        dbsUploaded = true;
      }
    }

    // --- Send confirmation email (single "application received" message; DBS is
    // optional at signup and only requested later if the LSEG check isn't clear) ---
    const { data: tpl } = await service
      .from("email_templates")
      .select("subject, body_html")
      .eq("key", "registration_dbs_uploaded")
      .single();

    if (tpl) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const sent = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: email,
        subject: tpl.subject,
        html: wrapEmailHtml(renderTemplate(tpl.body_html, { first_name: firstName })),
      });
      await logCommunication(service, { volunteer_id: volunteer.id, channel: "email", category: "system", subject: tpl.subject, body: "Registration received", status: "sent", provider_message_id: sent.data?.id ?? null });
    }

    return NextResponse.json({ success: true, dbsUploaded }, { status: 201 });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
