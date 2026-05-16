import { action } from "@solidjs/router";

import { uploadCsvAction } from "~/actions/jobs/upload";

export const uploadCsvMutation = action(
  async (formData: FormData) => uploadCsvAction(formData),
  "uploadCsv",
);
