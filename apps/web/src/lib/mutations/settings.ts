import { action } from "@solidjs/router";

import { saveProxyCredentials, saveNotificationPrefs } from "~/actions/settings/save";
import { sendVerificationCode, confirmVerificationCode } from "~/actions/settings/verify-phone";

export const saveProxyMutation = action(
  async (formData: FormData) => saveProxyCredentials(formData),
  "saveProxy",
);

export const saveNotifMutation = action(
  async (formData: FormData) => saveNotificationPrefs(formData),
  "saveNotif",
);

export const sendVerificationMutation = action(
  async (_formData: FormData) => sendVerificationCode(),
  "sendVerification",
);

export const confirmVerificationMutation = action(
  async (formData: FormData) => confirmVerificationCode(formData),
  "confirmVerification",
);
