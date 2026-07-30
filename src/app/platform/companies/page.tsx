import {
  PageHead,
  Card,
  CardHead,
  Badge,
} from "@/components/ui";
import {
  CreateCompanyForm,
  ApiHint,
} from "@/components/admin-forms";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
};

type PlanRow = {
  code: string;
  name: string;
  employee_limit: number | null;
};

type SubscriptionRow = {
  company_id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  plans: PlanRow | PlanRow[] | null;
};

type EmployeeRow = {
  company_id: string;
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

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    trial: "Trial",
    active: "Active",
    past_due: "Past due",
    suspended: "Suspended",
    cancelled: "Cancelled",
  };

  return labels[status] ?? status;
}

function statusTone(
  status: string
): "success" | "warning" | "danger" | "info" | "" {
  if (status === "active") return "success";
  if (status === "trial") return "info";
  if (status === "past_due") return "warning";
  if (
    status === "suspended" ||
    status === "cancelled"
  ) {
    return "danger";
  }

  return "";
}

export default async function CompaniesPage() {
  const admin = createAdminClient();

  const [
    companyResult,
    subscriptionResult,
    employeeResult,
  ] = await Promise.all([
    admin
      .from("companies")
      .select(
        "id, name, slug, status, created_at"
      )
      .order("created_at", {
        ascending: false,
      }),

    admin
      .from("subscriptions")
      .select(
        `
          company_id,
          status,
          trial_ends_at,
          current_period_end,
          plans (
            code,
            name,
            employee_limit
          )
        `
      ),

    admin
      .from("employees")
      .select("company_id")
      .is("archived_at", null),
  ]);

  const loadError =
    companyResult.error ??
    subscriptionResult.error ??
    employeeResult.error;

  const companies =
    (companyResult.data ?? []) as CompanyRow[];

  const subscriptions =
    (subscriptionResult.data ??
      []) as unknown as SubscriptionRow[];

  const employees =
    (employeeResult.data ??
      []) as EmployeeRow[];

  const subscriptionByCompany = new Map<
    string,
    SubscriptionRow
  >();

  for (const subscription of subscriptions) {
    subscriptionByCompany.set(
      subscription.company_id,
      subscription
    );
  }

  const employeeCountByCompany = new Map<
    string,
    number
  >();

  for (const employee of employees) {
    const current =
      employeeCountByCompany.get(
        employee.company_id
      ) ?? 0;

    employeeCountByCompany.set(
      employee.company_id,
      current + 1
    );
  }

  return (
    <>
      <PageHead
        title="Companies"
        description="Tenant lifecycle, employee limit, office, branding, billing status, dan suspend/restore."
      />

      <div className="grid two">
        <Card>
          <CardHead
            title="Tenant directory"
            subtitle={`${companies.length} workspace terdaftar`}
          />

          {loadError ? (
            <div className="cardpad">
              <div className="callout warning">
                Gagal mengambil data perusahaan:{" "}
                {loadError.message}
              </div>
            </div>
          ) : companies.length === 0 ? (
            <div className="cardpad">
              <div className="callout">
                Belum ada workspace. Buat workspace
                pertama melalui form di sebelah kanan.
              </div>
            </div>
          ) : (
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Plan</th>
                    <th>Employees</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {companies.map((company) => {
                    const subscription =
                      subscriptionByCompany.get(
                        company.id
                      );

                    const plan = normalizePlan(
                      subscription?.plans ?? null
                    );

                    const employeeCount =
                      employeeCountByCompany.get(
                        company.id
                      ) ?? 0;

                    const employeeLimit =
                      plan?.employee_limit ?? null;

                    const subscriptionStatus =
                      subscription?.status ??
                      company.status ??
                      "unknown";

                    return (
                      <tr key={company.id}>
                        <td>
                          <strong>
                            {company.name}
                          </strong>

                          <div className="muted small">
                            {company.slug}
                          </div>
                        </td>

                        <td>
                          {plan?.name ??
                            "Belum ada plan"}
                        </td>

                        <td>
                          {employeeCount} /{" "}
                          {employeeLimit ?? "∞"}
                        </td>

                        <td>
                          <Badge
                            tone={statusTone(
                              subscriptionStatus
                            )}
                          >
                            {statusLabel(
                              subscriptionStatus
                            )}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHead
            title="Create workspace"
            subtitle="Company + trial subscription"
          />

          <div className="cardpad">
            <CreateCompanyForm />

            <ApiHint>
              Hanya platform_admin yang bisa memakai
              endpoint tenant creation.
            </ApiHint>
          </div>
        </Card>
      </div>
    </>
  );
}
