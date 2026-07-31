import { MessagesSquare, Plus } from "lucide-react";
import { Eyebrow } from "@/components/Eyebrow";
import { Reveal } from "@/components/Reveal";
import { REPO_URL } from "@/site";

/**
 * Native <details> so the accordion works without JavaScript, keyboard support
 * comes free and there is no extra dependency. Every answer here is checkable
 * against the app's own behaviour rather than written to sound reassuring.
 */
const QA: { q: string; a: string }[] = [
	{
		q: "Where does the name forward to?",
		a: "The url text record on the name. The redirect page resolves that record at request time, so the record is the destination.",
	},
	{
		q: "Can the destination change later?",
		a: "Yes. Change it here or in any ENS manager. It is one transaction that touches only the url record, and the redirect itself stays as it is, so there is nothing to set up again.",
	},
	{
		q: "What if the url record is not set?",
		a: "Enter a destination when you activate and it is written with the contenthash in the same transaction. Activating without one leaves the name resolving to a blank page until the record is set.",
	},
	{
		q: "Something else is already published on the name.",
		a: "The app reports the existing contenthash before you sign. Activating replaces it, and whatever it pointed to stops resolving. No other record is touched.",
	},
	{
		q: "How is it switched off?",
		a: "One transaction clearing the contenthash. The url record is left in place, so switching back on later needs no setup. This also works from any ENS manager.",
	},
	{
		q: "Why does the wallet ask to switch network?",
		a: "Records for .eth names are on Ethereum mainnet, so the write has to happen there. The app requests the switch before preparing the transaction.",
	},
	{
		q: "Does the link work in an ordinary browser?",
		a: "Through the eth.limo gateway, yes: yourname.eth.limo resolves anywhere. Browsers and extensions with native .eth resolution handle yourname.eth directly.",
	},
	{
		q: "A name is missing from the list.",
		a: "The list only shows .eth names on Ethereum mainnet. Imported DNS names and Basenames subnames (.base.eth) are left out, because their records do not live on the registry this app writes to. Reverse records and names whose label the index cannot resolve are filtered out too. The index can also lag a recent registration or transfer; authorisation itself is checked onchain when you select a name.",
	},
	{
		q: "What does it cost?",
		a: "Gas for your own transaction. namepoint charges nothing.",
	},
];

export function Faq() {
	return (
		<section id="faq" className="w-full scroll-mt-24 border-t border-border/60">
			<div className="container mx-auto py-20 md:py-28">
				<div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-20">
					<Reveal className="lg:sticky lg:top-28 lg:self-start">
						<Eyebrow icon={MessagesSquare}>Questions</Eyebrow>
						<h2 className="mt-6 text-[2.1rem] font-medium leading-[1.08] tracking-tighter md:text-[2.9rem]">
							Before you sign
						</h2>
						<p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
							Everything below describes the app as it works today. If you would
							rather read the code,{" "}
							<a
								href={REPO_URL}
								target="_blank"
								rel="noreferrer"
								className="text-foreground underline underline-offset-4 transition-colors hover:text-primary"
							>
								it is on GitHub
							</a>
							.
						</p>
					</Reveal>

					<Reveal className="border-t border-border">
						{QA.map(({ q, a }) => (
							<details key={q} className="group border-b border-border/60">
								<summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
									<span className="text-base tracking-tight sm:text-lg">
										{q}
									</span>
									<Plus
										aria-hidden="true"
										className="mt-1 h-4 w-4 flex-none text-muted-foreground transition-transform duration-300 group-open:rotate-45"
									/>
								</summary>
								<p className="max-w-2xl pb-6 pr-10 text-sm leading-relaxed text-muted-foreground">
									{a}
								</p>
							</details>
						))}
					</Reveal>
				</div>
			</div>
		</section>
	);
}
