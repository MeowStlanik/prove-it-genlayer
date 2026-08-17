import Link from "next/link";
import { WalletButton } from "./wallet-provider";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Prove It home">
        <span className="brand-mark">P</span>
        <span>PROVE IT</span>
      </Link>
      <nav className="main-nav" aria-label="Primary navigation">
        <Link href="/">Home</Link>
        <Link href="/create">Create</Link>
        <Link href="/profile">Profile</Link>
      </nav>
      <WalletButton />
    </header>
  );
}
