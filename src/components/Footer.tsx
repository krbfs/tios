export function Footer() {
  return (
    <footer className="border-0 border-t border-solid border-border mt-10">
      <div className="container-page py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted">
        <div>
          © {new Date().getFullYear()} | Teamconstructor
        </div>
        <a href="mailto:support@teamconstructor.pro" className="text-primary hover:underline">
          support@teamconstructor.pro
        </a>
      </div>
    </footer>
  );
}
