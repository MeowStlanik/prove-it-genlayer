import { SiteHeader } from "./site-header";
import { WalletProvider } from "./wallet-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <SiteHeader />
      {children}
      <footer className="site-footer">
        <div className="brand"><span className="brand-mark">P</span><span>PROVE IT</span></div>
        <p>Crowdfund the outcome. Compete with proof. Settle by consensus.</p>
        <span>Built on GenLayer · Bradbury testnet</span>
      </footer>
    </WalletProvider>
  );
}
