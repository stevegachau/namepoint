import {
	MessagesSquare,
	Route,
	ShieldCheck,
	Sparkles,
	Wallet,
} from "lucide-react";
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
 * N5 floating pill: one content-sized bar carrying the wordmark, the
 * destinations and the actions, visibly detached from the page edges.
 *
 * The earlier version split these into wordmark-left / pill-centre /
 * actions-right, which is the full-width SaaS nav with a pill dropped into the
 * middle of it. A floating pill only reads as one when everything lives inside
 * it and the page runs underneath.
 *
 * The header keeps its height in the flow so the hero does not slide under the
 * bar; only the pill is drawn.
 */
export function Navbar({
	walletLabel,
	walletAvatar,
	connected,
	onWalletClick,
	onChooseName,
}: Props) {
	return (
		<header className="pointer-events-none sticky top-0 z-40 flex h-20 w-full items-center justify-center px-4">
			<nav
				aria-label="Primary"
				className="glass shadow-soft pointer-events-auto flex max-w-full items-center gap-1.5 rounded-full py-1.5 pl-3 pr-1.5"
			>
				<a href="#top" className="group flex-none px-1">
					<Wordmark size="sm" />
				</a>

				<span
					aria-hidden="true"
					className="mx-1 hidden h-5 w-px flex-none bg-border/70 lg:block"
				/>

				<span className="hidden items-center gap-0.5 lg:flex">
					{LINKS.map(({ label, href, icon: Icon }) => (
						<a
							key={label}
							href={href}
							className="group/link flex items-center gap-1.5 rounded-[5px] px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<Icon className="h-3.5 w-3.5 flex-none text-muted-foreground/70 transition-colors group-hover/link:text-primary" />
							{label}
						</a>
					))}
				</span>

				<span
					aria-hidden="true"
					className="mx-1 hidden h-5 w-px flex-none bg-border/70 sm:block"
				/>

				<ThemeToggle />

				<Button
					variant="ghost"
					size="sm"
					onClick={onWalletClick}
					title={connected ? "Wallet" : "Connect a wallet"}
					className="max-w-[30vw] gap-2 rounded-md px-2.5 text-muted-foreground hover:text-foreground sm:max-w-[12rem]"
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
					className="group hidden gap-2 rounded-full px-4 sm:inline-flex"
				>
					<Sparkles className="h-4 w-4 flex-none transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
					{connected ? "Choose a name" : "Get started"}
				</Button>
			</nav>
		</header>
	);
}
