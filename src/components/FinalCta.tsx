import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
	onChooseName: () => void;
	connected: boolean;
};

/**
 * A contained card rather than a full-bleed band. The page ends on an object
 * with edges, which reads as deliberate; a band of tinted background running to
 * the viewport edge reads as leftover space.
 */
export function FinalCta({ onChooseName, connected }: Props) {
	return (
		<section className="w-full pb-20 pt-4 md:pb-28">
			<div className="container mx-auto">
				<div>
					<div className="shadow-float relative isolate overflow-hidden rounded-2xl border border-border/70 bg-card px-6 py-16 text-center md:px-12 md:py-20">
						<span
							aria-hidden="true"
							className="bg-dotgrid pointer-events-none absolute inset-0 -z-10 opacity-70"
						/>

						<div className="relative flex flex-col items-center gap-6">
							<h2 className="max-w-xl text-[2.05rem] font-medium leading-[1.08] tracking-tighter md:text-[2.9rem]">
								Point a name at a URL
							</h2>
							<p className="max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
								{connected
									? "Select any name your wallet manages. Authorisation is checked onchain before anything is signed."
									: "Connect a wallet to list the names you can manage. Nothing is signed until you select one."}
							</p>
							<Button
								size="lg"
								onClick={onChooseName}
								className="group gap-2.5 rounded-md px-6"
							>
								<Sparkles className="h-4 w-4 flex-none transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
								{connected ? "Choose a name" : "Connect a wallet"}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
