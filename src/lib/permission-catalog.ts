export type PermissionKey =
  | "dashboard.view"
  | "projects.view"
  | "projects.create"
  | "projects.edit"
  | "projects.archive"
  | "projects.view_financials"
  | "projects.change_stage"
  | "customers.view"
  | "customers.create"
  | "customers.edit"
  | "customers.archive"
  | "customers.view_financials"
  | "sales.view"
  | "sales.create"
  | "sales.edit"
  | "sales.cancel"
  | "sales.view_financials"
  | "payment_schedule.view"
  | "payment_schedule.create"
  | "payment_schedule.edit"
  | "payment_schedule.change_stage"
  | "payments_due.view"
  | "receipts.view"
  | "receipts.create"
  | "receipts.edit"
  | "receipts.cancel"
  | "receipts.delete"
  | "receipts.export"
  | "conversations.view"
  | "conversations.create"
  | "conversations.edit"
  | "conversations.delete"
  | "documents.view"
  | "documents.upload"
  | "documents.edit"
  | "documents.delete"
  | "documents.download"
  | "reports.view"
  | "reports.export"
  | "users.view"
  | "users.create"
  | "users.edit"
  | "users.deactivate"
  | "users.reset_password"
  | "roles.view"
  | "roles.create"
  | "roles.edit"
  | "permissions.manage"
  | "settings.view"
  | "settings.edit";

export const PERMISSIONS: {
  key: PermissionKey;
  module: string;
  action: string;
  label: string;
}[] = [
  { key: "dashboard.view", module: "Dashboard", action: "view", label: "View dashboard" },
  { key: "projects.view", module: "Projects", action: "view", label: "View projects" },
  { key: "projects.create", module: "Projects", action: "create", label: "Create projects" },
  { key: "projects.edit", module: "Projects", action: "edit", label: "Edit projects" },
  { key: "projects.archive", module: "Projects", action: "archive", label: "Archive projects" },
  { key: "projects.view_financials", module: "Projects", action: "view_financials", label: "View project financials" },
  { key: "projects.change_stage", module: "Projects", action: "change_stage", label: "Change project stage" },
  { key: "customers.view", module: "Customers", action: "view", label: "View customers" },
  { key: "customers.create", module: "Customers", action: "create", label: "Create customers" },
  { key: "customers.edit", module: "Customers", action: "edit", label: "Edit customers" },
  { key: "customers.archive", module: "Customers", action: "archive", label: "Archive customers" },
  { key: "customers.view_financials", module: "Customers", action: "view_financials", label: "View customer financials" },
  { key: "sales.view", module: "Sales", action: "view", label: "View sales" },
  { key: "sales.create", module: "Sales", action: "create", label: "Create sales" },
  { key: "sales.edit", module: "Sales", action: "edit", label: "Edit sales" },
  { key: "sales.cancel", module: "Sales", action: "cancel", label: "Cancel sales" },
  { key: "sales.view_financials", module: "Sales", action: "view_financials", label: "View sale financials" },
  { key: "payment_schedule.view", module: "Payment schedules", action: "view", label: "View payment schedules" },
  { key: "payment_schedule.create", module: "Payment schedules", action: "create", label: "Create payment stages" },
  { key: "payment_schedule.edit", module: "Payment schedules", action: "edit", label: "Edit payment stages" },
  { key: "payment_schedule.change_stage", module: "Payment schedules", action: "change_stage", label: "Change payment stage" },
  { key: "payments_due.view", module: "Payments due", action: "view", label: "View payments due" },
  { key: "receipts.view", module: "Receipts", action: "view", label: "View receipts" },
  { key: "receipts.create", module: "Receipts", action: "create", label: "Create receipts" },
  { key: "receipts.edit", module: "Receipts", action: "edit", label: "Edit receipts" },
  { key: "receipts.cancel", module: "Receipts", action: "cancel", label: "Cancel receipts" },
  { key: "receipts.delete", module: "Receipts", action: "delete", label: "Delete receipts" },
  { key: "receipts.export", module: "Receipts", action: "export", label: "Export receipts" },
  { key: "conversations.view", module: "Conversations", action: "view", label: "View conversations" },
  { key: "conversations.create", module: "Conversations", action: "create", label: "Create conversations" },
  { key: "conversations.edit", module: "Conversations", action: "edit", label: "Edit conversations" },
  { key: "conversations.delete", module: "Conversations", action: "delete", label: "Delete conversations" },
  { key: "documents.view", module: "Documents", action: "view", label: "View documents" },
  { key: "documents.upload", module: "Documents", action: "upload", label: "Upload documents" },
  { key: "documents.edit", module: "Documents", action: "edit", label: "Edit documents" },
  { key: "documents.delete", module: "Documents", action: "delete", label: "Delete documents" },
  { key: "documents.download", module: "Documents", action: "download", label: "Download documents" },
  { key: "reports.view", module: "Reports", action: "view", label: "View reports" },
  { key: "reports.export", module: "Reports", action: "export", label: "Export reports" },
  { key: "users.view", module: "Users & access", action: "view", label: "View users" },
  { key: "users.create", module: "Users & access", action: "create", label: "Create users" },
  { key: "users.edit", module: "Users & access", action: "edit", label: "Edit users" },
  { key: "users.deactivate", module: "Users & access", action: "deactivate", label: "Deactivate users" },
  { key: "users.reset_password", module: "Users & access", action: "reset_password", label: "Reset passwords" },
  { key: "roles.view", module: "Users & access", action: "view_roles", label: "View roles" },
  { key: "roles.create", module: "Users & access", action: "create_roles", label: "Create roles" },
  { key: "roles.edit", module: "Users & access", action: "edit_roles", label: "Edit roles" },
  { key: "permissions.manage", module: "Users & access", action: "manage_permissions", label: "Manage permissions" },
  { key: "settings.view", module: "Settings", action: "view", label: "View settings" },
  { key: "settings.edit", module: "Settings", action: "edit", label: "Edit settings" },
];

export const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

const ALL = ALL_PERMISSION_KEYS;

const DIRECTOR: PermissionKey[] = ALL.filter(
  (k) =>
    !k.startsWith("users.") &&
    !k.startsWith("roles.") &&
    k !== "permissions.manage" &&
    k !== "settings.edit",
);

const ACCOUNTANT: PermissionKey[] = [
  "dashboard.view",
  "projects.view",
  "projects.view_financials",
  "customers.view",
  "customers.view_financials",
  "sales.view",
  "sales.view_financials",
  "payment_schedule.view",
  "payments_due.view",
  "receipts.view",
  "receipts.create",
  "receipts.edit",
  "receipts.export",
  "reports.view",
  "reports.export",
  "documents.view",
  "documents.upload",
  "documents.download",
  "conversations.view",
  "conversations.create",
  "settings.view",
];

const SALES: PermissionKey[] = [
  "dashboard.view",
  "projects.view",
  "customers.view",
  "customers.create",
  "customers.edit",
  "customers.view_financials",
  "sales.view",
  "sales.create",
  "sales.edit",
  "sales.view_financials",
  "payment_schedule.view",
  "payments_due.view",
  "conversations.view",
  "conversations.create",
  "conversations.edit",
  "documents.view",
  "documents.upload",
  "documents.download",
];

const STAFF: PermissionKey[] = [
  "dashboard.view",
  "projects.view",
  "customers.view",
  "sales.view",
  "conversations.view",
  "conversations.create",
  "documents.view",
  "documents.upload",
];

export const DEFAULT_ROLES: {
  slug: string;
  name: string;
  description: string;
  isProtected?: boolean;
  permissions: PermissionKey[];
}[] = [
  {
    slug: "administrator",
    name: "Administrator",
    description: "Full access to all modules, including user and role management.",
    isProtected: true,
    permissions: ALL,
  },
  {
    slug: "director",
    name: "Director",
    description: "Broad operational and financial access. User management is not included by default.",
    permissions: DIRECTOR,
  },
  {
    slug: "accountant",
    name: "Accountant",
    description: "Collections, receipts, and financial views. Cannot change project stages or manage users.",
    permissions: ACCOUNTANT,
  },
  {
    slug: "sales-representative",
    name: "Sales Representative",
    description: "Customers, sales, follow-up, and documents. Receipts are not included by default.",
    permissions: SALES,
  },
  {
    slug: "staff",
    name: "Staff",
    description: "Limited operational access without sensitive financial or admin permissions.",
    permissions: STAFF,
  },
];
