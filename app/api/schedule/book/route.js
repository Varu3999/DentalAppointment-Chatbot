import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

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

// Send confirmation email
async function sendConfirmationEmail(accountEmail, appointmentDetails) {
  const { time, appointmentType, patientName } = appointmentDetails;
  const formattedTime = new Date(time).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles'
  });

  const emailContent = `
    Appointment Confirmation
    
    Date & Time: ${formattedTime}
    Patient: ${patientName}
    Type: ${appointmentType}
    
    Thank you for booking with us!
  `;

  try {
    // Use your email service here (e.g., SendGrid, AWS SES, etc.)
    // For now, we'll just log it
    console.log('Sending email to:', accountEmail);
    console.log('Email content:', emailContent);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
}

export async function POST(request) {
  try {
    // Verify authentication
    const token = cookies().get("token")?.value;
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

    // Get request body
    const { patientId, slotId, appointmentType, additionalNotes } = await request.json();

    // Validate required fields
    if (!patientId || !slotId || !appointmentType) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify appointment type
    const validTypes = ["Cleaning", "General Checkup", "Emergency"];
    if (!validTypes.includes(appointmentType)) {
      return NextResponse.json(
        { message: "Invalid appointment type" },
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

    // Start a transaction
    const { data: appointment, error: appointmentError } = await supabase.rpc(
      'book_appointment',
      {
        p_patient_id: patientId,
        p_slot_id: slotId,
        p_appointment_type: appointmentType,
        p_additional_notes: additionalNotes
      }
    );

    if (appointmentError) {
      console.error('Error booking appointment:', appointmentError);
      return NextResponse.json(
        { message: "Failed to book appointment. Slot may no longer be available." },
        { status: 409 }
      );
    }

    // Get patient name and slot time for email
    const { data: patientData } = await supabase
      .from("patients")
      .select("full_name")
      .eq("id", patientId)
      .single();

    const { data: slotData } = await supabase
      .from("time_slots")
      .select("time")
      .eq("slot_id", slotId)
      .single();

    // Get account email
    const { data: accountData } = await supabase
      .from("accounts")
      .select("email")
      .eq("id", userId)
      .single();

    // Send confirmation email
    if (accountData?.email) {
      await sendConfirmationEmail(accountData.email, {
        time: slotData.time,
        appointmentType,
        patientName: patientData.full_name
      });
    }

    return NextResponse.json({
      message: "Appointment booked successfully",
      appointment: {
        id: appointment.appointment_id,
        time: slotData.time,
        patientName: patientData.full_name,
        type: appointmentType
      }
    });
  } catch (error) {
    console.error("Error booking appointment:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
