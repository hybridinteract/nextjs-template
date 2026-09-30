import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { detailToMessage } from "@/lib/backend-error";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const backendRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username: body.email ?? "",
        password: body.password ?? "",
        grant_type: "password",
      }),
    },
  );

  if (!backendRes.ok) {
    const error = await backendRes.json().catch(() => ({}));
    // `detail` is an array on a 422, not a sentence. Passed straight through,
    // the login form got a list where it expected words.
    const message = detailToMessage((error as { detail?: unknown }).detail);
    return NextResponse.json(
      { message: message ?? "Login failed" },
      { status: backendRes.status },
    );
  }

  const tokens = (await backendRes.json()) as {
    access_token: string;
    refresh_token: string;
  };

  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";

  cookieStore.set("access_token", tokens.access_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 60 * 60 * 2, // 2 hours
    path: "/",
  });

  cookieStore.set("refresh_token", tokens.refresh_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return NextResponse.json({ success: true });
}
