import { notFound } from "next/navigation";

import { PasswordRecoveryPanel } from "@/components/mobile-app/user-profile/password-recovery-panel";
import { requireMobileCapability } from "@/lib/mobile/auth";
import { controlledPasswordRecoveryUserId } from "@/lib/mobile/password-recovery-access";

export default async function PasswordRecoveryTestPage() {
  await requireMobileCapability("mobile.accounts.recover");
  const userId = controlledPasswordRecoveryUserId();
  if (!userId) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text-primary">Password setup test</h1>
        <p className="text-sm leading-6 text-text-secondary">
          Use this controlled account to request a setup email, choose your password,
          and check mobile sign-in before staff rollout.
        </p>
        <p className="break-all text-xs text-text-muted">Test account: {userId}</p>
      </div>
      <PasswordRecoveryPanel userId={userId} displayName="the controlled test account" />
    </div>
  );
}
