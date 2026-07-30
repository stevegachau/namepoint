import { CornerDownRight } from "lucide-react";

/**
 * The wordmark. The glyph is a redirect arrow — the one gesture the whole
 * product performs — set in a tile that echoes the template's mark treatment.
 * Built from a lucide icon, so the project ships no image assets.
 */
export function Wordmark({ size = "md" }: { size?: "sm" | "md" }) {
	const tile = size === "sm" ? "h-7 w-7" : "h-9 w-9";
	const glyph = size === "sm" ? "h-4 w-4" : "h-[1.15rem] w-[1.15rem]";
	const text = size === "sm" ? "text-base" : "text-lg";

	return (
		<span className="flex items-center gap-2.5">
			<span
				className={`relative grid ${tile} flex-none place-items-center rounded-lg bg-primary/10 ring-1 ring-inset ring-primary/30`}
			>
				<CornerDownRight
					className={`${glyph} text-primary transition-transform duration-500 group-hover:translate-x-0.5`}
					strokeWidth={2.5}
				/>
			</span>
			<span className={`font-display ${text} font-semibold tracking-tight`}>
				namepoint
			</span>
		</span>
	);
}
