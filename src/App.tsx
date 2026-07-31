import { useCallback, useEffect, useRef, useState } from "react";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Faq } from "@/components/Faq";
import { FinalCta } from "@/components/FinalCta";
import { Footer } from "@/components/Footer";
import { HowItWorks } from "@/components/HowItWorks";
import { Navbar } from "@/components/Navbar";
import { Scope } from "@/components/Scope";
import { SpecTape } from "@/components/SpecTape";
import { Hero } from "@/components/ui/animated-hero";
import { primaryName, profileAvatar, shortAddr } from "@/ens";
import NameSheet from "@/NameSheet";
import type { Injected } from "@/wallet";

/**
 * Page shell: sticky navbar, spec tape, hero over an ambient background, then
 * the supporting sections and a footer.
 *
 * Also owns the wallet state: the connect callback, the accountsChanged and
 * disconnect listeners, and best-effort resolution of the primary name and then
 * the avatar.
 */
export default function App() {
	const [sheetOpen, setSheetOpen] = useState(false);
	const [sheetView, setSheetView] = useState<"names" | "how" | "account">(
		"names",
	);
	const [provider, setProvider] = useState<Injected | null>(null);
	const [account, setAccount] = useState<string | null>(null);
	const [label, setLabel] = useState("Connect");
	const [avatar, setAvatar] = useState<string | null>(null);

	/**
	 * Detaches the listeners attached by the most recent connect. Injected
	 * providers are long-lived singletons on `window`, so without this a
	 * connect / disconnect / reconnect cycle leaves a second copy of both
	 * handlers on the same object and every account change fires twice.
	 */
	const detachRef = useRef<(() => void) | null>(null);

	const openSheet = (view: "names" | "how" | "account") => {
		setSheetView(view);
		setSheetOpen(true);
	};

	const forget = useCallback(() => {
		detachRef.current?.();
		detachRef.current = null;
		setAccount(null);
		setProvider(null);
	}, []);

	const onConnected = useCallback((p: Injected, a: string) => {
		detachRef.current?.();

		const onAccountsChanged = ((accs: string[]) => {
			setAccount(accs[0] ?? null);
			if (!accs[0]) setProvider(null);
		}) as never;
		const onDisconnect = (() => {
			setAccount(null);
			setProvider(null);
		}) as never;

		p.on?.("accountsChanged", onAccountsChanged);
		p.on?.("disconnect", onDisconnect);
		detachRef.current = () => {
			p.removeListener?.("accountsChanged", onAccountsChanged);
			p.removeListener?.("disconnect", onDisconnect);
		};

		setProvider(p);
		setAccount(a);
	}, []);

	// Leave nothing attached to the injected provider when the app goes away.
	useEffect(() => () => detachRef.current?.(), []);

	useEffect(() => {
		if (!account) {
			setLabel("Connect");
			setAvatar(null);
			return;
		}
		let live = true;
		setLabel(shortAddr(account));
		setAvatar(null);
		primaryName(account).then(async (n) => {
			if (!live || !n) return;
			setLabel(n);
			const a = await profileAvatar(n);
			if (live && a) setAvatar(a);
		});
		return () => {
			live = false;
		};
	}, [account]);

	return (
		<div
			id="top"
			className="relative flex min-h-screen flex-col bg-background text-foreground"
		>
			<Navbar
				walletLabel={label}
				walletAvatar={avatar}
				connected={!!account}
				onWalletClick={() => openSheet(account ? "account" : "names")}
				onChooseName={() => openSheet("names")}
			/>
			<SpecTape />

			<main className="relative flex-1">
				<section className="relative">
					<AmbientBackground />
					<Hero onChooseName={() => openSheet("names")} />
				</section>

				<HowItWorks />
				<Scope />
				<Faq />
				<FinalCta
					connected={!!account}
					onChooseName={() => openSheet("names")}
				/>
			</main>

			<Footer />

			<NameSheet
				open={sheetOpen}
				initialView={sheetView}
				onClose={() => setSheetOpen(false)}
				account={account}
				provider={provider}
				walletLabel={label}
				walletAvatar={avatar}
				onConnected={onConnected}
				onDisconnected={forget}
			/>
		</div>
	);
}
