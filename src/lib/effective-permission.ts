/** User override wins; otherwise the role default. */
export function effectiveAllowed(roleAllowed: boolean, override?: "allow" | "deny") {
  if (override === "allow") return true;
  if (override === "deny") return false;
  return roleAllowed;
}
