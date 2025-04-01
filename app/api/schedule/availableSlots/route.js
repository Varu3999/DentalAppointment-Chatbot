import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

// GET /api/schedule/availableSlots?date=YYYY-MM-DD
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');

    // Validate date parameter
    if (!dateStr) {
      return NextResponse.json(
        { message: "Date parameter is required (format: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { message: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Set time range for the requested date (in PST)
    const startTime = new Date(date);
    startTime.setUTCHours(16, 0, 0, 0); // 9 AM PST = 16:00 UTC
    
    const endTime = new Date(date);
    endTime.setUTCHours(3, 0, 0, 0); // 8 PM PST = 03:00 UTC next day
    endTime.setDate(endTime.getDate() + 1); // Add one day for end time

    const supabase = getSupabaseClient();

    // Get all available slots for the date
    const { data: slots, error } = await supabase
      .from("time_slots")
      .select("slot_id, time, duration")
      .eq("reserved", false)
      .gte("time", startTime.toISOString())
      .lt("time", endTime.toISOString())
      .order("time");

    if (error) {
      console.error("Error fetching available slots:", error);
      return NextResponse.json(
        { message: "Failed to fetch available slots" },
        { status: 500 }
      );
    }

    // Format slots for response
    const formattedSlots = slots.map(slot => ({
      id: slot.slot_id,
      time: slot.time,
      duration: slot.duration,
      // Format time in 12-hour format with AM/PM
      formattedTime: new Date(slot.time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Los_Angeles'
      })
    }));

    return NextResponse.json({ slots: formattedSlots });
  } catch (error) {
    console.error("Error in GET /api/schedule/availableSlots:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
