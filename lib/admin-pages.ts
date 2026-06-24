/**
 * Client-safe registry of admin pages. No server-only imports here so this can
 * be used by the sidebar and the seat editor as well as server guards.
 *
 * `key` is what gets stored in Profiles.admin_pages. Order drives sidebar order.
 */

export type PageGroup = "analytics" | "operations" | "system";

export interface AdminPage {
  key: string;
  label: string;
  path: string;
  group: PageGroup;
  /** Only the owner can ever access/grant this page. */
  ownerOnly?: boolean;
  /** Short description shown in the Access seat editor. */
  blurb?: string;
}

export const ADMIN_PAGES: AdminPage[] = [
  // Analytics / BI
  { key: "overview", label: "Overview", path: "/dashboard", group: "analytics", blurb: "Top-line KPIs across the whole marketplace." },
  { key: "financials", label: "Financials", path: "/dashboard/financials", group: "analytics", blurb: "GMV, net revenue, take rate, payouts." },
  { key: "marketplace", label: "Marketplace", path: "/dashboard/marketplace", group: "analytics", blurb: "Liquidity: supply vs demand, fill rate, utilization." },
  { key: "growth", label: "Growth", path: "/dashboard/growth", group: "analytics", blurb: "Signups, activation, active users." },
  { key: "quality", label: "Quality", path: "/dashboard/quality", group: "analytics", blurb: "Ratings, repeat bookings, retention." },
  // Operational tools
  { key: "users", label: "Users", path: "/dashboard/users", group: "operations", blurb: "Browse and search all registered users." },
  { key: "subjects", label: "Subjects", path: "/dashboard/subjects", group: "operations", blurb: "Manage the subject catalog and pricing." },
  { key: "institutions", label: "Institutions", path: "/dashboard/institutions", group: "operations", blurb: "Manage schools, boards and institutions." },
  { key: "curricula", label: "Curricula", path: "/dashboard/curricula", group: "operations", blurb: "Manage curricula and course mappings." },
  { key: "approvals", label: "Approvals", path: "/dashboard/approvals", group: "operations", blurb: "Review course / credential approvals." },
  { key: "contacts", label: "Contacts", path: "/dashboard/contacts", group: "operations", blurb: "Inbound contact-form messages." },
  { key: "feedback", label: "Feedback", path: "/dashboard/feedback", group: "operations", blurb: "Beta feedback submissions." },
  // System
  { key: "legal", label: "Legal", path: "/dashboard/legal", group: "system", ownerOnly: true, blurb: "Publish Terms of Service versions and review acceptances." },
  { key: "access", label: "Access", path: "/dashboard/access", group: "system", ownerOnly: true, blurb: "Manage admin seats and their permissions." },
];

const PAGE_BY_KEY = new Map(ADMIN_PAGES.map((p) => [p.key, p]));

/** Pages a seat can be granted (everything except owner-only system pages). */
export const GRANTABLE_PAGES = ADMIN_PAGES.filter((p) => !p.ownerOnly);

export const GROUP_LABELS: Record<PageGroup, string> = {
  analytics: "Analytics",
  operations: "Operations",
  system: "System",
};

export function pageByKey(key: string): AdminPage | undefined {
  return PAGE_BY_KEY.get(key);
}
