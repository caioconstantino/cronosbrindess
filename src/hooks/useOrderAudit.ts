import { supabase } from "@/integrations/supabase/client";

type AuditAction = 
  | "created" 
  | "updated" 
  | "status_changed" 
  | "item_added" 
  | "item_removed" 
  | "item_updated";

type ChangeRecord = Record<string, { old: any; new: any }>;

export async function logOrderChange(
  orderId: string,
  action: AuditAction,
  changes: ChangeRecord,
  userId?: string | null,
  userEmail?: string | null,
  userName?: string | null
) {
  try {
    const { error } = await supabase.from("order_audit_logs").insert({
      order_id: orderId,
      user_id: userId || null,
      user_email: userEmail || null,
      user_name: userName || null,
      action,
      changes,
    });

    if (error) {
      console.error("Error logging order change:", error);
    }
  } catch (err) {
    console.error("Error in logOrderChange:", err);
  }
}

export function detectChanges<T extends Record<string, any>>(
  oldData: T,
  newData: T,
  fieldsToTrack: (keyof T)[]
): ChangeRecord {
  const changes: ChangeRecord = {};

  for (const field of fieldsToTrack) {
    const oldValue = oldData[field];
    const newValue = newData[field];

    // Deep comparison for objects
    const oldStr = JSON.stringify(oldValue);
    const newStr = JSON.stringify(newValue);

    if (oldStr !== newStr) {
      changes[field as string] = {
        old: oldValue,
        new: newValue,
      };
    }
  }

  return changes;
}

export function useOrderAudit() {
  return {
    logOrderChange,
    detectChanges,
  };
}
