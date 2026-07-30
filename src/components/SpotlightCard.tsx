import { type ReactNode, useRef, useState } from "react";

type Props = {
	children: ReactNode;
	className?: string;
};

/**
 * A surface that lights where the cursor is.
 *
 * Pointer position is written to a local radial gradient rather than to state on
 * every frame of a parent, so hovering one card never re-renders its neighbours.
 * Purely decorative: the layer is aria-hidden and nothing depends on hover to be
 * readable or reachable.
 */
export function SpotlightCard({ children, className = "" }: Props) {
	const ref = useRef<HTMLDivElement>(null);
	const [pos, setPos] = useState({ x: 0, y: 0 });
	const [lit, setLit] = useState(false);

	return (
		<div
			ref={ref}
			onMouseMove={(e) => {
				const r = ref.current?.getBoundingClientRect();
				if (!r) return;
				setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
			}}
			onMouseEnter={() => setLit(true)}
			onMouseLeave={() => setLit(false)}
			className={`group relative overflow-hidden ${className}`}
		>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 transition-opacity duration-300"
				style={{
					opacity: lit ? 1 : 0,
					background: `radial-gradient(340px circle at ${pos.x}px ${pos.y}px, hsl(var(--primary) / 0.10), transparent 68%)`,
				}}
			/>
			<div className="relative">{children}</div>
		</div>
	);
}
