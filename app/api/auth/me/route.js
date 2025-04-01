import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";

// Convert string to Uint8Array for jose
const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  return new TextEncoder().encode(secret);
};

// GET /api/auth/me
export async function GET(request) {
  try {
    console.log('GET /api/auth/me - Start');
    const token = request.cookies.get("token")?.value;
    console.log('Token:', token);

    if (!token) {
      console.log('No token found');
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log('Verifying token...');
    const { payload } = await jwtVerify(token, getSecretKey());
    console.log('Token payload:', payload);

    if (!payload?.userId) {
      console.log('Invalid token payload');
      return NextResponse.json(
        { message: "Invalid token" },
        { status: 401 }
      );
    }

    // Create Supabase client
    console.log('Creating Supabase client...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Get user data with default patient
    console.log('Fetching user data for ID:', payload.userId);
    const { data: account, error } = await supabase
      .from("accounts")
      .select(`
        id,
        email,
        default_patient_id,
        default_patient:patients!fk_default_patient (
          id,
          full_name
        )
      `)
      .eq("id", payload.userId)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { message: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    console.log('User data:', account);

    const response = {
      user: {
        id: account.id,
        email: account.email,
        defaultPatientId: account.default_patient_id,
        defaultPatientName: account.default_patient?.full_name
      }
    };

    console.log('Sending response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
