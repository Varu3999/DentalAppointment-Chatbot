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

// Verify patient belongs to account and get account details
async function verifyPatientAccess(supabase, userId, patientId) {
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("default_patient_id")
    .eq("id", userId)
    .single();

  if (accountError) {
    throw new Error("Failed to verify patient access");
  }

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .eq("account_id", userId)
    .single();

  if (patientError || !patient) {
    throw new Error("Patient not found");
  }

  return { patient, isDefaultPatient: patient.id === account.default_patient_id };
}

// PUT /api/patients/[id] - Edit patient details
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const userId = await getUserIdFromToken(request);
    const supabase = getSupabaseClient();

    // Verify patient access and get current data
    const { patient, isDefaultPatient } = await verifyPatientAccess(
      supabase,
      userId,
      id
    );

    // Get request body
    const body = await request.json();
    const { full_name, dob, phone, insurance_provider, self_pay = false } = body;

    // Validate required fields
    if (!full_name || !phone || !dob) {
      return NextResponse.json(
        { message: "Full name, phone, and date of birth are required" },
        { status: 400 }
      );
    }

    // Update patient
    const { data: updatedPatient, error } = await supabase
      .from("patients")
      .update({
        full_name,
        dob,
        phone,
        insurance_provider,
        self_pay
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating patient:", error);
      return NextResponse.json(
        { message: "Failed to update patient" },
        { status: 500 }
      );
    }

    return NextResponse.json({ patient: updatedPatient });
  } catch (error) {
    console.error("Error in PUT /api/patients/[id]:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { 
        status: error.message === "Unauthorized" ? 401 
          : error.message === "Patient not found" ? 404 
          : 500 
      }
    );
  }
}

// DELETE /api/patients/[id] - Remove a patient
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const userId = await getUserIdFromToken(request);
    const supabase = getSupabaseClient();

    // Verify patient access and get current data
    const { isDefaultPatient } = await verifyPatientAccess(
      supabase,
      userId,
      id
    );

    // Don't allow deleting default patient
    if (isDefaultPatient) {
      return NextResponse.json(
        { message: "Cannot delete default patient" },
        { status: 403 }
      );
    }

    // Delete patient
    const { error } = await supabase
      .from("patients")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting patient:", error);
      return NextResponse.json(
        { message: "Failed to delete patient" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Patient deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/patients/[id]:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { 
        status: error.message === "Unauthorized" ? 401 
          : error.message === "Patient not found" ? 404 
          : 500 
      }
    );
  }
}
