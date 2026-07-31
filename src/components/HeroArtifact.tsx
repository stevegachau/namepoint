import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Lock, RotateCw, Search } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * The redirect, performed.
 *
 * A visitor types an ENS name, it resolves, and the address bar lands on the
 * destination. The address bar carries the demonstration: a name goes in and a
 * different URL comes out.
 *
 * The destination is drawn as a stylised page rather than a screenshot. These are
 * real sites, and rendering an invented approximation of how they look would be a
 * fabrication; an obvious diagram carrying the real domain is not.
 */
type Example = {
	name: string;
	dest: string;
	/** Distinct signature per destination, so a switch is legible at a glance. */
	band: string;
	chip: string;
};

const EXAMPLES: Example[] = [
	{
		name: "trumpcoin.eth",
		dest: "gettrumpmemes.com",
		band: "from-amber-400/90 via-orange-500/80 to-red-500/70",
		chip: "bg-amber-500",
	},
	{
		name: "worldliberty.eth",
		dest: "worldlibertyfinancial.com",
		band: "from-sky-400/90 via-blue-500/80 to-indigo-500/70",
		chip: "bg-sky-500",
	},
];

type Phase = "typing" | "resolving" | "landed";

const TYPE_MS = 80;
const PAUSE_AFTER_TYPE = 380;
/* Resolution is a gateway lookup, not a wait. Long enough to register, no more. */
const RESOLVE_MS = 260;
const HOLD_MS = 5200;

export function HeroArtifact() {
	const still = useReducedMotion();
	const [idx, setIdx] = useState(0);
	const [phase, setPhase] = useState<Phase>("typing");
	const [typed, setTyped] = useState("");

	const ex = EXAMPLES[idx];

	/**
	 * The whole sequence is scheduled once, from one effect, against a single
	 * timeline, so phases cannot overlap and the index advances exactly once per
	 * cycle.
	 */
	useEffect(() => {
		if (still) {
			setTyped(EXAMPLES[idx].name);
			setPhase("landed");
			return;
		}

		const timers: number[] = [];
		const at = (ms: number, fn: () => void) => {
			timers.push(window.setTimeout(fn, ms));
		};

		const full = EXAMPLES[idx].name;
		setTyped("");
		setPhase("typing");

		for (let i = 1; i <= full.length; i++) {
			at(i * TYPE_MS, () => setTyped(full.slice(0, i)));
		}
		const typedAt = full.length * TYPE_MS + PAUSE_AFTER_TYPE;
		at(typedAt, () => setPhase("resolving"));
		at(typedAt + RESOLVE_MS, () => setPhase("landed"));
		at(typedAt + RESOLVE_MS + HOLD_MS, () =>
			setIdx((n) => (n + 1) % EXAMPLES.length),
		);

		return () => {
			for (const t of timers) window.clearTimeout(t);
		};
	}, [idx, still]);

	return (
		<div className="relative w-full max-w-4xl">
			<div className="border-beam shadow-float relative overflow-hidden rounded-xl border border-border/70 bg-card">
				{/* chrome */}
				<div className="flex items-center gap-3 border-b border-border/70 bg-secondary/40 px-4 py-3">
					<span aria-hidden="true" className="hidden flex-none gap-1.5 sm:flex">
						<span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
						<span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
						<span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
					</span>
					<span
						aria-hidden="true"
						className="hidden flex-none items-center gap-2 text-muted-foreground/50 md:flex"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						<ArrowRight className="h-3.5 w-3.5" />
						<RotateCw className="h-3 w-3" />
					</span>

					{/* The address bar carries the whole demonstration. */}
					<div className="relative min-w-0 flex-1 overflow-hidden rounded-md border border-border/60 bg-background/90">
						<div className="flex items-center gap-2 px-3 py-1.5">
							{phase === "landed" ? (
								<Lock className="h-3 w-3 flex-none text-ok" />
							) : phase === "resolving" ? (
								<RotateCw className="h-3 w-3 flex-none animate-spin text-primary" />
							) : (
								<Search className="h-3 w-3 flex-none text-muted-foreground" />
							)}

							<span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
								{phase === "landed" ? (
									<motion.span
										initial={still ? false : { opacity: 0, y: 5 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.3 }}
										className="flex items-baseline gap-1"
									>
										<span className="text-muted-foreground">https://</span>
										<span className="truncate">{ex.dest}</span>
									</motion.span>
								) : (
									<span>
										{typed}
										{phase === "typing" && (
											<span className="ml-px inline-block h-3 w-px animate-pulse bg-foreground align-middle" />
										)}
									</span>
								)}
							</span>

							{/* Real browsers say where a redirect came from. So does this. */}
							<AnimatePresence>
								{phase === "landed" && (
									<motion.span
										initial={still ? false : { opacity: 0, scale: 0.9 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.25, delay: 0.1 }}
										className="hidden flex-none items-center gap-1.5 rounded-full bg-primary/10 py-0.5 pl-2 pr-2.5 font-mono text-[0.6rem] text-primary sm:flex"
									>
										via {ex.name}
									</motion.span>
								)}
							</AnimatePresence>
						</div>

						{/* Load progress, as a browser would show it. */}
						<AnimatePresence>
							{phase === "resolving" && !still && (
								<motion.span
									className="absolute bottom-0 left-0 h-0.5 bg-primary"
									initial={{ width: "0%" }}
									animate={{ width: "100%" }}
									exit={{ opacity: 0 }}
									transition={{
										duration: RESOLVE_MS / 1000,
										ease: "easeInOut",
									}}
								/>
							)}
						</AnimatePresence>
					</div>
				</div>

				{/* viewport */}
				<div className="relative h-[17rem] bg-background sm:h-[20rem]">
					<AnimatePresence mode="wait">
						{phase === "landed" ? (
							<motion.div
								key={`page-${idx}`}
								initial={still ? false : { opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={still ? undefined : { opacity: 0 }}
								transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
								className="absolute inset-0 flex flex-col"
							>
								{/* the destination's own header */}
								<div className="flex flex-none items-center justify-between gap-4 border-b border-border/60 px-5 py-3">
									<span className="flex min-w-0 items-center gap-2">
										<span
											className={`h-2 w-2 flex-none rounded-full ${ex.chip}`}
										/>
										<span className="truncate font-display text-[0.8rem] font-semibold tracking-tight">
											{ex.dest}
										</span>
									</span>
									<span
										aria-hidden="true"
										className="hidden flex-none gap-3 sm:flex"
									>
										{[40, 32, 48].map((w) => (
											<span
												key={w}
												className="h-1.5 rounded-full bg-foreground/10"
												style={{ width: `${w}px` }}
											/>
										))}
									</span>
								</div>

								<div className="relative flex-1 overflow-hidden p-5 sm:p-6">
									<div
										className={`h-24 w-full rounded-lg bg-gradient-to-br sm:h-28 ${ex.band}`}
									/>
									<div className="mt-5 space-y-2.5">
										<div className="h-3 w-1/2 rounded-full bg-foreground/[0.12]" />
										<div className="h-3 w-1/3 rounded-full bg-foreground/[0.07]" />
									</div>
									<div className="mt-5 grid grid-cols-3 gap-3">
										{[0, 1, 2].map((n) => (
											<div
												key={n}
												className="h-12 rounded-lg border border-border/60 bg-card sm:h-14"
											/>
										))}
									</div>
								</div>
							</motion.div>
						) : (
							<motion.div
								key="blank"
								initial={still ? false : { opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={still ? undefined : { opacity: 0 }}
								transition={{ duration: 0.2 }}
								className="absolute inset-0"
							/>
						)}
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
}
