import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );
  } catch {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  if (!backendRes.ok) {
    // If 401, try silent refresh
    if (backendRes.status === 401) {
      const refreshToken = cookieStore.get("refresh_token")?.value;
      if (refreshToken) {
        try {
          const refreshRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh_token: refreshToken }),
            },
          );

          if (refreshRes.ok) {
            const tokens = (await refreshRes.json()) as {
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

            // Retry with new token
            const retried = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`,
              { headers: { Authorization: `Bearer ${tokens.access_token}` } },
            );
            if (retried.ok) return NextResponse.json(await retried.json());
          }
        } catch {
          // refresh network failure — fall through to 401
        }
      }
    }

    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json(await backendRes.json());
}
