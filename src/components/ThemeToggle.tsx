import { Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

const STORAGE_KEY = "namepoint-theme";

/** Light unless explicitly set to dark. Must match the script in index.html. */
function getInitialTheme(): Theme {
	if (typeof window === "undefined") return "light";
	return window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
}

type VT = { ready: Promise<void>; finished: Promise<void> };
type DocWithVT = Document & {
	startViewTransition?: (cb: () => void) => VT;
};

/**
 * Persisted light/dark switch. The swap itself is a circular wipe from the
 * button, driven by the real View Transitions API rather than a class toggle
 * with a CSS transition: the browser snapshots both states and clip-paths the
 * new one, which is the only way to reveal the whole page through one shape
 * instead of cross-fading every element that happens to have a transition.
 *
 * Falls back to an instant swap on browsers without the API (Firefox at time
 * of writing) and when the visitor has asked for reduced motion.
 */
export function ThemeToggle() {
	const [theme, setTheme] = useState<Theme>(getInitialTheme);
	const btnRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		window.localStorage.setItem(STORAGE_KEY, theme);
	}, [theme]);

	const next = theme === "dark" ? "light" : "dark";

	function apply(t: Theme) {
		document.documentElement.classList.toggle("dark", t === "dark");
	}

	async function toggle() {
		const doc = document as DocWithVT;
		const reduce = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		if (!doc.startViewTransition || reduce) {
			apply(next);
			setTheme(next);
			return;
		}

		const rect = btnRef.current?.getBoundingClientRect();
		const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
		const y = rect ? rect.top + rect.height / 2 : 0;
		const radius = Math.hypot(
			Math.max(x, window.innerWidth - x),
			Math.max(y, window.innerHeight - y),
		);

		const transition = doc.startViewTransition(() => {
			apply(next);
			setTheme(next);
		});

		try {
			await transition.ready;
		} catch {
			return;
		}

		document.documentElement.animate(
			{
				clipPath: [
					`circle(0px at ${x}px ${y}px)`,
					`circle(${radius}px at ${x}px ${y}px)`,
				],
			},
			{
				duration: 500,
				easing: "ease-in-out",
				pseudoElement: "::view-transition-new(root)",
			},
		);
	}

	return (
		<Button
			ref={btnRef}
			variant="ghost"
			size="icon"
			aria-label={`Switch to ${next} mode`}
			title={`Switch to ${next} mode`}
			onClick={toggle}
			className="relative rounded-full border border-border/70 text-muted-foreground hover:text-foreground"
		>
			<Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" />
			<Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100" />
		</Button>
	);
}
