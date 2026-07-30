import Link from "next/link";
import { notFound } from "next/navigation";

import {
  PageHead,
  Card,
  CardHead,
  Badge,
  Kpi,
} from "@/components/ui";

import { PlatformOwnerInviteForm } from "@/components/platform-owner-invite-form";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PlanRow = {
  code: string;
  name: string;
  employee_limit: number | null;
  office_limit: number | null;
  trial_days: number;
};

function normalizePlan(
  value: PlanRow | PlanRow[] | null
): PlanRow | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function statusTone(
  status: string
):
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "" {
  if (status === "active") {
    return "success";
  }

  if (status === "trial") {
    return "info";
  }

  if (status === "past_due") {
    return "warning";
  }

  if (
    status === "suspended" ||
    status === "cancelled"
  ) {
    return "danger";
  }

  return "";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Active",
    trial: "Trial",
    past_due: "Past due",
    suspended: "Suspended",
    cancelled: "Cancelled",
  };

  return labels[status] ?? status;
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  const admin = createAdminClient();

  const [
    companyResult,
    subscriptionResult,
    profilesResult,
    employeeCountResult,
    officeCountResult,
  ] = await Promise.all([
    admin
      .from("companies")
      .select(
        `
        id,
        name,
        slug,
        status,
        timezone,
        locale,
        primary_color,
        created_at
        `
      )
      .eq("id", id)
      .maybeSingle(),

    admin
      .from("subscriptions")
      .select(
        `
        status,
        trial_ends_at,
        current_period_end,
        plans (
          code,
          name,
          employee_limit,
          office_limit,
          trial_days
        )
        `
      )
      .eq("company_id", id)
      .maybeSingle(),

    admin
      .from("profiles")
      .select(
        `
        id,
        email,
        full_name,
        role,
        is_active,
        created_at
        `
      )
      .eq("company_id", id)
      .in("role", ["owner", "hr"])
      .order("created_at", {
        ascending: true,
      }),

    admin
      .from("employees")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("company_id", id)
      .is("archived_at", null),

    admin
      .from("offices")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("company_id", id)
      .eq("is_active", true),
  ]);

  if (
    companyResult.error ||
    !companyResult.data
  ) {
    notFound();
  }

  const company = companyResult.data;

  const subscription =
    subscriptionResult.data;

  const plan = normalizePlan(
    (subscription?.plans ??
      null) as PlanRow | PlanRow[] | null
  );

  const admins =
    profilesResult.data ?? [];

  const employeeCount =
    employeeCountResult.count ?? 0;

  const officeCount =
    officeCountResult.count ?? 0;

  const subscriptionStatus =
    subscription?.status ??
    company.status;

  return (
    <>
      <PageHead
        title={company.name}
        description={`Workspace ${company.slug}`}
      >
        <Link
          href="/platform/companies"
          className="btn"
        >
          ← Companies
        </Link>
      </PageHead>

      <div
        className="grid four"
        style={{ marginBottom: 20 }}
      >
        <Kpi
          label="Plan"
          value={plan?.name ?? "-"}
        />

        <Kpi
          label="Employees"
          value={
            plan?.employee_limit
              ? `${employeeCount} / ${plan.employee_limit}`
              : employeeCount
          }
        />

        <Kpi
          label="Offices"
          value={
            plan?.office_limit
              ? `${officeCount} / ${plan.office_limit}`
              : officeCount
          }
        />

        <Kpi
          label="Status"
          value={statusLabel(
            subscriptionStatus
          )}
        />
      </div>

      <div className="grid two">
        <Card>
          <CardHead
            title="Workspace"
            subtitle="Konfigurasi dasar tenant"
          />

          <div className="cardpad">
            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              <div>
                <div className="label">
                  Company
                </div>

                <strong>
                  {company.name}
                </strong>
              </div>

              <div>
                <div className="label">
                  Slug
                </div>

                <div>
                  {company.slug}
                </div>
              </div>

              <div>
                <div className="label">
                  Timezone
                </div>

                <div>
                  {company.timezone}
                </div>
              </div>

              <div>
                <div className="label">
                  Locale
                </div>

                <div>
                  {company.locale}
                </div>
              </div>

              <div>
                <div className="label">
                  Subscription
                </div>

                <div
                  style={{
                    marginTop: 6,
                  }}
                >
                  <Badge
                    tone={statusTone(
                      subscriptionStatus
                    )}
                  >
                    {statusLabel(
                      subscriptionStatus
                    )}
                  </Badge>
                </div>
              </div>

              {subscription?.trial_ends_at && (
                <div>
                  <div className="label">
                    Trial berakhir
                  </div>

                  <div>
                    {new Date(
                      subscription.trial_ends_at
                    ).toLocaleDateString(
                      "id-ID"
                    )}
                  </div>
                </div>
              )}

              {subscription?.current_period_end && (
                <div>
                  <div className="label">
                    Period end
                  </div>

                  <div>
                    {new Date(
                      subscription.current_period_end
                    ).toLocaleDateString(
                      "id-ID"
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHead
            title="Invite Owner / HR"
            subtitle="Buat administrator pertama untuk workspace ini"
          />

          <div className="cardpad">
            <PlatformOwnerInviteForm
              companyId={company.id}
              companyName={company.name}
            />
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 20 }}>
        <Card>
          <CardHead
            title="Workspace administrators"
            subtitle={`${admins.length} akun Owner / HR`}
          />

          {admins.length === 0 ? (
            <div className="cardpad">
              <div className="callout">
                Workspace ini belum mempunyai
                Owner atau HR. Gunakan form
                invite di atas.
              </div>
            </div>
          ) : (
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {admins.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>
                          {user.full_name ||
                            "-"}
                        </strong>
                      </td>

                      <td>
                        {user.email}
                      </td>

                      <td>
                        <Badge tone="info">
                          {user.role ===
                          "owner"
                            ? "Owner"
                            : "HR"}
                        </Badge>
                      </td>

                      <td>
                        <Badge
                          tone={
                            user.is_active
                              ? "success"
                              : "danger"
                          }
                        >
                          {user.is_active
                            ? "Active"
                            : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
