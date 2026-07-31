import type { LucideIcon } from "lucide-react";

/**
 * Section label as a tinted chip with an icon.
 *
 * A row of small grey capitals is what made every section open the same way and
 * read as a document. The icon gives each section a face you can find again when
 * scrolling back.
 */
export function Eyebrow({
	icon: Icon,
	children,
}: {
	icon: LucideIcon;
	children: React.ReactNode;
}) {
	return (
		<span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] py-1.5 pl-2.5 pr-3.5">
			<span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-primary/15">
				<Icon className="h-3 w-3 text-primary" strokeWidth={2.5} />
			</span>
			<span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-primary">
				{children}
			</span>
		</span>
	);
}
