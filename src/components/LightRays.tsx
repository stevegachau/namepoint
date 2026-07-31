import type { CSSProperties } from "react";

type Props = {
	/** How many rays to fan out. */
	count?: number;
	/** Base colour of each ray. Defaults to the accent, so it themes itself. */
	color?: string;
	/** Blur radius in pixels. The rays are only readable once heavily blurred. */
	blur?: number;
	/** Peak opacity, 0 to 1. */
	opacity?: number;
	/** Seconds for one drift cycle. */
	speed?: number;
	/** Ray length, as any CSS length. */
	length?: string | number;
	className?: string;
	style?: CSSProperties;
};

/**
 * Light rays fanning down from above the fold.
 *
 * Built from blurred gradients rather than WebGL: a handful of elements the
 * compositor can transform on its own, which costs nothing next to a shader and
 * keeps the page free of a canvas that would need a context and a resize
 * observer. Rays fan symmetrically about the vertical and drift out of phase, so
 * the field never visibly loops.
 *
 * Decorative, so it is hidden from assistive tech, and the drift is frozen by
 * the reduced-motion rule in index.css.
 */
export function LightRays({
	count = 7,
	color = "hsl(var(--primary) / 0.42)",
	blur = 36,
	opacity = 0.65,
	speed = 14,
	length = "70vh",
	className = "",
	style,
}: Props) {
	const spread = 74; // total degrees the fan covers
	const step = count > 1 ? spread / (count - 1) : 0;

	return (
		<div
			aria-hidden="true"
			className={`pointer-events-none absolute inset-x-0 top-0 overflow-hidden ${className}`}
			style={{ height: length, filter: `blur(${blur}px)`, ...style }}
		>
			{Array.from({ length: count }, (_, i) => {
				const rot = -spread / 2 + i * step;
				// Rays away from the centre read as further off, so they run shorter
				// and fainter. A flat fan looks like a printed sunburst.
				const falloff = 1 - Math.abs(rot) / (spread * 0.9);
				return (
					<span
						key={rot}
						className="absolute left-1/2 top-0 origin-top rounded-full"
						style={
							{
								width: `${2.2 + falloff * 2.4}vw`,
								height: "100%",
								background: `linear-gradient(to bottom, ${color}, transparent 78%)`,
								"--ray-rot": `${rot}deg`,
								"--ray-max": opacity * (0.55 + falloff * 0.45),
								animation: `ray-drift ${speed + i * 1.7}s ease-in-out ${i * -2.3}s infinite`,
							} as CSSProperties
						}
					/>
				);
			})}
		</div>
	);
}
