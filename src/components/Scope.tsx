import { ShieldCheck } from "lucide-react";
import { Eyebrow } from "@/components/Eyebrow";
import { Reveal } from "@/components/Reveal";

/**
 * The reach of the single call the app makes, in three registers: what changes,
 * what is left alone, and what the transaction never touches.
 *
 * Set as ruled rows rather than cards, because the subject is a record table.
 */
type Row = { key: string; value: string; tone?: "write" | "keep" | "never" };

const GROUPS: { label: string; note: string; rows: Row[] }[] = [
	{
		label: "Changes",
		note: "Two records, both on your own resolver.",
		rows: [
			{ key: "url", value: "your destination", tone: "write" },
			{ key: "contenthash", value: "the redirect", tone: "write" },
		],
	},
	{
		label: "Untouched",
		note: "Left exactly as they are.",
		rows: [
			{ key: "registrant", value: "yours", tone: "keep" },
			{ key: "manager", value: "yours", tone: "keep" },
			{ key: "resolver", value: "the one already set", tone: "keep" },
			{ key: "addr", value: "unchanged", tone: "keep" },
			{ key: "avatar", value: "unchanged", tone: "keep" },
		],
	},
	{
		label: "Out of reach",
		note: "Not in the transaction at all.",
		rows: [
			{ key: "token approvals", value: "none requested", tone: "never" },
			{ key: "spend allowance", value: "none", tone: "never" },
			{ key: "name transfer", value: "not possible", tone: "never" },
			{ key: "keys held by namepoint", value: "none", tone: "never" },
		],
	},
];

export function Scope() {
	return (
		<section
			id="scope"
			className="w-full scroll-mt-24 border-t border-border/60"
		>
			<div className="container mx-auto py-20 md:py-28">
				<div className="grid gap-12 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-20">
					<Reveal>
						<div className="lg:sticky lg:top-28">
							<Eyebrow icon={ShieldCheck}>Scope</Eyebrow>
							<h2 className="mt-6 text-[2.1rem] font-medium leading-[1.08] tracking-tighter md:text-[2.9rem]">
								What one transaction touches.
							</h2>
							<p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
								This is the whole transaction. If something is not in it, the
								app has no way to do it.
							</p>

							{/* The call itself, lit at the edge because it is the claim. */}
							<div className="border-beam mt-8 rounded-lg border border-border/70 bg-card p-4">
								<pre className="overflow-x-auto font-mono text-[0.72rem] leading-relaxed text-muted-foreground">
									<code>
										{`resolver.multicall([
  `}
										<span className="text-primary">
											setText(node, &quot;url&quot;, …)
										</span>
										{`,
  `}
										<span className="text-primary">
											setContenthash(node, …)
										</span>
										{`,
])`}
									</code>
								</pre>
							</div>
						</div>
					</Reveal>

					<div>
						{GROUPS.map((g, gi) => (
							<Reveal key={g.label} delay={gi * 0.07}>
								<div className={gi > 0 ? "mt-12" : ""}>
									<div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border pb-3">
										<h3 className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-foreground">
											{g.label}
										</h3>
										<p className="text-[0.8rem] text-muted-foreground">
											{g.note}
										</p>
									</div>

									<dl>
										{g.rows.map((r) => (
											<div
												key={r.key}
												className="flex items-baseline justify-between gap-6 border-b border-border/50 py-3.5"
											>
												<dt
													className={`font-mono text-sm ${
														r.tone === "write"
															? "font-medium text-foreground"
															: "text-muted-foreground"
													}`}
												>
													{r.key}
												</dt>
												<dd
													className={`text-right font-mono text-sm ${
														r.tone === "write"
															? "text-primary"
															: r.tone === "never"
																? "text-muted-foreground/60"
																: "text-muted-foreground/70"
													}`}
												>
													{r.value}
												</dd>
											</div>
										))}
									</dl>
								</div>
							</Reveal>
						))}

						<Reveal delay={0.24}>
							<p className="mt-10 max-w-xl text-sm leading-relaxed text-muted-foreground">
								The destination lives in the url record, so pointing the name
								somewhere else later is one transaction on that record alone,
								here or in any ENS manager. The redirect stays as it is, and if
								this site went offline your name would carry on working.
							</p>
						</Reveal>
					</div>
				</div>
			</div>
		</section>
	);
}
