import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const inviteRoles = new Set([
  "owner",
  "hr",
  "manager",
  "supervisor",
  "employee",
]);

export async function POST(req: Request) {
  let createdUserId: string | undefined;

  try {
    const body = await req.json();

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      !["owner", "hr", "platform_admin"].includes(
        profile.role
      )
    ) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    const companyId =
      profile.role === "platform_admin"
        ? body.companyId
        : profile.company_id;

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const fullName = String(
      body.fullName || ""
    ).trim();

    const role = String(
      body.role || "employee"
    ).trim();

    if (!companyId) {
      return NextResponse.json(
        {
          error: "Company wajib dipilih",
        },
        {
          status: 400,
        }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        {
          error: "Email tidak valid",
        },
        {
          status: 400,
        }
      );
    }

    if (!inviteRoles.has(role)) {
      return NextResponse.json(
        {
          error: "Role tidak valid",
        },
        {
          status: 400,
        }
      );
    }

    const admin = createAdminClient();

    const workforceRole = [
      "employee",
      "supervisor",
      "manager",
      "hr",
    ].includes(role);

    /*
     * Cek subscription dan batas employee.
     */
    if (workforceRole) {
      const { data: subscription } =
        await admin
          .from("subscriptions")
          .select(
            `
            status,
            plans (
              employee_limit
            )
          `
          )
          .eq("company_id", companyId)
          .maybeSingle();

      if (
        subscription &&
        ![
          "trial",
          "active",
          "past_due",
        ].includes(subscription.status)
      ) {
        return NextResponse.json(
          {
            error:
              "Subscription perusahaan tidak aktif",
          },
          {
            status: 402,
          }
        );
      }

      const plan = subscription?.plans as unknown as
        | {
            employee_limit?: number | null;
          }
        | {
            employee_limit?: number | null;
          }[]
        | null;

      const employeeLimit = Array.isArray(plan)
        ? plan[0]?.employee_limit
        : plan?.employee_limit;

      if (employeeLimit != null) {
        const { count } = await admin
          .from("employees")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("company_id", companyId)
          .is("archived_at", null);

        if ((count || 0) >= employeeLimit) {
          return NextResponse.json(
            {
              error: `Batas plan ${employeeLimit} karyawan tercapai`,
            },
            {
              status: 409,
            }
          );
        }
      }
    }

    /*
     * URL production.
     *
     * Karena NEXT_PUBLIC_APP_URL saat ini belum wajib,
     * kita fallback ke origin request Vercel.
     */
    const requestUrl = new URL(req.url);

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      requestUrl.origin
    ).replace(/\/$/, "");

    /*
     * Setelah invite diverifikasi oleh Supabase,
     * user diarahkan ke callback.
     *
     * Callback kemudian mengarahkan ke
     * /setup-password.
     */
    const redirectTo =
      `${appUrl}/auth/callback` +
      `?next=${encodeURIComponent(
        "/setup-password"
      )}`;

    const {
      data: inviteData,
      error: inviteError,
    } =
      await admin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo,

          data: {
            full_name: fullName,
            company_id: companyId,
            intended_role: role,
          },
        }
      );

    if (inviteError) {
      throw inviteError;
    }

    if (!inviteData.user) {
      throw new Error(
        "Supabase tidak mengembalikan user invite"
      );
    }

    createdUserId = inviteData.user.id;

    let employeeId =
      body.employeeId || null;

    /*
     * Buat employee record untuk role workforce.
     *
     * Owner tidak harus menjadi employee.
     */
    if (!employeeId && workforceRole) {
      const employeeNumber =
        body.employeeNumber ||
        `EMP-${Date.now()
          .toString()
          .slice(-6)}`;

      const {
        data: employee,
        error: employeeError,
      } = await admin
        .from("employees")
        .insert({
          company_id: companyId,
          user_id: inviteData.user.id,
          employee_number: employeeNumber,
          full_name:
            fullName ||
            email.split("@")[0],
          email,
        })
        .select("id")
        .single();

      if (employeeError) {
        throw employeeError;
      }

      employeeId = employee.id;
    } else if (employeeId) {
      const { error: linkError } =
        await admin
          .from("employees")
          .update({
            user_id: inviteData.user.id,
          })
          .eq("id", employeeId)
          .eq("company_id", companyId);

      if (linkError) {
        throw linkError;
      }
    }

    /*
     * Trigger migration kita sudah membuat profile
     * ketika auth.users dibuat.
     *
     * Sekarang profile tersebut kita hubungkan
     * dengan company dan role.
     */
    const { error: profileError } =
      await admin
        .from("profiles")
        .update({
          company_id: companyId,
          employee_id: employeeId,
          role,
          full_name: fullName,
          is_active: true,
        })
        .eq("id", inviteData.user.id);

    if (profileError) {
      throw profileError;
    }

    return NextResponse.json({
      ok: true,
      userId: inviteData.user.id,
      employeeId,
      redirectTo,
    });
  } catch (error) {
    /*
     * Kalau proses gagal setelah Auth user dibuat,
     * hapus kembali user tersebut agar tidak
     * meninggalkan akun setengah jadi.
     */
    if (createdUserId) {
      try {
        const admin =
          createAdminClient();

        await admin.auth.admin.deleteUser(
          createdUserId
        );
      } catch {
        // best-effort rollback
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invite failed",
      },
      {
        status: 500,
      }
    );
  }
}
