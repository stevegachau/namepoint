/**
 * The template's signature device was a market ticker of usage metrics. Those
 * numbers were invented for a demo, and inventing traction for a real product
 * whose whole pitch is "you can verify this yourself" would undercut the thing
 * the page is trying to earn. So the mechanic is kept and the payload swapped:
 * this tape carries the product's actual specification. Every line is a claim a
 * reader can check against the contract call the app makes.
 *
 * Lines marked `good` are the reassurances, and get the accent colour.
 */
type Spec = { key: string; value: string; good?: boolean };

const SPECS: Spec[] = [
	{ key: "records written", value: "contenthash + url" },
	{ key: "standard", value: "ENSIP-5 / ENSIP-7" },
	{ key: "transactions", value: "1 on / 1 off", good: true },
	{ key: "resolver", value: "yours, unchanged" },
	{ key: "custody", value: "none", good: true },
	{ key: "approvals", value: "none", good: true },
	{ key: "fee", value: "none", good: true },
	{ key: "network", value: "Ethereum mainnet" },
	{ key: "gateway", value: "eth.limo" },
	{ key: "licence", value: "MIT" },
];

function TapeRow() {
	return (
		<>
			{SPECS.map((s) => (
				<span
					key={s.key}
					className="inline-flex items-center gap-2 px-5 font-mono text-xs"
				>
					<span className="uppercase tracking-wider text-muted-foreground">
						{s.key}
					</span>
					<span
						className={
							s.good ? "font-medium text-primary" : "font-medium text-foreground"
						}
					>
						{s.value}
					</span>
					<span aria-hidden="true" className="pl-3 text-border">
						&middot;
					</span>
				</span>
			))}
		</>
	);
}

/** Infinite marquee. The row is duplicated so the loop is seamless. */
export function SpecTape() {
	return (
		<div className="w-full border-b border-border/70 bg-card/40">
			<div className="tape-mask container mx-auto overflow-hidden py-2.5">
				{/* One row is enough for a screen reader; the clone is decorative. */}
				<div className="flex w-max animate-tape items-center whitespace-nowrap">
					<TapeRow />
					<span aria-hidden="true" className="flex items-center">
						<TapeRow />
					</span>
				</div>
			</div>
		</div>
	);
}
