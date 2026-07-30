/**
 * Decorative, non-interactive backdrop for the hero: a faint engineered
 * dot-grid plus two slow blue light blooms. Purely atmospheric — hidden from
 * assistive tech and frozen under prefers-reduced-motion (see index.css).
 * This replaces the original app's 2.1MB background video, which cost more to
 * load than it contributed and read as a stock flourish rather than a product.
 */
export function AmbientBackground() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-dotgrid"
		>
			{/* Top-centre bloom, drifting. */}
			<div
				className="aurora left-1/2 top-[-14%] h-[34rem] w-[34rem] -translate-x-1/2 animate-aurora bg-primary/25"
				style={{ animationDelay: "0s" }}
			/>
			{/* Lower-left secondary bloom, drifting on an offset. */}
			<div
				className="aurora left-[4%] top-[46%] h-[24rem] w-[24rem] animate-aurora bg-accent/50"
				style={{ animationDelay: "-7s" }}
			/>
			{/* Vignette to settle the edges into the canvas. */}
			<div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,transparent_55%,hsl(var(--background))_100%)]" />
		</div>
	);
}
