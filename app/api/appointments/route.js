import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET(request) {
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

    // Get patient ID from query params
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    // Base query to get appointments with patient and time slot info
    let query = supabase
      .from('appointments')
      .select(`
        appointment_id,
        appointment_type,
        additional_notes,
        patients (
          id,
          full_name
        ),
        time_slots (
          time
        )
      `)
      .eq('patients.account_id', userId)
      .gte('time_slots.time', new Date().toISOString());

    // Add patient filter if provided
    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    // Execute query
    const { data: appointments, error } = await query
      .order('time', { foreignTable: 'time_slots', ascending: true })
      .limit(100);

    if (error) {
      console.error("Error fetching appointments:", error);
      return NextResponse.json(
        { message: "Failed to fetch appointments" },
        { status: 500 }
      );
    }

    // Format appointments for response
    const formattedAppointments = appointments.map(apt => ({
      id: apt.appointment_id,
      patientId: apt.patients.id,
      patientName: apt.patients.full_name,
      type: apt.appointment_type,
      notes: apt.additional_notes,
      time: apt.time_slots.time,
      formattedTime: new Date(apt.time_slots.time).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Los_Angeles'
      })
    }));

    return NextResponse.json({ appointments: formattedAppointments });
  } catch (error) {
    console.error("Error in GET /api/appointments:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
