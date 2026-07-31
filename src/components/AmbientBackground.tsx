import { LightRays } from "@/components/LightRays";

/**
 * Decorative, non-interactive backdrop for the hero: light rays falling from
 * above the fold, a dot-grid substrate and one slow bloom behind the headline.
 * Hidden from assistive tech and frozen under prefers-reduced-motion.
 * Built from CSS gradients, so the page ships no video or image assets.
 */
export function AmbientBackground() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-dotgrid"
		>
			{/* Pulled above the section so the rays fall from off-screen rather
			    than starting in the middle of the hero. */}
			<LightRays
				length="86vh"
				opacity={0.9}
				blur={26}
				count={9}
				className="-top-32"
			/>

			{/* One bloom behind the headline, to seat the rays on something. */}
			<div
				className="aurora left-1/2 top-[-16%] h-[32rem] w-[38rem] -translate-x-1/2 animate-aurora bg-primary/20"
				style={{ animationDelay: "0s" }}
			/>

			{/* Vignette to settle the edges into the canvas. Sits under the rays so
			    it does not wash their outer tips out. */}
			<div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_50%_-10%,transparent_60%,hsl(var(--background))_100%)]" />
		</div>
	);
}
