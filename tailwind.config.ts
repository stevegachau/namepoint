import type { Config } from "tailwindcss";

// The template's shadcn Tailwind theme, kept structurally identical so every
// shadcn class name still resolves. Changes from the template:
//   - `spektr-cyan` renamed to `brand` (the accent is ENS blue now)
//   - `ok` / `warn` added for the redirect flow's outcome states
//   - `tape` animation replaces `ticker` (same mechanic, product-specific name)
export default {
	darkMode: ["class"],
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	theme: {
		container: {
			center: true,
			padding: "1.5rem",
			screens: {
				"2xl": "1280px",
			},
		},
		extend: {
			fontFamily: {
				sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
				display: ['"Space Grotesk"', '"Inter"', "ui-sans-serif", "sans-serif"],
				mono: [
					'"JetBrains Mono"',
					"ui-monospace",
					"SFMono-Regular",
					"monospace",
				],
			},
			fontWeight: {
				regular: "400",
			},
			colors: {
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				ok: "hsl(var(--ok))",
				warn: "hsl(var(--warn))",
				// Headline accent used by the hero's `text-brand` class.
				brand: "hsl(var(--brand))",
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			keyframes: {
				aurora: {
					"0%, 100%": { transform: "translate3d(-6%, -2%, 0) scale(1)" },
					"50%": { transform: "translate3d(6%, 4%, 0) scale(1.12)" },
				},
				tape: {
					"0%": { transform: "translateX(0)" },
					"100%": { transform: "translateX(-50%)" },
				},
				"fade-up": {
					from: { opacity: "0", transform: "translateY(12px)" },
					to: { opacity: "1", transform: "translateY(0)" },
				},
			},
			animation: {
				aurora: "aurora 18s ease-in-out infinite",
				tape: "tape 44s linear infinite",
				"fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
