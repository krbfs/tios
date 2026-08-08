export function Footer() {
  return (
    <footer className="border-t border-solid border-border">
      <div className="container mx-auto px-4 py-4 text-xs">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="mb-3 text-center text-muted md:text-left">
            © 2026 | Teamconstructor
          </div>
          <div className="mb-3 text-center md:text-right">
            <a
              className="text-muted underline underline-offset-2"
              href="mailto:support@teamconstructor.pro"
            >
              support@teamconstructor.pro
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
