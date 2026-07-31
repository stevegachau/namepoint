import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Link2, Search, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Three steps as tabs that advance on a timer. Clicking a tab takes over from
 * the timer, and hovering the section pauses it.
 *
 * Each panel mirrors the corresponding NameSheet view, so the section shows the
 * real screens rather than describing them. The steps are numbered because the
 * order carries information: authorisation is checked before anything is signed.
 */
const STEPS = [
	{
		icon: Search,
		title: "Select a name",
		body: "Connect, and the app lists the names your wallet manages. It simulates the write onchain first, so a name you are not authorised to change is never offered.",
	},
	{
		icon: Link2,
		title: "Set the destination",
		body: "Enter the URL the name should forward to. It is saved to the url record, which the redirect reads on every request, so you can point the name elsewhere later without touching the redirect itself.",
	},
	{
		icon: Wallet,
		title: "Sign once",
		body: "Both records are batched into a single call to the resolver already set on your name. One signature, no approvals, and nothing delegated.",
	},
];

const STEP_MS = 4200;

/* ---------------------------- the real screens ---------------------------- */

const NAMES = ["vitalik.eth", "trumpcoin.eth", "worldliberty.eth"];

function PanelSelect() {
	return (
		<div className="p-5">
			<div className="flex items-center gap-2.5 rounded-full border border-border/70 bg-secondary/50 px-4 py-2.5">
				<Search className="h-3.5 w-3.5 flex-none text-muted-foreground" />
				<span className="font-mono text-xs text-muted-foreground">
					search your names
				</span>
			</div>
			<div className="mt-3 space-y-1">
				{NAMES.map((n, i) => (
					<div
						key={n}
						className={`flex items-center justify-between gap-3 rounded-md px-3.5 py-3 ${
							i === 1 ? "bg-primary/10" : ""
						}`}
					>
						<span
							className={`font-mono text-[0.8rem] ${
								i === 1
									? "font-medium text-foreground"
									: "text-muted-foreground"
							}`}
						>
							{n}
						</span>
						{i === 1 ? (
							<span className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-primary">
								<Check className="h-3 w-3" />
								can write
							</span>
						) : (
							<ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
						)}
					</div>
				))}
			</div>
		</div>
	);
}

function PanelDestination() {
	return (
		<div className="p-5">
			{[
				["Resolver", "0x4976…Ba41", false],
				["Redirect", "off", false],
				["This wallet", "can write", true],
			].map(([k, v, ok]) => (
				<div
					key={String(k)}
					className="flex items-baseline justify-between gap-3 border-b border-border/60 py-2.5 text-[0.8rem] last:border-0"
				>
					<span className="text-muted-foreground">{k}</span>
					<span
						className={`font-mono ${ok ? "text-primary" : "text-muted-foreground"}`}
					>
						{v}
					</span>
				</div>
			))}

			<div className="mt-4">
				<span className="flex items-center gap-2 text-[0.8rem] font-semibold">
					<Link2 className="h-3.5 w-3.5 flex-none text-primary" />
					Destination
				</span>
				<div className="mt-2.5 flex items-center rounded-md border border-ring bg-background px-3.5 py-2.5">
					<span className="truncate font-mono text-xs text-foreground">
						https://gettrumpmemes.com
					</span>
					<motion.span
						aria-hidden="true"
						className="ml-px h-3.5 w-px flex-none bg-foreground"
						animate={{ opacity: [1, 0, 1] }}
						transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY }}
					/>
				</div>
				<p className="mt-2 font-mono text-[0.7rem] text-muted-foreground">
					url record on trumpcoin.eth
				</p>
			</div>
		</div>
	);
}

function PanelSign() {
	return (
		<div className="p-5">
			<div className="rounded-lg border border-border/70 bg-secondary/30 p-4">
				<span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
					one transaction
				</span>
				<p className="mt-2.5 font-mono text-[0.8rem] text-foreground">
					multicall
				</p>
				<div className="mt-3 space-y-1.5 border-l-2 border-primary pl-3">
					<p className="font-mono text-[0.72rem] text-primary">
						+ setText(node, "url", …)
					</p>
					<p className="font-mono text-[0.72rem] text-primary">
						+ setContenthash(node, …)
					</p>
				</div>
			</div>
			<div className="mt-3 flex items-baseline justify-between gap-3 text-[0.8rem]">
				<span className="text-muted-foreground">Approvals</span>
				<span className="font-mono text-primary">none</span>
			</div>
			<div className="mt-4 flex items-center justify-center rounded-md bg-primary py-3 text-[0.8rem] font-semibold text-primary-foreground">
				Confirm in your wallet
			</div>
		</div>
	);
}

const PANELS = [PanelSelect, PanelDestination, PanelSign];

/* -------------------------------------------------------------------------- */

export function HowItWorks() {
	const still = useReducedMotion();
	const [active, setActive] = useState(0);
	const [paused, setPaused] = useState(false);
	const Body = PANELS[active];

	useEffect(() => {
		if (still || paused) return;
		const t = window.setTimeout(
			() => setActive((n) => (n + 1) % STEPS.length),
			STEP_MS,
		);
		return () => window.clearTimeout(t);
	}, [active, paused, still]);

	return (
		<section id="how" className="w-full scroll-mt-24 border-t border-border/60">
			<div className="container mx-auto py-20 md:py-28">
				<div>
					<div className="flex flex-wrap items-end justify-between gap-6">
						<div>
							<h2 className="mt-6 max-w-xl text-[2.1rem] font-medium leading-[1.08] tracking-tighter md:text-[2.9rem]">
								Three steps, one signature
							</h2>
						</div>
					</div>
				</div>

				<div>
					{/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: pausing on hover is a convenience, every tab stays operable */}
					<div
						className="mt-12 grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
						onMouseEnter={() => setPaused(true)}
						onMouseLeave={() => setPaused(false)}
					>
						<div className="lg:order-2">
							<div
								role="tablist"
								aria-label="How it works"
								className="border-t border-border"
							>
								{STEPS.map((s, i) => {
									const on = i === active;
									return (
										<button
											key={s.title}
											type="button"
											role="tab"
											aria-selected={on}
											onClick={() => setActive(i)}
											className="group relative block w-full border-b border-border/60 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										>
											<span className="flex items-baseline gap-4">
												<span
													className={`font-mono text-[0.7rem] tabular-nums transition-colors ${
														on ? "text-primary" : "text-muted-foreground/50"
													}`}
												>
													{String(i + 1).padStart(2, "0")}
												</span>
												<span
													className={`text-lg tracking-tight transition-colors md:text-xl ${
														on
															? "text-foreground"
															: "text-foreground/40 group-hover:text-foreground/70"
													}`}
												>
													{s.title}
												</span>
											</span>

											<AnimatePresence initial={false}>
												{on && (
													<motion.div
														key="body"
														initial={still ? false : { height: 0, opacity: 0 }}
														animate={{ height: "auto", opacity: 1 }}
														exit={still ? undefined : { height: 0, opacity: 0 }}
														transition={{
															duration: 0.35,
															ease: [0.22, 1, 0.36, 1],
														}}
														className="overflow-hidden"
													>
														<p className="max-w-lg pl-[2.4rem] pr-4 pt-3 text-sm leading-relaxed text-muted-foreground">
															{s.body}
														</p>
													</motion.div>
												)}
											</AnimatePresence>

											{/* Time remaining on this step, as a rule along the row. */}
											{on && !still && (
												<motion.span
													key={`bar-${active}-${paused}`}
													aria-hidden="true"
													className="absolute -bottom-px left-0 h-px bg-primary"
													initial={{ width: paused ? "100%" : "0%" }}
													animate={{ width: "100%" }}
													transition={{
														duration: paused ? 0 : STEP_MS / 1000,
														ease: "linear",
													}}
												/>
											)}
										</button>
									);
								})}
							</div>
						</div>

						<div className="lg:order-1">
							<div className="shadow-soft overflow-hidden rounded-md border border-border bg-card">
								<div className="flex items-center justify-between gap-3 border-b border-border/70 bg-secondary/40 px-5 py-3">
									<span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
										{STEPS[active].title}
									</span>
									<span className="font-mono text-[0.65rem] tabular-nums text-muted-foreground">
										{String(active + 1).padStart(2, "0")} / 03
									</span>
								</div>
								<AnimatePresence mode="wait">
									<motion.div
										key={active}
										initial={still ? false : { opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										exit={still ? undefined : { opacity: 0, y: -8 }}
										transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
									>
										<Body />
									</motion.div>
								</AnimatePresence>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
