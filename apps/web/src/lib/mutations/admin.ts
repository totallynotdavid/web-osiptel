import { action } from "@solidjs/router";

import { createUserAction, toggleUserActiveAction } from "~/actions/admin/users";

export const createUserMutation = action(
  async (formData: FormData) => createUserAction(formData),
  "createUser",
);

export const toggleUserActiveMutation = action(
  async (formData: FormData) => toggleUserActiveAction(formData),
  "toggleUserActive",
);
