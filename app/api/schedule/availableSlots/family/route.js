import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

// GET /api/schedule/availableSlots/family?date=YYYY-MM-DD&size=N
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const familySize = parseInt(searchParams.get("size") || "2", 10); // Default to 2 if not specified

    // Validate parameters
    if (!dateStr) {
      return NextResponse.json(
        { message: "date parameter is required (format: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    if (isNaN(familySize) || familySize < 2) {
      return NextResponse.json(
        { message: "size parameter must be a number greater than 1" },
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

    // Set time range for the date (in PST)
    const startTime = new Date(date);
    startTime.setUTCHours(16, 0, 0, 0); // 9 AM PST = 16:00 UTC

    const endTime = new Date(date);
    endTime.setUTCHours(3, 0, 0, 0); // 8 PM PST = 03:00 UTC next day
    endTime.setDate(endTime.getDate() + 1); // Add one day for end time

    const supabase = getSupabaseClient();

    // Get all available slots for the day
    const { data: slots, error } = await supabase
      .from("time_slots")
      .select("slot_id, time")
      .eq("reserved", false)
      .gte("time", startTime.toISOString())
      .lt("time", endTime.toISOString())
      .order("time");

    if (error) {
      console.error("Error fetching slots:", error);
      return NextResponse.json(
        { message: "Failed to fetch available slots" },
        { status: 500 }
      );
    }

    // Find consecutive slots that can accommodate the family
    const familySlots = [];
    for (let i = 0; i <= slots.length - familySize; i++) {
      // Check if slots[i] through slots[i + familySize - 1] are consecutive
      let isConsecutive = true;
      for (let j = 0; j < familySize - 1; j++) {
        const currentSlot = new Date(slots[i + j].time);
        const nextSlot = new Date(slots[i + j + 1].time);

        // Check if slots are 30 minutes apart
        const timeDiff = (nextSlot - currentSlot) / (1000 * 60); // difference in minutes
        if (timeDiff !== 15) {
          isConsecutive = false;
          break;
        }
      }

      if (isConsecutive) {
        const startSlot = slots[i];
        const endSlot = slots[i + familySize - 1];
        const startTime = new Date(startSlot.time);
        const endTime = new Date(endSlot.time);
        endTime.setMinutes(endTime.getMinutes() + 15); // Add 15 minutes to include the full duration of last slot

        // Format times in 12-hour format with AM/PM
        const formatTime = (date) => {
          return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: "America/Los_Angeles",
          });
        };

        familySlots.push({
          startSlotId: startSlot.slot_id,
          startTime: formatTime(startTime),
          endTime: formatTime(endTime),
          rawStartTime: startSlot.time, // Keep raw time for sorting
        });
      }
    }

    // Sort slots by start time
    familySlots.sort(
      (a, b) => new Date(a.rawStartTime) - new Date(b.rawStartTime)
    );

    return NextResponse.json({
      date: dateStr,
      availableSlots: familySlots.map(({ rawStartTime, ...slot }) => slot), // Remove rawStartTime from output
      message:
        familySlots.length > 0
          ? `Found ${familySlots.length} available time slots for a family of ${familySize}`
          : `No consecutive slots available for a family of ${familySize} on ${dateStr}`,
    });
  } catch (error) {
    console.error("Error in GET /api/schedule/availableSlots/family:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
