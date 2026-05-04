import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  // Best-effort: notify the backend to revoke the refresh token
  if (accessToken) {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});
  }

  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");

  return NextResponse.json({ success: true });
}
