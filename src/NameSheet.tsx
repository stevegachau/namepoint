import {
	ArrowLeft,
	ArrowRight,
	Check,
	Link2,
	Loader2,
	Search,
	X,
} from "lucide-react";
import {
	type HTMLAttributes,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	type NameStatus,
	REDIRECT_CONTENTHASH,
	type WriteIntent,
	errText,
	fetchOwnedNames,
	inspectName,
	normalizeUrl,
	planTransactions,
	shortAddr,
	submitPlanned,
	waitForTx,
} from "./ens";
import {
	disconnect,
	type Injected,
	type WalletOption,
	listWallets,
	onWalletsChanged,
} from "./wallet";

type View = "wallets" | "account" | "names" | "confirm" | "how";

type Props = {
	open: boolean;
	initialView: View;
	onClose: () => void;
	account: string | null;
	provider: Injected | null;
	walletLabel: string;
	walletAvatar: string | null;
	onConnected: (provider: Injected, account: string) => void;
	onDisconnected: () => void;
};

export default function NameSheet({
	open,
	initialView,
	onClose,
	account,
	provider,
	walletLabel,
	walletAvatar,
	onConnected,
	onDisconnected,
}: Props) {
	const [view, setView] = useState<View>(initialView);
	const [wallets, setWallets] = useState<WalletOption[]>([]);
	const [names, setNames] = useState<string[]>([]);
	const [loadingNames, setLoadingNames] = useState(false);
	const [namesError, setNamesError] = useState<string | null>(null);
	const [filter, setFilter] = useState("");
	const [status, setStatus] = useState<NameStatus | null>(null);
	const [checking, setChecking] = useState(false);
	const [phase, setPhase] = useState<
		"idle" | "signing" | "pending" | "slow"
	>("idle");
	const [banner, setBanner] = useState<{ kind: string; html: string } | null>(null);
	const [txHash, setTxHash] = useState<string | null>(null);
	/** The destination being edited, as typed. */
	const [dest, setDest] = useState("");
	/** Which confirmation of how many, when a resolver cannot batch. */
	const [step, setStep] = useState<{ n: number; total: number } | null>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const restoreRef = useRef<HTMLElement | null>(null);
	const seq = useRef(0);

	useEffect(() => setWallets(listWallets()), []);
	useEffect(() => {
		const off = onWalletsChanged(() => setWallets(listWallets()));
		return () => {
			off();
		};
	}, []);

	useEffect(() => {
		if (!open) return;
		if (initialView === "how") setView("how");
		else if (!account) setView("wallets");
		else setView(initialView);
	}, [open, initialView, account]);

	useEffect(() => {
		document.body.style.overflow = open ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [open]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	/**
	 * Move focus into the dialog on open and hand it back on close. Without the
	 * hand-back, dismissing the sheet drops focus onto <body> and a keyboard user
	 * restarts from the top of the page.
	 */
	useEffect(() => {
		if (open) {
			restoreRef.current = document.activeElement as HTMLElement | null;
			panelRef.current?.focus();
			return;
		}
		const previous = restoreRef.current;
		restoreRef.current = null;
		previous?.focus?.();
	}, [open]);

	/** Keep Tab inside the dialog while it is open, as aria-modal promises. */
	useEffect(() => {
		if (!open) return;
		const onTab = (e: KeyboardEvent) => {
			if (e.key !== "Tab") return;
			const panel = panelRef.current;
			if (!panel) return;
			const items = [
				...panel.querySelectorAll<HTMLElement>(
					'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])',
				),
			].filter((el) => el.offsetParent !== null);
			if (!items.length) return;

			const first = items[0];
			const last = items[items.length - 1];
			if (!panel.contains(document.activeElement)) {
				e.preventDefault();
				first.focus();
			} else if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		};
		document.addEventListener("keydown", onTab);
		return () => document.removeEventListener("keydown", onTab);
	}, [open]);

	/** A stale error from one view should not greet the user on the next. */
	useEffect(() => setBanner(null), [view]);

	const loadNames = useCallback(async (addr: string) => {
		setLoadingNames(true);
		setNamesError(null);
		try {
			setNames(await fetchOwnedNames(addr));
		} catch (e) {
			setNames([]);
			setNamesError(errText(e));
		} finally {
			setLoadingNames(false);
		}
	}, []);

	useEffect(() => {
		if (open && view === "names" && account && !names.length && !loadingNames && !namesError)
			loadNames(account);
	}, [open, view, account, names.length, loadingNames, namesError, loadNames]);

	useEffect(() => {
		if (open && view === "names" && window.innerWidth > 720)
			setTimeout(() => searchRef.current?.focus(), 350);
	}, [open, view]);

	const shown = useMemo(() => {
		const f = filter.trim().toLowerCase();
		return f ? names.filter((n) => n.toLowerCase().includes(f)) : names;
	}, [filter, names]);

	async function pick(name: string) {
		if (!account) return;
		const id = ++seq.current;
		setView("confirm");
		setStatus(null);
		setBanner(null);
		setTxHash(null);
		setDest("");
		setChecking(true);
		try {
			const s = await inspectName(name, account);
			if (id !== seq.current) return;
			setStatus(s);
			// Prefill with the live record, so the field shows where the name points
			// today and an untouched field means "leave it alone".
			setDest(s.url ?? "");
		} catch (e) {
			if (id !== seq.current) return;
			setBanner({ kind: "err", html: errText(e) });
		} finally {
			if (id === seq.current) setChecking(false);
		}
	}

	/**
	 * Carry out an intent, walking the confirmations the resolver requires. On a
	 * Multicallable resolver that is a single signature even when both the
	 * destination and the redirect change.
	 */
	async function run(intent: WriteIntent, done: string) {
		if (!status || !provider) return;
		const planned = planTransactions(status, intent);
		if (!planned.length) return;

		setBanner(null);
		setTxHash(null);
		try {
			for (let i = 0; i < planned.length; i++) {
				setStep({ n: i + 1, total: planned.length });
				setPhase("signing");
				const hash = await submitPlanned(provider, status, planned[i]);
				// Surface the hash the moment it exists, so the user is never left
				// with nothing to check while the block is mined.
				setTxHash(hash);
				setPhase("pending");

				const receipt = await waitForTx(hash);
				if (!receipt) {
					setPhase("slow");
					setBanner({
						kind: "warn",
						html: "Still pending after a few minutes. It may yet confirm, so check the transaction.",
					});
					return;
				}
				if (receipt.status === 0) {
					setPhase("idle");
					setBanner({ kind: "err", html: "The transaction reverted onchain." });
					return;
				}
			}

			const fresh = await inspectName(status.name, account as string);
			setStatus(fresh);
			setDest(fresh.url ?? "");
			setPhase("idle");
			setStep(null);
			setBanner({ kind: "ok", html: done });
		} catch (e) {
			setPhase("idle");
			setStep(null);
			setBanner({ kind: "err", html: errText(e).slice(0, 200) });
		}
	}

	async function connectWith(w: WalletOption) {
		try {
			const { provider: p, account: a } = await w.connect();
			onConnected(p, a);
			setNames([]);
			setNamesError(null);
			setView("names");
		} catch (e) {
			setBanner({ kind: "err", html: errText(e).slice(0, 160) });
		}
	}

	/* ---------------- destination + the resulting primary action ---------------- */

	const destUrl = normalizeUrl(dest);
	const destInvalid = dest.trim().length > 0 && !destUrl;
	/** Both sides normalised, so a trailing slash is not mistaken for an edit. */
	const liveUrl = status?.url ? normalizeUrl(status.url) : null;
	const destChanged = !!destUrl && destUrl !== liveUrl;
	const busy = phase === "signing" || phase === "pending";

	/** Redirect live, but pointing at nothing. Visitors are seeing a blank page. */
	const liveButBlank = !!status?.on && !liveUrl;

	/**
	 * One button, whose meaning follows from the name's state and whether the
	 * destination was edited. Turning on and pointing somewhere is a single
	 * action rather than two, because to the user it is one decision.
	 */
	function primaryAction(s: NameStatus) {
		// A live redirect with no destination is the one broken state a holder can
		// reach on their own, by clearing the url record elsewhere. The contenthash
		// is already set, so the fix is the url record alone, and offering to switch
		// the redirect off would be answering a question they did not ask.
		if (s.on && !liveUrl) {
			return {
				label: "Set destination",
				intent: { contenthash: null, url: destUrl } satisfies WriteIntent,
				done: `Done. ${s.name} now forwards to ${destUrl}.`,
			};
		}
		if (s.on && destChanged) {
			return {
				label: "Save destination",
				intent: { contenthash: null, url: destUrl } satisfies WriteIntent,
				done: `Done. ${s.name} now forwards to ${destUrl}.`,
			};
		}
		if (s.on) {
			return {
				label: "Turn redirect off",
				intent: { contenthash: "0x", url: null } satisfies WriteIntent,
				done: `Done. Redirect turned off for ${s.name}.`,
			};
		}
		return {
			label: destChanged
				? "Save destination and activate"
				: s.other
					? "Replace with redirect"
					: "Activate redirect",
			intent: {
				contenthash: REDIRECT_CONTENTHASH,
				url: destChanged ? destUrl : null,
			} satisfies WriteIntent,
			done: `Done. Redirect turned on for ${s.name}.`,
		};
	}

	const primary = status ? primaryAction(status) : null;
	const confirmations =
		status && primary ? planTransactions(status, primary.intent).length : 0;

	/**
	 * React 18's types carry no `inert` prop, and it has to land as a bare boolean
	 * attribute, which an empty string produces. Without it the dialog's controls
	 * stay in the tab order and in the accessibility tree while it is closed,
	 * because neither `opacity-0` nor `pointer-events-none` removes them.
	 */
	const inertWhenClosed = (open
		? {}
		: { inert: "" }) as HTMLAttributes<HTMLDivElement>;

	// break-words is not cosmetic: an unnormalised name arrives as a 66-character
	// labelhash with no break opportunity and runs straight out of the banner.
	const msgClass = (kind: string) =>
		`break-words ${
			kind === "ok"
				? "bg-ok/15 text-ok"
				: kind === "warn"
					? "bg-warn/15 text-warn"
					: "bg-destructive/15 text-destructive"
		}`;

	return (
		<div
			{...inertWhenClosed}
			className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
				open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
			}`}
		>
			{/*
			  The dismiss handler belongs here, not on the flex container: this
			  backdrop is absolutely positioned over the whole viewport, so it is
			  always the click target and a check against the container never matched.
			  Keyboard users dismiss with Escape or the close button.
			*/}
			<div
				className="absolute inset-0 bg-foreground/25 dark:bg-background/80 backdrop-blur-sm"
				onClick={onClose}
			/>

			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby="namesheet-title"
				tabIndex={-1}
				className={`relative w-full max-w-md max-h-[84vh] flex flex-col bg-card/95 backdrop-blur-xl rounded-lg shadow-2xl border border-border outline-none transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
					open ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0"
				}`}
			>
				{/* head */}
				<div className="flex-none px-6 pt-5 pb-4 border-b border-border/70">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<h2
								id="namesheet-title"
								className="font-display text-lg font-semibold tracking-tight text-foreground"
							>
								{view === "wallets" && "Connect a wallet"}
								{view === "account" && "Wallet connected"}
								{view === "names" && "Your names"}
								{view === "confirm" && "Activate redirect"}
								{view === "how" && "How it works"}
							</h2>
							<p className="text-sm text-muted-foreground break-words">
								{view === "wallets" && "to list the names you can manage"}
								{view === "account" && shortAddr(account)}
								{view === "names" && shortAddr(account)}
								{view === "confirm" && status?.name}
								{view === "how" && "three steps, one signature"}
							</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							aria-label="Close"
							className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-secondary hover:bg-secondary/70 text-foreground transition-colors"
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					{view === "names" && (
						<div className="mt-4 flex items-center gap-2.5 h-11 px-4 rounded-full bg-secondary/50 border border-border/70 focus-within:border-ring focus-within:bg-background transition-colors">
							<Search className="w-4 h-4 flex-none text-muted-foreground" />
							<input
								ref={searchRef}
								value={filter}
								onChange={(e) => setFilter(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && shown.length === 1) pick(shown[0]);
								}}
								spellCheck={false}
								autoComplete="off"
								placeholder="Search your names"
								className="flex-1 min-w-0 bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground/60"
							/>
						</div>
					)}
				</div>

				{/* body */}
				<div className="flex-1 overflow-y-auto px-3 py-3">
					{view === "wallets" && (
						<div className="px-1">
							{wallets.map((w) => (
								<button
									type="button"
									key={w.uuid}
									onClick={() => connectWith(w)}
									className="flex items-center gap-3 w-full text-left px-4 py-3 mb-2 rounded-md bg-background border border-border/70 hover:bg-primary/10 hover:border-primary/60 text-[15px] font-medium text-foreground transition-colors"
								>
									<img src={w.icon} alt="" className="w-7 h-7 rounded-lg flex-none" />
									{w.name}
								</button>
							))}
							{banner && (
								<div className={`mt-2 px-4 py-3 rounded-md text-[13px] leading-relaxed ${msgClass(banner.kind)}`}>
									{banner.html}
								</div>
							)}
						</div>
					)}

					{view === "account" && (
						<div className="px-3 pt-2 pb-1 text-center">
							<div className="w-14 h-14 mx-auto mb-3 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xl font-semibold">
								{walletAvatar ? (
									<img
										src={walletAvatar}
										alt=""
										referrerPolicy="no-referrer"
										className="w-full h-full object-cover"
									/>
								) : (
									(walletLabel[0] ?? "?").toUpperCase()
								)}
							</div>
							<div className="text-[17px] font-semibold tracking-tight text-foreground break-all">
								{walletLabel}
							</div>
							<div className="text-[13px] text-muted-foreground mt-1 break-all">{account}</div>
						</div>
					)}

					{view === "how" && (
						<div className="px-3">
							{[
								["Select a name", "Choose any name your wallet manages. Authorisation is checked onchain before the name is offered."],
								["Set the destination", "Enter the URL the name should forward to. It is written to the url record, which the redirect resolves at request time."],
								["Sign once", "Both records are batched into a single call to your resolver. Switching off later is one more transaction."],
							].map(([h, p], i) => (
								<div key={h} className="flex gap-3.5 py-3.5 border-b border-border/70 last:border-0">
									<div className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-semibold">
										{i + 1}
									</div>
									<div>
										<div className="text-sm font-semibold text-foreground">{h}</div>
										<div className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">{p}</div>
									</div>
								</div>
							))}
							<p className="text-[13px] leading-relaxed text-muted-foreground pt-4">
								Every write is signed by your wallet. namepoint takes no custody
								and holds no key with authority over your name.
							</p>
						</div>
					)}

					{view === "names" && (
						<>
							{loadingNames && (
								<div className="flex items-center justify-center gap-2.5 py-12 text-sm text-muted-foreground">
									<Loader2 className="w-4 h-4 animate-spin" />
									Reading the ENS index&hellip;
								</div>
							)}
							{namesError && !loadingNames && (
								<div className={`mx-1 mb-2 px-4 py-3 rounded-md text-[13px] leading-relaxed ${msgClass("warn")}`}>
									The ENS index is unreachable, so names cannot be listed right now.
								</div>
							)}
							{!loadingNames &&
								shown.map((n, i) => (
									<button
										type="button"
										key={n}
										onClick={() => pick(n)}
										style={{ transitionDelay: i < 12 ? `${i * 26}ms` : "0ms" }}
										className="flex items-center justify-between gap-3 w-full text-left px-3.5 py-3 rounded-md hover:bg-primary/10 transition-colors group"
									>
										<span className="text-[15px] font-medium text-foreground break-all">{n}</span>
										<ArrowRight className="w-4 h-4 flex-none text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
									</button>
								))}
							{!loadingNames && !shown.length && (
								<div className="text-center py-12 px-4 text-sm leading-relaxed text-muted-foreground">
									{names.length
										? "No name matches that."
										: "No names found for this wallet."}
								</div>
							)}
							{!loadingNames && shown.length > 0 && (
								<p className="text-center text-xs text-muted-foreground pt-3">
									{shown.length} of {names.length} name{names.length === 1 ? "" : "s"}
								</p>
							)}
						</>
					)}

					{view === "confirm" && (
						<div className="px-3">
							{checking && (
								<div className="flex items-center justify-center gap-2.5 py-12 text-sm text-muted-foreground">
									<Loader2 className="w-4 h-4 animate-spin" />
									Reading the registry and resolver&hellip;
								</div>
							)}

							{!banner && txHash && phase === "pending" && (
								<div className={`mb-3 px-4 py-3 rounded-md text-[13px] leading-relaxed ${msgClass("warn")}`}>
									Sent. Waiting for the block.{" "}
									<a
										href={`https://etherscan.io/tx/${txHash}`}
										target="_blank"
										rel="noopener"
										className="underline"
									>
										View transaction
									</a>
								</div>
							)}

							{banner && (
								<div className={`mb-3 px-4 py-3 rounded-md text-[13px] leading-relaxed ${msgClass(banner.kind)}`}>
									{banner.html}{" "}
									{txHash && (
										<a
											href={`https://etherscan.io/tx/${txHash}`}
											target="_blank"
											rel="noopener"
											className="underline"
										>
											View transaction
										</a>
									)}
								</div>
							)}

							{status && !checking && (
								<>
									<div className="flex items-center gap-3 pb-4">
										<div className="flex-none w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-lg font-semibold">
											{status.avatar ? (
												<img src={status.avatar} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
											) : (
												status.name[0]?.toUpperCase()
											)}
										</div>
										<div className="min-w-0">
											<div className="text-[17px] font-semibold tracking-tight text-foreground break-all">
												{status.name}
											</div>
											<div className="text-[13px] text-muted-foreground">
												{status.on ? "redirect is on" : status.hasResolver ? "redirect is off" : "not configured"}
											</div>
										</div>
									</div>

									{/* The url record is not listed here: it is editable just below. */}
									{[
										["Resolver", status.hasResolver ? shortAddr(status.resolver) : "none set", status.hasResolver ? "dim" : "bad"],
										["Redirect", status.on ? "on" : status.other ? "other content" : "off", status.on ? "ok" : status.other ? "warn" : "dim"],
										["This wallet", status.canWrite ? "can write" : "can't write", status.canWrite ? "ok" : "bad"],
									].map(([k, v, tone]) => (
										<div key={k} className="flex items-baseline justify-between gap-3 py-2.5 border-b border-border/70 last:border-0 text-sm">
											<span className="flex-none text-muted-foreground">{k}</span>
											<span
												className={`font-semibold text-right break-all ${
													tone === "ok" ? "text-primary" : tone === "bad" ? "text-destructive" : tone === "warn" ? "text-warn" : "text-muted-foreground font-medium"
												}`}
											>
												{v}
											</span>
										</div>
									))}

									{status.hasResolver && status.canWrite && (
										<div className="mt-5">
											<label
												htmlFor="dest"
												className="flex items-center gap-2 text-sm font-semibold text-foreground"
											>
												<Link2 className="h-3.5 w-3.5 flex-none text-primary" />
												Destination
											</label>
											<p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
												The URL{" "}
												<span className="font-medium text-foreground break-all">
													{status.name}
												</span>{" "}
												forwards to. Written to the{" "}
												<span className="font-mono text-foreground">url</span>{" "}
												record, editable here or in any ENS manager.
											</p>
											<input
												id="dest"
												value={dest}
												onChange={(e) => setDest(e.target.value)}
												placeholder="https://your-site.com"
												inputMode="url"
												spellCheck={false}
												autoComplete="off"
												disabled={busy}
												className={`mt-3 w-full h-11 px-4 rounded-md bg-secondary/50 border text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:bg-background disabled:opacity-50 ${
													destInvalid
														? "border-destructive"
														: "border-border/70 focus:border-ring"
												}`}
											/>
											{destInvalid && (
												<p className="mt-2 text-[13px] leading-relaxed text-destructive">
													Not a supported address. Use an http or https URL.
												</p>
											)}
											{!destInvalid && destChanged && (
												<p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
													Saving as{" "}
													<span className="font-mono text-foreground break-all">
														{destUrl}
													</span>
												</p>
											)}
										</div>
									)}

									{!status.hasResolver && (
										<div className={`mt-3 px-4 py-3 rounded-md text-[13px] leading-relaxed ${msgClass("err")}`}>
											<b className="font-semibold">No resolver on this name.</b> There is
											nowhere to store the record. Set a resolver in the ENS manager first.
										</div>
									)}
									{status.hasResolver && !status.canWrite && (
										<div className={`mt-3 px-4 py-3 rounded-md text-[13px] leading-relaxed ${msgClass("err")}`}>
											<b className="font-semibold">This wallet can&rsquo;t write to {status.name}.</b>{" "}
											A simulated write was rejected. Connect the wallet that manages it.
										</div>
									)}
									{/* Both notices clear the moment a destination is typed: the
									  button and the "Saving as" line then carry the message, and
									  restating the problem next to its filled-in fix reads as
									  nagging. */}
									{status.hasResolver &&
										status.canWrite &&
										liveButBlank &&
										!destUrl && (
										<div className={`mt-3 px-4 py-3 rounded-md text-[13px] leading-relaxed ${msgClass("warn")}`}>
											<b className="font-semibold">
												The redirect is on, but there is no destination.
											</b>{" "}
											Anyone visiting {status.name} is getting a blank page. The
											contenthash is already set, so filling the field above fixes it in
											one transaction that touches only the url record.
										</div>
									)}

									{status.hasResolver &&
										status.canWrite &&
										!status.on &&
										!destUrl && (
											<div className={`mt-3 px-4 py-3 rounded-md text-[13px] leading-relaxed ${msgClass("warn")}`}>
												<b className="font-semibold">No destination yet.</b> Fill the
												field above and it is saved{" "}
												{status.canMulticall
													? "in the same transaction"
													: "alongside the redirect"}
												. Activate without one and your name resolves to a blank page
												until you set it.
											</div>
										)}
									{status.other && (
										<div className={`mt-3 px-4 py-3 rounded-md text-[13px] leading-relaxed ${msgClass("warn")}`}>
											<b className="font-semibold">Something else is published here.</b>{" "}
											Activating replaces it and that site stops resolving.
										</div>
									)}
									{status.on && (
										<div className={`mt-3 px-4 py-3 rounded-md text-[13px] leading-relaxed ${msgClass("ok")}`}>
											<b className="font-semibold">Redirect is live.</b> Open{" "}
											<a href={`https://${status.name}.limo`} target="_blank" rel="noopener" className="underline">
												{status.name}.limo
											</a>{" "}
											to try it.
										</div>
									)}
								</>
							)}
						</div>
					)}
				</div>

				{/* foot */}
				<div className="flex-none px-6 pt-3.5 pb-5 border-t border-border/70">
					{view === "confirm" && status && primary && !checking && (
						<>
							<button
								type="button"
								disabled={
									busy ||
									!status.canWrite ||
									!status.hasResolver ||
									destInvalid ||
									// Nothing to write: the planner produced no transaction, which
									// happens when the only offered action needs a destination that
									// has not been typed yet.
									confirmations === 0
								}
								onClick={() => run(primary.intent, primary.done)}
								className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-[15px] font-semibold py-3.5 rounded-md transition-colors"
							>
								{busy && <Loader2 className="w-4 h-4 animate-spin" />}
								{phase === "signing"
									? step && step.total > 1
										? `Confirm ${step.n} of ${step.total} in your wallet`
										: "Confirm in your wallet"
									: phase === "pending"
										? "Waiting for confirmation"
										: primary.label}
							</button>

							{/* Only ever shown for a resolver that cannot batch. */}
							{confirmations > 1 && !busy && (
								<p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
									This resolver cannot batch record changes, so this takes{" "}
									{confirmations} separate transactions.
								</p>
							)}

							{status.on && primary.label !== "Turn redirect off" && !busy && (
								<button
									type="button"
									onClick={() =>
										run(
											{ contenthash: "0x", url: null },
											`Done. Redirect turned off for ${status.name}.`,
										)
									}
									className="flex items-center justify-center gap-2 w-full text-muted-foreground hover:bg-secondary/60 hover:text-foreground text-sm font-medium py-2.5 rounded-md transition-colors mt-1"
								>
									Turn redirect off instead
								</button>
							)}
						</>
					)}
					{view === "account" && (
						<>
							<button
								type="button"
								onClick={() => setView("names")}
								className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground text-[15px] font-semibold py-3.5 rounded-md transition-colors"
							>
								Your names
							</button>
							<button
								type="button"
								onClick={async () => {
									await disconnect(provider);
									onDisconnected();
									setNames([]);
									setNamesError(null);
									setStatus(null);
									setView("wallets");
								}}
								className="flex items-center justify-center gap-2 w-full text-destructive hover:bg-destructive/10 text-sm font-medium py-2.5 rounded-md transition-colors mt-1"
							>
								Disconnect
							</button>
						</>
					)}

					{view === "how" && (
						<button
							type="button"
							onClick={() => setView(account ? "names" : "wallets")}
							className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground text-[15px] font-semibold py-3.5 rounded-md transition-colors"
						>
							{account ? "Choose a name" : "Connect a wallet"}
						</button>
					)}
					{/* The original showed a button here that set the view it was already
					    on, so it did nothing. On the first screen a hesitant holder sees,
					    an explanation is the useful thing to offer instead. */}
					{view === "wallets" && (
						<button
							type="button"
							onClick={() => setView("how")}
							className="flex items-center justify-center gap-2 w-full text-muted-foreground hover:bg-secondary/60 hover:text-foreground text-sm font-medium py-2.5 rounded-md transition-colors"
						>
							What connecting does
						</button>
					)}
					{view === "confirm" && (
						<button
							type="button"
							onClick={() => setView("names")}
							className="flex items-center justify-center gap-2 w-full text-muted-foreground hover:bg-secondary/60 text-sm font-medium py-2.5 rounded-md transition-colors mt-1"
						>
							<ArrowLeft className="w-4 h-4" />
							All names
						</button>
					)}
					{view === "names" && (
						<p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
							<Check className="w-3.5 h-3.5" />
							One transaction on, one off
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
