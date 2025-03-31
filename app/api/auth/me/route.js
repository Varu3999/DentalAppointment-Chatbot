import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/utils/jwt";

// GET /api/auth/me
export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json(
        { message: "Invalid token" },
        { status: 401 }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Get user data with default patient
    const { data: account, error } = await supabase
      .from("accounts")
      .select(`
        id,
        email,
        default_patient_id,
        patients!inner (
          id,
          full_name
        )
      `)
      .eq("id", payload.userId)
      .single();

    if (error) {
      return NextResponse.json(
        { message: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    // Get default patient name if exists
    let defaultPatientName = null;
    if (account.default_patient_id) {
      const defaultPatient = account.patients.find(p => p.id === account.default_patient_id);
      if (defaultPatient) {
        defaultPatientName = defaultPatient.full_name;
      }
    }

    return NextResponse.json({
      user: {
        id: account.id,
        email: account.email,
        defaultPatientName
      }
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
