"use client";

import dynamic from "next/dynamic";
import type { ParentView } from "@/lib/parent-view";

/**
 * The parent app renders only in the browser, because the conversation is
 * restored from this browser's storage on first render.
 */
const FrontDesk = dynamic(() => import("./front-desk").then((m) => m.FrontDesk), {
  ssr: false,
  loading: () => <div className="h-dvh bg-[#FBF7F0]" />,
});

export function FrontDeskClient({ view }: { view: ParentView }) {
  return <FrontDesk view={view} />;
}
