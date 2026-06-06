import * as React from "react";

const DESKTOP_BREAKPOINT = 1024;

/**
 * Returns true when the viewport is desktop-width (>= 1024px).
 * Used to switch between the untouched mobile layout and the desktop layout.
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth >= DESKTOP_BREAKPOINT
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const onChange = () => setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    // Modern browsers use addEventListener; older Safari/iOS only have addListener.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
    } else {
      (mql as any).addListener(onChange);
    }
    setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    return () => {
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", onChange);
      } else {
        (mql as any).removeListener(onChange);
      }
    };
  }, []);

  return isDesktop;
}
