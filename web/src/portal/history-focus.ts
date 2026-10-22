export type PortalReturnFocus = { href: string; index: number };

const stateKey = "kihamdaPortalReturnFocus";

export function readPortalReturnFocus(state: unknown): PortalReturnFocus | null {
  if (!state || typeof state !== "object" || !(stateKey in state)) return null;
  const target = state[stateKey];
  if (!target || typeof target !== "object" || !("href" in target) || !("index" in target)) return null;
  if (typeof target.href !== "string" || !target.href || typeof target.index !== "number" ||
      !Number.isSafeInteger(target.index) || target.index < 0) return null;
  return { href: target.href, index: target.index };
}

export function initialPortalReturnFocus(): PortalReturnFocus | null {
  const navigation = window.performance.getEntriesByType("navigation")[0];
  // A normal visit or reload must keep its existing initial-focus behavior.
  return navigation && "type" in navigation && navigation.type === "back_forward"
    ? readPortalReturnFocus(window.history.state) : null;
}

export function rememberPortalReturnFocus(anchor: HTMLAnchorElement): void {
  const href = anchor.getAttribute("href");
  if (!href) return;
  const links = [...document.querySelectorAll<HTMLAnchorElement>("a[href]")]
    .filter(link => link.getAttribute("href") === href);
  const index = links.indexOf(anchor);
  if (index < 0) return;
  const previous: unknown = window.history.state;
  window.history.replaceState({
    ...(previous && typeof previous === "object" ? previous : {}),
    [stateKey]: { href, index },
  }, "");
}

export function restorePortalReturnFocus(target: PortalReturnFocus): boolean {
  const links = [...document.querySelectorAll<HTMLAnchorElement>("a[href]")]
    .filter(link => link.getAttribute("href") === target.href);
  const anchor = links[target.index];
  if (!anchor || !anchor.getClientRects().length) return false;
  // Leave scroll restoration to the browser; focus must not jump to the hero.
  anchor.focus({ preventScroll: true });
  return document.activeElement === anchor;
}
