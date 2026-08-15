/** Keep in sync with chrome/footer.html */
export function Footer() {
  return (
    <footer className="mt-8 bg-[#17255a] text-white/80">
      <div className="container-page py-5 text-xs">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="text-center md:text-left">© 2026 | TIOS</div>
          <div className="text-center">
            <a
              className="font-semibold text-white hover:text-[#5b8df7] hover:underline"
              href="https://insighter.by/"
              rel="noopener noreferrer"
              target="_blank"
            >
              Insighter
            </a>
          </div>
          <div className="text-center md:text-right">
            <a
              className="font-semibold text-white hover:text-[#5b8df7] hover:underline"
              href="mailto:support@tc26.pro"
            >
              support@tc26.pro
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
