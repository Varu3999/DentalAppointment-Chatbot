import { NextResponse } from "next/server";
import { supabase } from "@/utils/supabase";
import { SignJWT } from "jose";

// Convert string to Uint8Array for jose
const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  return new TextEncoder().encode(secret);
};

export async function POST(request) {
  try {
    const { email, otp, fullName, phone, dob, insuranceProvider, selfPay } =
      await request.json();
    console.log("Received data:", {
      email,
      otp,
      fullName,
      phone,
      dob,
      insuranceProvider,
      selfPay,
    });

    if (!email || !otp || !fullName || !phone || !dob) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify OTP
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("*")
      .eq("email", email)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { message: "Account not found" },
        { status: 400 }
      );
    }

    console.log("Verifying OTP:", {
      stored: account.otp,
      received: otp,
      validTill: account.otp_valid_till,
      now: new Date().toISOString(),
    });

    if (account.otp !== otp) {
      return NextResponse.json(
        { message: "Invalid verification code" },
        { status: 400 }
      );
    }

    if (new Date() > new Date(account.otp_valid_till)) {
      return NextResponse.json(
        { message: "Verification code has expired" },
        { status: 400 }
      );
    }

    // Update account to set it as active and clear OTP
    const { error: activateError } = await supabase
      .from("accounts")
      .update({
        is_active: true,
        otp: null,
        otp_valid_till: null,
      })
      .eq("id", account.id);

    if (activateError) {
      console.error("Account activation error:", activateError);
      return NextResponse.json(
        { message: "Failed to activate account" },
        { status: 500 }
      );
    }

    // Create patient record
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .insert([
        {
          account_id: account.id,
          full_name: fullName,
          phone,
          dob,
          insurance_provider: insuranceProvider || null,
          self_pay: selfPay,
        },
      ])
      .select()
      .single();

    if (patientError) {
      console.error("Patient creation error:", patientError);
      // Revert account activation since patient creation failed
      await supabase
        .from("accounts")
        .update({ is_active: false })
        .eq("id", account.id);
      return NextResponse.json(
        { message: "Failed to create patient record" },
        { status: 500 }
      );
    }

    // Update account with default_patient_id
    const { error: updateError } = await supabase
      .from("accounts")
      .update({ default_patient_id: patient.id })
      .eq("id", account.id);

    if (updateError) {
      console.error("Account update error:", updateError);
    }

    // Generate JWT token with default patient info
    const token = await new SignJWT({
      userId: account.id,
      email: account.email,
      defaultPatientName: patient.full_name
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(getSecretKey());

    // Create response with cookie
    const response = NextResponse.json({
      message: "Registration successful",
      user: {
        id: account.id,
        email: account.email,
        defaultPatientName: patient.full_name
      }
    });

    // Set JWT cookie
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // 7 days expiry
      maxAge: 7 * 24 * 60 * 60
    });

    return response;
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
