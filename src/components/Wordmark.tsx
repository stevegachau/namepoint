import { Mark } from "@/components/Mark";

/**
 * The wordmark: the mark, then the name.
 *
 * Sized in `em` against the wordmark's own type size, so the mark keeps its
 * relationship to the text at every scale instead of being pinned to a pixel
 * height that only looks right at one of them. 1.05em puts the mark a little
 * above the cap height of Space Grotesk, which is where a mark should sit.
 *
 * No tinted rounded tile any more. That container was what made the old glyph
 * read as an interface affordance rather than a logo.
 */
export function Wordmark({ size = "md" }: { size?: "sm" | "md" }) {
	const text = size === "sm" ? "text-base" : "text-lg";

	return (
		<span className={`flex items-center gap-[0.5em] ${text}`}>
			<Mark className="h-[1.05em] w-auto flex-none text-primary transition-transform duration-500 group-hover:-translate-y-px" />
			<span className="font-display font-semibold leading-none tracking-tight">
				namepoint
			</span>
		</span>
	);
}
