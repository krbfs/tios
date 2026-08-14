export function Footer() {
  return (
    <footer className="border-t border-solid border-border bg-white">
      <div className="container-page py-4 text-xs">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="text-center text-muted md:text-left">
            © 2026 | Teamconstructor
          </div>
          <div className="text-center">
            <a
              className="text-link underline-offset-2 hover:underline"
              href="https://insighter.by/"
              rel="noopener noreferrer"
              target="_blank"
            >
              Insighter
            </a>
          </div>
          <div className="text-center md:text-right">
            <a
              className="text-muted underline underline-offset-2 hover:text-primary"
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
