"use client";

import { useEffect } from "react";

// Makes the phone's back button (and the browser's) close the open sheet,
// drawer, dialog or popover instead of leaving the page — for every overlay in
// the app, current and future, with no code in the overlays themselves.
//
// How: every overlay here is a Radix Dialog underneath (Sheet, Dialog,
// AlertDialog, vaul Drawer, Popover), and Radix marks its open content with
// role="dialog"/"alertdialog" and data-state="open". We watch for those:
// - one opens  → push a history entry for the same URL, so Back has something
//   to pop that isn't the previous page;
// - Back while one is open → close the topmost one with Escape (what Radix
//   already does for Esc) and stay on the page;
// - one closes some other way (X, overlay click, Esc) → quietly pop our entry
//   so the next Back still goes to the previous page;
// - it closed because the person navigated (a link inside it) → leave history
//   alone; the stale entry is skipped if Back reaches it later.
//
// Next.js keeps its router state in history.state and reloads the page on a
// popstate whose state it doesn't recognise, so our entries copy that state.

const OPEN_OVERLAYS = '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';
const MARK = "__overlayEntry";

const countOpen = () => document.querySelectorAll(OPEN_OVERLAYS).length;

const closeTopmost = () => {
  const target = (document.activeElement as HTMLElement | null) ?? document.body;
  target.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
};

export const OverlayBackHandler = () => {
  useEffect(() => {
    let pushed = 0; // our entries currently on top of the stack
    let ignorePops = 0; // popstates we caused ourselves
    let pushedAt = window.location.href;
    let frame = 0;

    const sync = () => {
      frame = 0;
      const open = countOpen();

      if (open > pushed) {
        if (pushed === 0) pushedAt = window.location.href;
        for (; pushed < open; pushed++) {
          window.history.pushState({ ...window.history.state, [MARK]: true }, "", window.location.href);
        }
        return;
      }

      if (open < pushed) {
        const extra = pushed - open;
        pushed = open;
        // Closed by navigating away: our entries sit under the new page now
        if (window.location.href !== pushedAt) return;
        ignorePops += 1;
        window.history.go(-extra);
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(sync);
    };

    const onPopState = (e: PopStateEvent) => {
      if (ignorePops > 0) {
        ignorePops -= 1;
        return;
      }
      if (pushed > 0) {
        // Back pressed with an overlay open: that entry is gone, close one
        pushed -= 1;
        closeTopmost();
        return;
      }
      // Landed on a leftover entry of ours with nothing open: keep going back
      if ((e.state as Record<string, unknown> | null)?.[MARK]) window.history.back();
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
    window.addEventListener("popstate", onPopState);
    schedule();

    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", onPopState);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
};
