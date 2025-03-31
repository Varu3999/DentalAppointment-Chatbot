import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendOTPEmail } from "@/utils/email";

// Generate a 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/signin
export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Check if account exists
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (accountError && accountError.code !== "PGRST116") {
      return NextResponse.json(
        { message: "Failed to check account" },
        { status: 500 }
      );
    }

    if (!account) {
      return NextResponse.json(
        { message: "Account not found. Please register first." },
        { status: 404 }
      );
    }

    // Generate and store OTP
    const otp = generateOTP();
    const otpValidTill = new Date();
    otpValidTill.setMinutes(otpValidTill.getMinutes() + 10); // OTP valid for 10 minutes

    console.log('Storing OTP:', { otp, otpValidTill });

    const { error: updateError } = await supabase
      .from("accounts")
      .update({
        otp,
        otp_valid_till: otpValidTill.toISOString(),
      })
      .eq("id", account.id);

    console.log('Update result:', { error: updateError });

    if (updateError) {
      return NextResponse.json(
        { message: "Failed to generate OTP" },
        { status: 500 }
      );
    }

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp);
    if (!emailSent) {
      return NextResponse.json(
        { message: "Failed to send OTP email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
