import { LightRays } from "@/components/LightRays";

/**
 * Decorative, non-interactive backdrop for the hero: light rays falling from
 * above the fold over a dot-grid substrate, with fine grain on top.
 *
 * No blurred colour blobs. Those read as generated ambience and carry no
 * meaning; the rays at least describe a light source.
 */
export function AmbientBackground() {
	return (
		<div
			aria-hidden="true"
			className="bg-dotgrid grain pointer-events-none absolute inset-0 -z-10 overflow-hidden"
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

			{/* Vignette to settle the edges into the canvas. Sits under the rays so
			    it does not wash their outer tips out. */}
			<div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_50%_-10%,transparent_60%,hsl(var(--background))_100%)]" />
		</div>
	);
}
