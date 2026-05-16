export type UploadJobStatus = "pending" | "running" | "completed" | "failed";
export type ItemStatus = "pending" | "processing" | "done" | "failed";

export interface UploadJobsTable {
  id: string;
  user_id: string;
  filename: string;
  total_rows: number;
  processed_rows: number;
  active_rows: number;
  status: UploadJobStatus;
  error_message: string | null;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
}

export interface UploadJobItemsTable {
  id: string;
  upload_job_id: string;
  ruc: string;
  batch_index: number;
  status: ItemStatus;
  is_active: number | null;
  carrier_counts_json: string | null;
  providers_json: string | null;
  error: string | null;
  processed_at: number | null;
  claimed_at: number | null;
}

export interface ProxyCredentialsTable {
  id: string;
  user_id: string;
  geonode_username: string;
  geonode_password_enc: string;
  created_at: number;
  updated_at: number;
}
