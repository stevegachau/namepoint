import {
	MessagesSquare,
	Route,
	ShieldCheck,
	Sparkles,
	Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";

/**
 * Terse labels with an icon each. Navigation is a set of destinations, not a
 * summary of them, and the icons give the row something to scan by.
 */
const LINKS = [
	{ label: "How", href: "#how", icon: Route },
	{ label: "Scope", href: "#scope", icon: ShieldCheck },
	{ label: "FAQ", href: "#faq", icon: MessagesSquare },
];

type Props = {
	/** Connected wallet's primary name, or a shortened address, or "Connect". */
	walletLabel: string;
	walletAvatar: string | null;
	connected: boolean;
	onWalletClick: () => void;
	onChooseName: () => void;
};

/**
 * A floating glass pill rather than a full-width bar. The bar itself is
 * transparent, so the page scrolls past the nav instead of under a slab, and the
 * pill is absolutely centred on the viewport, which is the only way it stays
 * centred when the wordmark and the wallet controls are different widths.
 */
export function Navbar({
	walletLabel,
	walletAvatar,
	connected,
	onWalletClick,
	onChooseName,
}: Props) {
	// Transparent over the hero, frosted once content passes underneath.
	// Without this the headline scrolls straight through the wordmark.
	const [scrolled, setScrolled] = useState(false);
	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 24);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<header
			className={`sticky top-0 z-40 w-full transition-colors duration-300 ${
				scrolled
					? "border-b border-border/60 bg-background/70 backdrop-blur-xl"
					: "border-b border-transparent"
			}`}
		>
			<div className="container relative mx-auto flex h-20 items-center justify-between gap-4">
				<a href="#top" className="group relative z-10 flex-none">
					<Wordmark />
				</a>

				<nav className="glass absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full p-1.5 shadow-soft lg:flex">
					{LINKS.map(({ label, href, icon: Icon }, i) => (
						<span key={label} className="flex items-center">
							{/* Hairline between items, so the pill reads as a set of
							    destinations rather than three floating words. */}
							{i > 0 && (
								<span
									aria-hidden="true"
									className="mr-1 h-4 w-px flex-none bg-border/70"
								/>
							)}
							<a
								href={href}
								className="group/link flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<Icon className="h-3.5 w-3.5 flex-none text-muted-foreground/70 transition-colors group-hover/link:text-primary" />
								{label}
							</a>
						</span>
					))}
				</nav>

				<div className="relative z-10 flex flex-none items-center gap-2">
					<ThemeToggle />
					<Button
						variant="ghost"
						size="sm"
						onClick={onWalletClick}
						title={connected ? "Wallet" : "Connect a wallet"}
						className="max-w-[38vw] gap-2 rounded-full text-muted-foreground hover:text-foreground sm:max-w-[16rem]"
					>
						{walletAvatar ? (
							<img
								src={walletAvatar}
								alt=""
								referrerPolicy="no-referrer"
								className="h-4 w-4 flex-none rounded-full object-cover"
							/>
						) : (
							<Wallet className="h-4 w-4 flex-none" />
						)}
						<span className="truncate">{walletLabel}</span>
					</Button>
					<Button
						size="sm"
						onClick={onChooseName}
						className="group hidden gap-2 rounded-full pl-4 pr-4 sm:inline-flex"
					>
						<Sparkles className="h-4 w-4 flex-none transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
						{connected ? "Choose a name" : "Get started"}
					</Button>
				</div>
			</div>
		</header>
	);
}
