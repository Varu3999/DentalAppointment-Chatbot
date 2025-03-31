import { NextResponse } from "next/server";

// POST /api/auth/signout
export async function POST() {
  try {
    const response = NextResponse.json({
      message: "Signed out successfully"
    });

    // Clear JWT cookie
    response.cookies.set({
      name: "token",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0) // Immediately expire the cookie
    });

    return response;
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
