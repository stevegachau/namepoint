import { useInView, useReducedMotion } from "framer-motion";
import {
	Children,
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";

/**
 * Sequenced terminal output: each line starts when the previous one finishes.
 *
 * Written as source rather than pulled from a registry, because the project
 * loads nothing from a CDN. The MacOS window chrome the original ships with is
 * deliberately not reproduced — hallmark gate 47 bans hand-drawn code-window
 * frames, and the panel this sits in already provides the framing.
 *
 * Height is reserved by rendering the finished output once, invisibly, in the
 * same grid cell as the animating copy. Without that the block grows line by
 * line as it types and pushes everything below it down the page.
 */
const CHAR_MS = 55;
const FADE_MS = 300;
const LINE_GAP_MS = 90;

type ChildProps = {
	children?: ReactNode;
	className?: string;
	/** Injected by Terminal. */
	delay?: number;
	run?: boolean;
	instant?: boolean;
};

export function TypingAnimation({
	children,
	className = "",
	delay = 0,
	run = false,
	instant = false,
}: ChildProps) {
	const text = String(children ?? "");
	const [count, setCount] = useState(0);

	useEffect(() => {
		if (instant || !run) return;
		let frame = 0;
		let start = 0;
		const tick = (ts: number) => {
			if (!start) start = ts;
			const elapsed = ts - start - delay;
			const chars = Math.max(
				0,
				Math.min(text.length, Math.floor(elapsed / CHAR_MS)),
			);
			setCount(chars);
			if (chars < text.length) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [run, delay, text, instant]);

	const shown = instant ? text : text.slice(0, count);
	const typing = !instant && run && count < text.length;

	return (
		<span className={`block whitespace-pre ${className}`}>
			{shown}
			{typing && (
				<span
					aria-hidden="true"
					className="ml-px inline-block h-[0.9em] w-px animate-pulse bg-current align-middle"
				/>
			)}
		</span>
	);
}

export function AnimatedSpan({
	children,
	className = "",
	delay = 0,
	run = false,
	instant = false,
}: ChildProps) {
	const [on, setOn] = useState(false);

	useEffect(() => {
		if (instant || !run) return;
		const t = window.setTimeout(() => setOn(true), delay);
		return () => window.clearTimeout(t);
	}, [run, delay, instant]);

	return (
		<span
			className={`block whitespace-pre transition-opacity duration-300 ${
				instant || on ? "opacity-100" : "opacity-0"
			} ${className}`}
		>
			{children}
		</span>
	);
}

type TerminalProps = {
	children: ReactNode;
	className?: string;
	/** Hold until the block is scrolled into view. */
	startOnView?: boolean;
};

export function Terminal({
	children,
	className = "",
	startOnView = true,
}: TerminalProps) {
	const ref = useRef<HTMLDivElement>(null);
	const inView = useInView(ref, { once: true, margin: "-80px" });
	const still = useReducedMotion();
	const run = still ? false : startOnView ? inView : true;

	/** Walk the children once, accumulating each line's start time. */
	const sequence = (instant: boolean) => {
		let at = 0;
		return Children.map(children, (child) => {
			if (!isValidElement(child)) return child;
			const el = child as ReactElement<ChildProps>;
			const delay = at;
			const text = String(el.props.children ?? "");
			at +=
				el.type === TypingAnimation
					? text.length * CHAR_MS + LINE_GAP_MS
					: FADE_MS;
			return cloneElement(el, { delay, run, instant });
		});
	};

	return (
		<div ref={ref} className={`grid ${className}`}>
			{/* Sets the final height on the first frame. */}
			<div aria-hidden="true" className="invisible col-start-1 row-start-1">
				{sequence(true)}
			</div>
			<div className="col-start-1 row-start-1">{sequence(!!still)}</div>
		</div>
	);
}
