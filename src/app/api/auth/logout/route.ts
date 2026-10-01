import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logger } from "@/lib/utilities";

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  // Revoke the session on the backend. The refresh token is what keeps it alive
  // for 7 days, so it goes in the body, and the backend wants a body either way.
  // Until 30 Sep 2026 this sent none: FastAPI refused it, nothing was revoked, and
  // a copied refresh token still worked after sign-out.
  //
  // Keyed on the refresh token, not the access token. The access token expires
  // after 2 hours, and the refresh token is still worth revoking after that.
  if (refreshToken) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).catch((error: unknown) => {
      logger.warn("Sign-out could not reach the backend", { error: String(error) });
      return null;
    });
    if (res && !res.ok) logger.warn("The backend refused to revoke the session", { status: res.status });
  }

  // Signed out of this browser whatever the backend said. Keeping someone
  // signed in because a revoke failed would be the worse outcome.
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");

  return NextResponse.json({ success: true });
}
