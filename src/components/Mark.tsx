/**
 * The namepoint mark.
 *
 * A geometric lowercase "n" carrying the product's one gesture: the left stem is
 * the name, the arch is the hop, and the right leg stops half way down to a solid
 * disc — the point it lands on. The gap is the idea, so it stays.
 *
 * Proportions, all in the 48-unit space below, chosen against renders rather than
 * by eye:
 *
 *   arch      elliptical, 12.5 x 11. A true semicircle made the mark narrow
 *             (0.77 aspect) and closed the counter up; flattening it gives a
 *             near-square 0.94 and a counter 2.33x the stem, which is what keeps
 *             it open at favicon size.
 *   disc      exactly one stem wide, so it reads as a period. At 1.4x it read as
 *             a bullet and pulled the eye off the letterform.
 *   leg       half the stem's visible length, so the break reads as deliberate
 *             rather than as a stub. Removing the leg entirely turns the mark
 *             into an "r".
 *
 * The stem and the disc share a baseline at y=39.75; the geometry only works if
 * that stays true. viewBox is cropped to the glyph so callers size the mark
 * itself, not a box of padding around it.
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
