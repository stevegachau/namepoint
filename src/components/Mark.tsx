/**
 * The namepoint mark.
 *
 * A geometric lowercase "n" carrying the product's one gesture: the left stem is
 * the name, the arch is the hop, and the right leg stops half way down to a solid
 * disc — the point it lands on. The gap is the idea, so it stays.
 *
 * Constraints that hold the drawing together, in the 48-unit space below:
 *
 *   arch   elliptical, 12.5 x 11. Flatter than a semicircle, which keeps the
 *          aspect near square and the counter open at favicon size.
 *   disc   exactly one stem wide, so it reads as a period and not a bullet.
 *   leg    half the stem's visible length. Without a leg the mark reads as "r".
 *   base   the stem and the disc share a baseline at y=39.75.
 *
 * viewBox is cropped to the glyph, so callers size the mark and not padding.
 */
export function Mark({ className = "" }: { className?: string }) {
	return (
		<svg
			viewBox="7 4.5 34 36"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
			focusable="false"
		>
			<path
				d="M11.5 36V20a12.5 11 0 0 1 25 0v6.25"
				stroke="currentColor"
				strokeWidth={7.5}
				strokeLinecap="round"
			/>
			<circle cx="36.5" cy="36" r="3.75" fill="currentColor" />
		</svg>
	);
}
