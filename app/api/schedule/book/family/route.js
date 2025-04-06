import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { sendFamilyAppointmentConfirmation } from "@/utils/email";

// Initialize Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

// Verify patient belongs to account and get account details
async function verifyPatientsAccess(supabase, userId, patientId) {
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
    .eq("id", patientId[0])
    .eq("account_id", userId)
    .single();

  if (patientError || !patient) {
    throw new Error("Patient not found");
  }

  return {
    patient,
    isDefaultPatient: patient.id === account.default_patient_id,
  };
}

// Verify all slots are available and consecutive
async function verifyConsecutiveSlots(supabase, startSlotId, numSlots) {
  let currentSlotId = startSlotId;
  const slotIds = [];

  for (let i = 0; i < numSlots; i++) {
    // Get current slot
    const { data: slot, error } = await supabase
      .from("time_slots")
      .select("*")
      .eq("slot_id", currentSlotId)
      .eq("reserved", false)
      .single();

    if (error || !slot) {
      throw new Error(`Slot ${currentSlotId} is not available`);
    }

    slotIds.push(slot.slot_id);

    if (i < numSlots - 1) {
      // Get next consecutive slot
      const nextTime = new Date(slot.time);
      nextTime.setMinutes(nextTime.getMinutes() + 15);

      const { data: nextSlot, error: nextError } = await supabase
        .from("time_slots")
        .select("*")
        .eq("time", nextTime.toISOString())
        .eq("reserved", false)
        .single();

      if (nextError || !nextSlot) {
        throw new Error(`No available consecutive slot after ${slot.time}`);
      }

      currentSlotId = nextSlot.slot_id;
    }
  }

  return slotIds;
}

// POST /api/schedule/book/family
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
    const supabase = getSupabaseClient();

    // Get request body
    const body = await request.json();
    const { startSlotId, patientIds, appointmentType, additionalNotes } = body;

    // Validate request
    if (
      !startSlotId ||
      !patientIds ||
      !Array.isArray(patientIds) ||
      patientIds.length < 2 ||
      !appointmentType
    ) {
      return NextResponse.json(
        {
          message:
            "startSlotId, patientIds array (min length 2), and appointmentType are required",
        },
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
    try {
      await verifyPatientsAccess(supabase, userId, patientIds);
    } catch (error) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    // Verify all slots are available and consecutive
    let slotIds;
    try {
      slotIds = await verifyConsecutiveSlots(
        supabase,
        startSlotId,
        patientIds.length
      );
    } catch (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    // Book appointments for each patient
    const appointments = [];
    for (let i = 0; i < patientIds.length; i++) {
      const { data: appointment, error: appointmentError } = await supabase.rpc(
        "book_appointment",
        {
          p_patient_id: String(patientIds[i]),
          p_slot_id: String(slotIds[i]),
          p_appointment_type: appointmentType,
          p_additional_notes: additionalNotes || "",
        }
      );

      if (appointmentError) {
        console.error("Error booking appointment:", appointmentError);
        // If any booking fails, we should ideally rollback previous bookings
        // For now, we'll just return an error
        return NextResponse.json(
          { message: "Failed to book all appointments. Please try again." },
          { status: 500 }
        );
      }

      appointments.push(appointment);
    }

    // Get account email
    const { data: accountData } = await supabase
      .from("accounts")
      .select("email")
      .eq("id", userId)
      .single();

    // Send confirmation email
    if (accountData?.email) {
      try {
        await sendFamilyAppointmentConfirmation(accountData.email, appointments.map(apt => ({
          time: apt.time,
          appointmentType,
          additionalNotes
        })));
      } catch (error) {
        console.error("Error sending family confirmation email:", error);
        // Don't fail the request if email fails
      }
    }

    // Return success response with booked appointments
    return NextResponse.json({
      message: `Successfully booked appointments for ${patientIds.length} family members`,
      appointments: appointments,
    });
  } catch (error) {
    console.error("Error in POST /api/schedule/book/family:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
