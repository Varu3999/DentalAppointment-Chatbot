import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";

// Convert string to Uint8Array for jose
const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  return new TextEncoder().encode(secret);
};

// Verify JWT token and get user ID
async function getUserIdFromToken(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) {
    throw new Error("Unauthorized");
  }

  const { payload } = await jwtVerify(token, getSecretKey());
  if (!payload?.userId) {
    throw new Error("Invalid token");
  }

  return payload.userId;
}

// Initialize Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

// GET /api/patients - List all patients for the authenticated account
export async function GET(request) {
  try {
    const userId = await getUserIdFromToken(request);
    const supabase = getSupabaseClient();

    // Get all patients for the account
    const { data: patients, error } = await supabase
      .from("patients")
      .select("*")
      .eq("account_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching patients:", error);
      return NextResponse.json(
        { message: "Failed to fetch patients" },
        { status: 500 }
      );
    }

    return NextResponse.json({ patients });
  } catch (error) {
    console.error("Error in GET /api/patients:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

// POST /api/patients - Add a new patient
export async function POST(request) {
  try {
    const userId = await getUserIdFromToken(request);
    const supabase = getSupabaseClient();

    // Get request body
    const body = await request.json();
    const { full_name, dob, phone, insurance_provider, self_pay } = body;

    // Validate required fields
    if (!full_name || !phone || !dob) {
      return NextResponse.json(
        { message: "Full name, phone, and date of birth are required" },
        { status: 400 }
      );
    }

    // Create new patient
    const { data: patient, error } = await supabase
      .from("patients")
      .insert([
        {
          account_id: userId,
          full_name,
          dob,
          phone,
          insurance_provider,
          self_pay: self_pay || false
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating patient:", error);
      return NextResponse.json(
        { message: "Failed to create patient" },
        { status: 500 }
      );
    }

    return NextResponse.json({ patient }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/patients:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
