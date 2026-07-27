import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__main">
        <Link className="brand brand--footer" href="/">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <span>LeadDesk</span>
        </Link>
        <p>Digital products built with clarity, care, and purpose.</p>
        <nav aria-label="Footer navigation">
          <a href="#process">Process</a>
          <a href="#services">Services</a>
          <a href="#contact">Contact</a>
          <Link href="/admin">Admin</Link>
        </nav>
      </div>
      <div className="container footer__bottom">
        <span>© 2026 LeadDesk Mini</span>
        <a
          href="https://digitalheroesco.com"
          target="_blank"
          rel="noreferrer"
        >
          Built for Digital Heroes Training Task
        </a>
      </div>
    </footer>
  );
}
