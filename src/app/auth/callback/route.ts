import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeNextPath(
  value: string | null
) {
  if (!value) {
    return "/admin";
  }

  /*
   * Cegah open redirect.
   *
   * Hanya path internal yang boleh.
   */
  if (
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/admin";
  }

  return value;
}

export async function GET(
  request: Request
) {
  const url = new URL(request.url);

  const code =
    url.searchParams.get("code");

  const next = safeNextPath(
    url.searchParams.get("next")
  );

  /*
   * Supabase kadang mengirim error_description
   * pada link invite yang expired/tidak valid.
   */
  const authError =
    url.searchParams.get(
      "error_description"
    ) ||
    url.searchParams.get("error");

  if (authError) {
    const loginUrl = new URL(
      "/login",
      url.origin
    );

    loginUrl.searchParams.set(
      "error",
      authError
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  if (!code) {
    const loginUrl = new URL(
      "/login",
      url.origin
    );

    loginUrl.searchParams.set(
      "error",
      "Kode autentikasi tidak ditemukan"
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  const supabase =
    await createClient();

  const { error } =
    await supabase.auth.exchangeCodeForSession(
      code
    );

  if (error) {
    const loginUrl = new URL(
      "/login",
      url.origin
    );

    loginUrl.searchParams.set(
      "error",
      error.message
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  return NextResponse.redirect(
    new URL(next, url.origin)
  );
}
