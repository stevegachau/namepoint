import { Github } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { REPO_URL } from "@/site";

const LINKS = [
	{ label: "How", href: "#how" },
	{ label: "Scope", href: "#scope" },
	{ label: "FAQ", href: "#faq" },
];

/* The dependency strip was a whole section carrying one line of information. */
const STACK = [
	"ENS registry",
	"Public resolver",
	"IPFS",
	"eth.limo",
	"EIP-6963",
	"WalletConnect",
];

export function Footer() {
	return (
		<footer className="w-full border-t border-border/70 bg-background">
			<div className="container mx-auto py-10">
				<div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
					<a href="#top" className="group flex-none">
						<Wordmark size="sm" />
					</a>
					<nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
						{LINKS.map((l) => (
							<a
								key={l.label}
								href={l.href}
								className="text-sm text-muted-foreground transition-colors hover:text-foreground"
							>
								{l.label}
							</a>
						))}
						<a
							href={REPO_URL}
							target="_blank"
							rel="noreferrer"
							className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							<Github className="h-4 w-4 flex-none" />
							Source
						</a>
					</nav>
				</div>

				<div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/70 pt-6">
					{STACK.map((s) => (
						<span
							key={s}
							className="font-mono text-xs text-muted-foreground/70"
						>
							{s}
						</span>
					))}
				</div>

				<div className="mt-5 flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
					<p className="font-mono text-xs text-muted-foreground">
						ENSIP-7 contenthash &middot; ENSIP-5 url &middot; Ethereum mainnet
					</p>
					<a
						href={REPO_URL}
						target="_blank"
						rel="noreferrer"
						className="font-mono text-xs text-muted-foreground/70 transition-colors hover:text-foreground"
					>
						MIT licensed
					</a>
				</div>
			</div>
		</footer>
	);
}
