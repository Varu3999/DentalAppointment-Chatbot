import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { sendEmergencyRequest } from "@/utils/email";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Verify that the patient belongs to the authenticated account
async function verifyPatientAccess(userId, patientId) {
  const { data: patient, error } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("account_id", userId)
    .single();

  if (error || !patient) {
    return false;
  }
  return true;
}

export async function POST(request) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );
    const userId = verified.payload.userId;
    const email = verified.payload.email;

    // Get request body
    const { patientId, additionalNotes } = await request.json();

    // Validate required fields
    if (!patientId) {
      return NextResponse.json(
        { message: "Patient ID is required" },
        { status: 400 }
      );
    }

    // Verify patient access
    const hasAccess = await verifyPatientAccess(userId, patientId);
    if (!hasAccess) {
      return NextResponse.json(
        { message: "Patient not found or unauthorized" },
        { status: 403 }
      );
    }

    // Get patient details
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("full_name, phone")
      .eq("id", patientId)
      .eq("account_id", userId)
      .single();

    if (patientError || !patient) {
      console.error("Error fetching patient details:", patientError);
      return NextResponse.json(
        { message: "Failed to fetch patient details" },
        { status: 500 }
      );
    }

    // Send emergency request email
    try {
      await sendEmergencyRequest({
        patientName: patient.full_name,
        patientEmail: email,
        patientPhone: patient.phone,
        additionalNotes,
      });

      return NextResponse.json({
        message: "Emergency request sent successfully",
      });
    } catch (error) {
      console.error("Error sending emergency request:", error);
      return NextResponse.json(
        { message: "Failed to send emergency request" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing emergency request:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
