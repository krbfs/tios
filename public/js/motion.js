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
