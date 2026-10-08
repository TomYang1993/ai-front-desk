import type { Metadata } from "next";
import Link from "next/link";
import { centers, families } from "@/content";
import { accounts, DEMO_PASSWORD } from "@/content/accounts";
import { SignInForm, type DemoCard } from "./signin-form";

export const metadata: Metadata = { title: "Sign in · Maple, the AI front desk" };

const LANG_LABEL = { en: "English", es: "Español", zh: "中文", hi: "हिन्दी" } as const;

/** The front door. Sign-in is simulated; the demo accounts sign in with one click. */
export default function SignInPage() {
  const groups = centers.map((center) => ({
    centerId: center.id,
    centerName: center.name,
    place: `${center.city}, ${center.state}`,
    accounts: accounts
      .filter((a) => a.centerId === center.id)
      .map((a): DemoCard => {
        const family = families.find((f) => f.id === a.familyId);
        const detail = family
          ? family.children
              .map((c) => `${c.firstName}, ${center.rooms.find((r) => r.id === c.roomId)?.name}${c.allergies.length ? `, ${c.allergies.join(" and ")} allergy` : ""}`)
              .join(" · ")
          : "Opens the director console";
        return {
          email: a.email,
          name: a.name,
          role: a.role,
          detail,
          language: family ? LANG_LABEL[family.preferredLanguage] : undefined,
        };
      }),
  }));

  return (
    <main className="min-h-dvh bg-[#FBF7F0] px-4 py-8 text-stone-800 sm:px-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-10">
        <SignInForm groups={groups} password={DEMO_PASSWORD} />
        <footer className="text-center text-xs text-stone-500 lg:col-span-2">
          Everything here is fictional: the centers, families, staff and phone numbers. ·{" "}
          <Link href="/status" className="underline">
            Setup status
          </Link>
        </footer>
      </div>
    </main>
  );
}
