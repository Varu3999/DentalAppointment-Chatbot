import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";

// Convert string to Uint8Array for jose
const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  return new TextEncoder().encode(secret);
};

// POST /api/auth/signin/verify
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    console.log('Verifying OTP:', { email, otp });

    if (!email || !otp) {
      return NextResponse.json(
        { message: "Email and OTP are required" },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Get account with OTP
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select(`
        *,
        default_patient:patients!fk_default_patient(id, full_name)
      `)
      .eq("email", email.toLowerCase())
      .eq("otp", otp)
      .single();

    console.log('Account data:', { account, error: accountError });

    if (accountError || !account) {
      return NextResponse.json(
        { message: "Invalid OTP" },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    const otpValidTill = new Date(account.otp_valid_till);
    if (otpValidTill < new Date()) {
      return NextResponse.json(
        { message: "OTP has expired" },
        { status: 400 }
      );
    }

    // Clear OTP
    const { error: updateError } = await supabase
      .from("accounts")
      .update({
        otp: null,
        otp_valid_till: null,
        is_active: true
      })
      .eq("id", account.id);

    if (updateError) {
      return NextResponse.json(
        { message: "Failed to verify OTP" },
        { status: 500 }
      );
    }

    // Get default patient name if exists
    const defaultPatientName = account.default_patient?.full_name || null;

    // Generate JWT token
    const token = await new SignJWT({
      userId: account.id,
      email: account.email,
      defaultPatientName
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(getSecretKey());

    // Create response with cookie
    const response = NextResponse.json({
      message: "Signed in successfully",
      user: {
        id: account.id,
        email: account.email,
        defaultPatientName
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
    console.error("Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
