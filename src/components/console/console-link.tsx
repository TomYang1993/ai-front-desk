"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";

/**
 * Moves around the console without asking the server for a new page. The
 * console already holds every tab's data, so a click only needs to change the
 * URL (Next keeps `useSearchParams` in step with `pushState`). Each tab used
 * to cost a full server render, which was fast on a laptop and slow online.
 */
export function goTo(href: string) {
  window.history.pushState(null, "", href);
  const hash = new URL(href, window.location.href).hash.slice(1);
  if (!hash) {
    window.scrollTo({ top: 0 });
    return;
  }
  // The target mounts with the tab, a frame or two after the URL changes.
  let tries = 0;
  const find = () => {
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else if (tries++ < 20) requestAnimationFrame(find);
  };
  requestAnimationFrame(find);
}

/** A link that stays on the page. Modified clicks (new tab, new window) still work as usual. */
export function ConsoleLink({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  function handle(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    goTo(href);
  }
  return <a href={href} onClick={handle} {...rest} />;
}
