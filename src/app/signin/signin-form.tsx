"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Info, LayoutDashboard, LoaderCircle } from "lucide-react";
import { signIn, type SignInState } from "@/lib/auth-actions";
import { Maple } from "@/components/maple";

export interface DemoCard {
  email: string;
  name: string;
  role: "parent" | "director";
  detail: string;
  language?: string;
}

interface Group {
  centerName: string;
  place: string;
  accounts: DemoCard[];
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-teal-700 font-bold text-white hover:bg-teal-800 disabled:opacity-60"
    >
      {pending ? <LoaderCircle size={18} className="animate-spin" /> : null}
      Sign in
    </button>
  );
}

function DemoButton({ account }: { account: DemoCard }) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("demo") === account.email;
  const director = account.role === "director";
  return (
    <button
      type="submit"
      name="demo"
      value={account.email}
      disabled={pending}
      aria-label={`Sign in as ${account.name}, ${director ? "director" : "parent"}`}
      className="group flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-left hover:border-teal-600 hover:bg-teal-50/40 disabled:opacity-60"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${director ? "bg-amber-100 text-amber-900" : "bg-teal-50 text-teal-800"}`}
        aria-hidden
      >
        {director ? <LayoutDashboard size={18} /> : initials(account.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-bold text-stone-900">{account.name}</span>
          <span className="text-xs font-semibold text-stone-500">{director ? "Director" : "Parent"}</span>
          {account.language && account.language !== "English" ? (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">{account.language}</span>
          ) : null}
        </span>
        <span className="line-clamp-2 block text-sm text-stone-600">{account.detail}</span>
      </span>
      {mine ? (
        <LoaderCircle size={18} className="shrink-0 animate-spin text-teal-700" />
      ) : (
        <ArrowRight size={18} className="shrink-0 text-stone-400 group-hover:text-teal-700" />
      )}
    </button>
  );
}

export function SignInForm({ groups, password }: { groups: Group[]; password: string }) {
  const [state, action] = useActionState<SignInState, FormData>(signIn, {});
  const [email, setEmail] = useState(state.email ?? "");

  return (
    <>
      <section className="flex flex-col gap-6">
        <header className="flex items-center gap-4">
          <div className="shrink-0 rounded-full bg-[#F6EBD9] p-1.5">
            <Maple state="wave" size={72} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">AI front desk</p>
            <h1 className="text-2xl font-extrabold text-stone-900 sm:text-3xl">Sign in to your center</h1>
          </div>
        </header>

        <form action={action} className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-stone-700">
            Email
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl border border-stone-300 px-3 text-[15px] font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-stone-700">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-11 rounded-xl border border-stone-300 px-3 text-[15px] font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
            />
          </label>
          {state.error ? (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
              {state.error}
            </p>
          ) : null}
          <SubmitButton />
          <a href="#demo-accounts" className="text-center text-sm font-semibold text-teal-700 underline-offset-2 hover:underline lg:hidden">
            Trying the demo? Pick a demo account below
          </a>
        </form>
      </section>

      <section aria-labelledby="demo-accounts" className="rounded-3xl border-2 border-dashed border-teal-700/30 bg-white/60 p-4 sm:p-5">
        <h2 id="demo-accounts" className="text-lg font-extrabold text-stone-900">
          Demo accounts
        </h2>
        <p className="mt-1 flex gap-2 text-sm text-stone-600">
          <Info size={16} className="mt-0.5 shrink-0 text-teal-700" />
          <span>
            Sign-in is simulated for this prototype. Tap anyone to sign in as them, or type their email with the password{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[13px] text-stone-800">{password}</code>.
          </span>
        </p>
        <form action={action} className="mt-4 grid gap-5 md:grid-cols-2">
          {groups.map((g) => (
            <div key={g.centerName} className="flex flex-col gap-2">
              <h3 className="px-1">
                <span className="block font-bold text-stone-900">{g.centerName}</span>
                <span className="block text-xs text-stone-500">{g.place}</span>
              </h3>
              {g.accounts.map((a) => (
                <DemoButton key={a.email} account={a} />
              ))}
            </div>
          ))}
        </form>
      </section>
    </>
  );
}
