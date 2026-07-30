import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
	children: ReactNode;
	/** Stagger within a group, in seconds. */
	delay?: number;
	className?: string;
};

/**
 * Rise-and-fade on first scroll into view.
 *
 * The CSS in index.css freezes declarative animation under
 * prefers-reduced-motion, but framer-motion drives transforms from JS and
 * ignores that, so the preference is honoured here explicitly: no motion
 * wrapper at all, and the content renders in its final position.
 */
export function Reveal({ children, delay = 0, className }: Props) {
	const still = useReducedMotion();
	if (still) return <div className={className}>{children}</div>;

	return (
		<motion.div
			className={className}
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-70px" }}
			transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
		>
			{children}
		</motion.div>
	);
}
