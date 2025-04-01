import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyAppointmentAccess(userId, appointmentId) {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      appointment_id,
      patients (
        account_id
      )
    `)
    .eq('appointment_id', appointmentId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.patients.account_id === userId;
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

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

    // Verify appointment access
    const hasAccess = await verifyAppointmentAccess(userId, id);
    if (!hasAccess) {
      return NextResponse.json(
        { message: "Appointment not found or unauthorized" },
        { status: 403 }
      );
    }

    // Get the slot_id before deleting the appointment
    const { data: appointmentData, error: getError } = await supabase
      .from('appointments')
      .select('slot_id')
      .eq('appointment_id', id)
      .single();

    if (getError) {
      console.error('Error getting appointment:', getError);
      return NextResponse.json(
        { message: "Failed to find appointment" },
        { status: 404 }
      );
    }

    // Start a transaction
    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('appointment_id', id);

    if (deleteError) {
      console.error('Error deleting appointment:', deleteError);
      return NextResponse.json(
        { message: "Failed to delete appointment" },
        { status: 500 }
      );
    }

    // Update slot availability
    const { error: updateError } = await supabase
      .from('time_slots')
      .update({ reserved: false })
      .eq('slot_id', appointmentData.slot_id);

    if (updateError) {
      console.error('Error updating slot:', updateError);
      // Note: At this point the appointment is already deleted, 
      // we should probably add some error recovery here in a production system
      return NextResponse.json(
        { message: "Failed to update slot availability" },
        { status: 500 }
      );
    }



    return NextResponse.json({ message: "Appointment cancelled successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/appointments/[id]:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
