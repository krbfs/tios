/** Scroll reveal and motion helpers for static HTML pages. */

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function initScrollReveal(root = document) {
  const items = root.querySelectorAll(".motion-reveal");
  if (!items.length) return;

  if (prefersReducedMotion()) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
  );

  items.forEach((el) => observer.observe(el));
}

export function revealStaggered(items, baseDelayMs = 100) {
  items.forEach((el, index) => {
    el.classList.add("motion-reveal");
    el.style.transitionDelay = `${index * baseDelayMs}ms`;
  });
  initScrollReveal(items[0]?.parentElement || document);
}

export function observeOnReveal(element, onReveal, options = {}) {
  if (!element || typeof onReveal !== "function") {
    return () => {};
  }

  if (prefersReducedMotion()) {
    onReveal();
    return () => {};
  }

  const { requireScroll = false, ...observerOptions } = options;
  const thresholdOption = observerOptions.threshold ?? 0.18;
  const minRatio = Array.isArray(thresholdOption)
    ? Math.min(...thresholdOption)
    : thresholdOption;
  let revealed = false;
  let lastEntry = null;

  const isIntersectingEnough = () => {
    if (lastEntry) {
      return lastEntry.isIntersecting && lastEntry.intersectionRatio >= minRatio;
    }
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const visibleHeight =
      Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
    return visibleHeight / Math.max(rect.height, 1) >= minRatio;
  };

  const maybeReveal = () => {
    if (revealed || !isIntersectingEnough()) {
      return;
    }
    if (requireScroll && window.scrollY < 1) {
      return;
    }
    revealed = true;
    cleanup();
    onReveal();
  };

  const observer = new IntersectionObserver(
    (entries) => {
      lastEntry = entries[0] ?? null;
      maybeReveal();
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -6% 0px",
      ...observerOptions,
    },
  );

  const onScroll = () => {
    maybeReveal();
  };

  const cleanup = () => {
    observer.disconnect();
    window.removeEventListener("scroll", onScroll);
  };

  observer.observe(element);
  if (requireScroll) {
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  return cleanup;
}
