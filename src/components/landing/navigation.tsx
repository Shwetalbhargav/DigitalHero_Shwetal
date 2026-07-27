import Link from "next/link";

export function Navigation() {
  return (
    <header className="site-header">
      <nav className="container navigation" aria-label="Primary navigation">
        <Link className="brand" href="/" aria-label="LeadDesk Mini home">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <span>LeadDesk</span>
        </Link>

        <div className="navigation__links">
          <a href="#process">Process</a>
          <a href="#services">Services</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="navigation__actions">
          <Link className="admin-link" href="/admin">
            Admin
          </Link>
          <a className="button button--small" href="#contact">
            Start a project
          </a>
        </div>
      </nav>
    </header>
  );
}
