export type NotificationEvent =
  | "upload_queued"
  | "phase1_complete"
  | "upload_completed"
  | "upload_failed"
  | "phone_verification";

export interface NotificationMessage {
  subject: string;
  body: string;
}

export interface NotificationChannel {
  id: "email" | "whatsapp";
  contactField: "email" | "phone";
  init?(): Promise<void>;
  send(to: string, message: NotificationMessage): Promise<void>;
}
