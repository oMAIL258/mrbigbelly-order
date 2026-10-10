'use client';
import { useLang } from '@/lib/i18n';

/**
 * Every rule that decides what a customer gets, in their own language and in
 * one place. The shop would rather answer this once, here, than in a message
 * when somebody's points have gone — so it sits on the profile and on the
 * sign-up page, saying the same thing in both.
 */
export function Rules({ satangPerPoint, validMonths }: { satangPerPoint: number; validMonths: number }) {
  const { t } = useLang();
  const lines = [
    t.ruleEarn(Math.round(satangPerPoint / 100)),
    t.ruleInStore,
    t.ruleWhen,
    validMonths > 0 ? t.ruleExpiry(validMonths) : t.ruleNoExpiry,
    t.ruleApproval,
    t.ruleOneOrder,
  ];
  return (
    <section className="card mt-4 p-4">
      <h2 className="serif text-base">{t.howItWorks}</h2>
      <ul className="mt-2 space-y-1.5 text-ink-2 text-xs leading-relaxed">
        {lines.map((line, i) => <li key={i} className="flex gap-2"><span className="text-ink-3">·</span>{line}</li>)}
      </ul>
    </section>
  );
}
