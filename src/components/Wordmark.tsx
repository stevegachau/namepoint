import { Mark } from "@/components/Mark";

/**
 * The wordmark: the mark, then the name.
 *
 * The mark is no longer set in a tinted rounded tile. That treatment is what
 * made it read as an interface affordance rather than a logo, and a mark this
 * solid does not need a container to hold it.
 */
export function Wordmark({ size = "md" }: { size?: "sm" | "md" }) {
	const glyph = size === "sm" ? "h-6 w-6" : "h-7 w-7";
	const text = size === "sm" ? "text-base" : "text-lg";

	return (
		<span className="flex items-center gap-2.5">
			<Mark
				className={`${glyph} flex-none text-primary transition-transform duration-500 group-hover:-translate-y-px`}
			/>
			<span className={`font-display ${text} font-semibold tracking-tight`}>
				namepoint
			</span>
		</span>
	);
}
