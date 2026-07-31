/**
 * The namepoint mark.
 *
 * A geometric lowercase "n" carrying the product's one gesture: the left stem is
 * the name, the arch is the hop, and the right leg stops short of a solid disc,
 * which is the point it lands on. The gap before the disc is the whole idea, so
 * it is deliberate and should not be closed.
 *
 * Drawn at a logo weight rather than an interface weight — a heavy stroke against
 * a solid counterform — so it reads as a mark and not as another line icon. The
 * stem and the disc share a baseline at y=41.5; the geometry only looks right if
 * that stays true.
 */
export function Mark({ className = "" }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 48 48"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
			focusable="false"
		>
			<path
				d="M14 38V20a10 10 0 0 1 20 0v6"
				stroke="currentColor"
				strokeWidth={7}
				strokeLinecap="round"
			/>
			<circle cx="34" cy="36.5" r="5" fill="currentColor" />
		</svg>
	);
}
