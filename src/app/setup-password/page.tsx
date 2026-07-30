import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { SetupPasswordForm } from "./setup-password-form";

export const dynamic =
  "force-dynamic";

function destinationForRole(
  role: string | null
) {
  switch (role) {
    case "platform_admin":
      return "/platform";

    case "employee":
      return "/employee";

    case "owner":
    case "hr":
    case "manager":
    case "supervisor":
      return "/admin";

    default:
      return "/login";
  }
}

export default async function SetupPasswordPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  /*
   * Halaman ini hanya boleh digunakan
   * setelah user membuka invite link.
   */
  if (!user) {
    redirect(
      "/login?error=Session invite tidak ditemukan"
    );
  }

  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select(
      "role, full_name, is_active"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    profile &&
    profile.is_active === false
  ) {
    redirect(
      "/login?error=Akun dinonaktifkan"
    );
  }

  const nextPath =
    destinationForRole(
      profile?.role ?? null
    );

  return (
    <main className="loginwrap">
      <section className="loginart">
        <div className="brand">
          <div
            className="brandmark"
            style={{
              background:
                "var(--brand-2)",
              color:
                "var(--brand)",
            }}
          >
            N
          </div>

          <div className="brandtext">
            <strong>Nadi</strong>

            <span
              style={{
                color: "#b9c8bf",
              }}
            >
              people operations
            </span>
          </div>
        </div>

        <div className="loginquote">
          <h1>
            Selamat datang di Nadi.
          </h1>

          <p>
            Akun perusahaanmu sudah
            dibuat. Tinggal buat password
            dan workspace siap digunakan.
          </p>
        </div>

        <div
          className="tiny"
          style={{
            color: "#9eb0a5",
          }}
        >
          Secure · Multi-tenant ·
          Audit-ready
        </div>
      </section>

      <section className="loginform">
        <div className="loginpanel">
          <div className="badge info">
            Account activation
          </div>

          <h2
            style={{
              marginTop: 14,
            }}
          >
            Buat password.
          </h2>

          <p>
            {profile?.full_name
              ? `Halo ${profile.full_name}. `
              : ""}
            Buat password untuk mengaktifkan
            akses ke workspace.
          </p>

          <SetupPasswordForm
            email={user.email || ""}
            nextPath={nextPath}
          />
        </div>
      </section>
    </main>
  );
}
