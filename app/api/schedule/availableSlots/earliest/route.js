import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

// GET /api/schedule/availableSlots/earliest?limit=N
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '3', 10); // Default to 3 if not specified

    // Validate limit
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        { message: "Invalid limit parameter. Must be a positive number." },
        { status: 400 }
      );
    }

    // Set time range starting from now
    const now = new Date();
    const startTime = new Date(now);
    startTime.setUTCHours(now.getUTCHours(), now.getUTCMinutes(), 0, 0); // Start from current time

    // Set end time to 3 months from now
    const endTime = new Date(now);
    endTime.setMonth(endTime.getMonth() + 3);

    const supabase = getSupabaseClient();

    // Get earliest available slots
    const { data: slots, error } = await supabase
      .from("time_slots")
      .select("slot_id, time, duration")
      .eq("reserved", false)
      .gte("time", startTime.toISOString())
      .lt("time", endTime.toISOString())
      .order("time")
      .limit(limit);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { message: "Failed to fetch available slots" },
        { status: 500 }
      );
    }

    // Group slots by date for better organization
    const groupedSlots = slots.reduce((acc, slot) => {
      const date = new Date(slot.time).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Los_Angeles'
      });
      
      if (!acc[date]) {
        acc[date] = [];
      }
      
      acc[date].push({
        ...slot,
        time: new Date(slot.time).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'America/Los_Angeles'
        })
      });
      
      return acc;
    }, {});

    return NextResponse.json({
      slots: groupedSlots,
      message: `Found ${slots.length} earliest available slots`
    });

  } catch (error) {
    console.error("Error in GET /api/schedule/availableSlots/earliest:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
