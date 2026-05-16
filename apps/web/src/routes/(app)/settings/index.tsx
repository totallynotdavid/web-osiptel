import { createAsync, query, useAction } from "@solidjs/router";
import { createSignal, Show, Suspense } from "solid-js";

import { getMySettings } from "~/actions/settings/queries";
import {
  saveProxyMutation,
  saveNotifMutation,
  sendVerificationMutation,
  confirmVerificationMutation,
} from "~/lib/mutations/settings";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { PageHeader } from "~/components/page-header";

const settingsQuery = query(getMySettings, "mySettings");

export const route = {
  preload: () => settingsQuery(),
};

export default function SettingsPage() {
  const settings = createAsync(() => settingsQuery());
  const saveProxy = useAction(saveProxyMutation);
  const saveNotif = useAction(saveNotifMutation);
  const sendVerification = useAction(sendVerificationMutation);
  const confirmVerification = useAction(confirmVerificationMutation);

  const [proxyStatus, setProxyStatus] = createSignal<string | null>(null);
  const [notifStatus, setNotifStatus] = createSignal<string | null>(null);
  const [verifyStep, setVerifyStep] = createSignal<"idle" | "sent">("idle");
  const [verifyError, setVerifyError] = createSignal<string | null>(null);

  async function handleProxy(e: SubmitEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const result = await saveProxy(fd);
    setProxyStatus(result.ok ? "Saved." : result.error);
    setTimeout(() => setProxyStatus(null), 3000);
  }

  async function handleNotif(e: SubmitEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const result = await saveNotif(fd);
    if (result.ok) {
      setVerifyStep("idle");
      setVerifyError(null);
    }
    setNotifStatus(result.ok ? "Saved." : result.error);
    setTimeout(() => setNotifStatus(null), 3000);
  }

  async function handleSendCode() {
    setVerifyError(null);
    const result = await sendVerification(new FormData());
    if (result.ok) {
      setVerifyStep("sent");
    } else {
      setVerifyError(result.error);
    }
  }

  async function handleConfirmCode(e: SubmitEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const result = await confirmVerification(fd);
    if (result.ok) {
      setVerifyStep("idle");
      setVerifyError(null);
    } else {
      setVerifyError(result.error);
      setVerifyStep("idle");
    }
  }

  return (
    <div class="max-w-2xl mx-auto">
      <PageHeader eyebrow="Settings" title="Account settings" />

      <Suspense>
        <Card class="p-6 mb-6">
          <h2 class="text-sm font-medium text-white mb-1 font-sans">GeoNode proxy credentials</h2>
          <p class="text-xs text-gray-500 mb-6">
            Used to authenticate lookup requests through GeoNode residential proxies.
          </p>
          <form onSubmit={handleProxy} class="flex flex-col gap-4">
            <Input
              label="Username"
              type="text"
              name="username"
              placeholder="geonode username"
              value={settings()?.proxyUsername ?? ""}
            />
            <Input label="Password" type="password" name="password" placeholder="••••••••" />
            <div class="flex items-center gap-4">
              <Button type="submit">Save credentials</Button>
              <Show when={proxyStatus()}>
                <span class="text-xs text-cyan">{proxyStatus()}</span>
              </Show>
            </div>
          </form>
        </Card>

        <Card class="p-6">
          <h2 class="text-sm font-medium text-white mb-1 font-sans">Notifications</h2>
          <p class="text-xs text-gray-500 mb-6">
            Get notified when your uploads finish processing.
          </p>
          <form onSubmit={handleNotif} class="flex flex-col gap-4">
            <Input
              label="Notification email"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={settings()?.notificationEmail ?? ""}
            />
            <div class="flex flex-col gap-2">
              <div class="flex items-end gap-3">
                <div class="flex-1">
                  <Input
                    label="WhatsApp number"
                    type="tel"
                    name="phone"
                    placeholder="987654321"
                    value={settings()?.whatsappPhone ?? ""}
                  />
                </div>
                <Show when={settings()?.whatsappPhone && settings()?.phoneVerified}>
                  <Badge variant="cyan">Verified</Badge>
                </Show>
              </div>
              <p class="text-xs text-gray-600">9-digit Peruvian mobile number</p>
            </div>
            <div class="flex flex-col gap-3">
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="notify_on_completion"
                  value="1"
                  class="accent-cyan"
                  checked={!!settings()?.notifyOnCompletion}
                />
                <span class="text-xs text-gray-300">Notify on job completion</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="notify_on_failure"
                  value="1"
                  class="accent-cyan"
                  checked={!!settings()?.notifyOnFailure}
                />
                <span class="text-xs text-gray-300">Notify on job failure</span>
              </label>
            </div>
            <div class="flex items-center gap-4">
              <Button type="submit">Save preferences</Button>
              <Show when={notifStatus()}>
                <span class="text-xs text-cyan">{notifStatus()}</span>
              </Show>
            </div>
          </form>

          <Show when={settings()?.whatsappPhone && !settings()?.phoneVerified}>
            <div class="mt-6 pt-6 border-t border-gray-900">
              <p class="text-xs text-gray-400 mb-4">
                Verify your WhatsApp number to receive notifications.
              </p>
              <Show
                when={verifyStep() === "sent"}
                fallback={
                  <Button variant="outline" onClick={handleSendCode}>
                    Send verification code
                  </Button>
                }
              >
                <form onSubmit={handleConfirmCode} class="flex items-end gap-3">
                  <div class="flex-1">
                    <Input
                      label="Verification code"
                      type="text"
                      name="code"
                      placeholder="000000"
                      maxlength="6"
                    />
                  </div>
                  <Button type="submit">Confirm</Button>
                </form>
                <p class="text-xs text-gray-600 mt-2">Check your WhatsApp for the 6-digit code.</p>
              </Show>
              <Show when={verifyError()}>
                <p class="text-xs text-red-400 mt-3">{verifyError()}</p>
              </Show>
            </div>
          </Show>
        </Card>
      </Suspense>
    </div>
  );
}
