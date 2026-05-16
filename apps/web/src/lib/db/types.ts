import type { AuthThrottleCountersTable, UserSessionsTable } from "./schema/modules/auth.types";
import type { UsersTable } from "./schema/modules/identity.types";
import type { NotificationPrefsTable } from "./schema/modules/notifications.types";
import type {
  ProxyCredentialsTable,
  UploadJobItemsTable,
  UploadJobsTable,
} from "./schema/modules/pipeline.types";

export type * from "./schema/modules/identity.types";
export type * from "./schema/modules/auth.types";
export type * from "./schema/modules/pipeline.types";
export type * from "./schema/modules/notifications.types";

export interface Database {
  users: UsersTable;
  user_sessions: UserSessionsTable;
  auth_throttle_counters: AuthThrottleCountersTable;
  upload_jobs: UploadJobsTable;
  upload_job_items: UploadJobItemsTable;
  proxy_credentials: ProxyCredentialsTable;
  notification_prefs: NotificationPrefsTable;
}
