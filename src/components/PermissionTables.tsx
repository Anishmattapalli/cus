"use client";

import { PERMISSIONS, type PermissionKey } from "@/lib/permission-catalog";
import { field } from "./ui";

export function OverrideTable({
  roleAllowed,
  overrides,
}: {
  roleAllowed: PermissionKey[];
  overrides: Record<string, "inherit" | "allow" | "deny">;
}) {
  const modules = [...new Set(PERMISSIONS.map((p) => p.module))];
  const roleSet = new Set(roleAllowed);
  return (
    <div className="space-y-4">
      {modules.map((mod) => (
        <div key={mod}>
          <h3 className="mb-2 text-sm font-semibold">{mod}</h3>
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr>
                <th className="py-1">Permission</th>
                <th>Role default</th>
                <th>User setting</th>
                <th>Effective</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.filter((p) => p.module === mod).map((p) => {
                const role = roleSet.has(p.key) ? "Allow" : "Deny";
                const setting = overrides[p.key] || "inherit";
                const effective =
                  setting === "allow" ? "Allow" : setting === "deny" ? "Deny" : role;
                return (
                  <tr key={p.key} className="border-t border-line">
                    <td className="py-1">{p.label}</td>
                    <td>{role}</td>
                    <td>
                      <select name={`perm:${p.key}`} className={field} defaultValue={setting}>
                        <option value="inherit">Inherit</option>
                        <option value="allow">Allow</option>
                        <option value="deny">Deny</option>
                      </select>
                    </td>
                    <td>{effective}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export function RolePermissionChecks({ allowed }: { allowed: string[] }) {
  const set = new Set(allowed);
  const modules = [...new Set(PERMISSIONS.map((p) => p.module))];
  return (
    <div className="space-y-4">
      {modules.map((mod) => (
        <div key={mod}>
          <h3 className="mb-2 text-sm font-semibold">{mod}</h3>
          <div className="grid gap-1 sm:grid-cols-2">
            {PERMISSIONS.filter((p) => p.module === mod).map((p) => (
              <label key={p.key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="permission" value={p.key} defaultChecked={set.has(p.key)} />
                {p.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
