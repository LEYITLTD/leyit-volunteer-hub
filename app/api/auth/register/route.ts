import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      firstName, lastName, email, password, confirmPassword,
      phone, dateOfBirth, nationality, address,
      emergencyName, emergencyPhone,
      dietary, medical,
      ageConfirmed, privacyAccepted,
    } = body;

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

    const service = createServiceClient();

    // Create Supabase Auth user (email auto-confirmed — admin approves DBS separately)
    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
    });

    if (authError) {
      const alreadyExists =
        authError.message.toLowerCase().includes("already") ||
        authError.message.toLowerCase().includes("exists");
      return NextResponse.json(
        { error: alreadyExists ? "An account with this email already exists" : authError.message },
        { status: alreadyExists ? 409 : 400 },
      );
    }

    // Insert volunteer record
    const { data: volunteer, error: volunteerError } = await service
      .from("volunteers")
      .insert({
        auth_user_id: authData.user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        date_of_birth: dateOfBirth,
        nationality: nationality || "GB",
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
        dietary_requirements: dietary?.trim() || null,
        medical_info: medical?.trim() || null,
        age_verified: ageConfirmed,
      })
      .select("id")
      .single();

    if (volunteerError) {
      // Roll back the auth user so they can retry
      await service.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
    }

    // Seed compliance record with defaults
    await service.from("volunteer_compliance").insert({ volunteer_id: volunteer.id });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
