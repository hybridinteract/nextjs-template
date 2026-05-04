import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ detail: "No refresh token" }, { status: 401 });
  }

  const backendRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
  );

  if (!backendRes.ok) {
    // Clear stale cookies on refresh failure
    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");
    return NextResponse.json({ detail: "Session expired" }, { status: 401 });
  }

  const tokens = (await backendRes.json()) as {
    access_token: string;
    refresh_token: string;
  };
  const secure = process.env.NODE_ENV === "production";

  cookieStore.set("access_token", tokens.access_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 60 * 60 * 2,
    path: "/",
  });

  cookieStore.set("refresh_token", tokens.refresh_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return NextResponse.json({ success: true });
}
