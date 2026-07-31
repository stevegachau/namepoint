import { motion } from "framer-motion";
import { ChevronsDown, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HeroArtifact } from "@/components/HeroArtifact";
import { Button } from "@/components/ui/button";

type Props = {
	/** Opens the name picker sheet. */
	onChooseName: () => void;
};

/**
 * Rotating-headline hero. The rotating slot carries the destinations a name can
 * forward to, which is the one variable the product exposes, so the motion
 * carries meaning rather than only movement.
 */
function Hero({ onChooseName }: Props) {
	const [titleNumber, setTitleNumber] = useState(0);
	const titles = useMemo(
		() => ["your site", "your shop", "your links", "your docs", "anything"],
		[],
	);

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			if (titleNumber === titles.length - 1) {
				setTitleNumber(0);
			} else {
				setTitleNumber(titleNumber + 1);
			}
		}, 2000);
		return () => clearTimeout(timeoutId);
	}, [titleNumber, titles]);

	return (
		<div className="w-full">
			<div className="container mx-auto">
				{/*
				  Left-biased, not centred. A centred stack of badge, headline, one
				  sentence and two buttons is the default landing-page shape; anchoring
				  the type to the left edge and setting the supporting column beside it
				  gives the fold an axis to read along.
				*/}
				<div className="flex flex-col gap-7 pb-10 pt-6 lg:pb-16 lg:pt-9">
					<div>
						<a
							href="#scope"
							// Sized down on the narrowest screens: at 320px this wrapped to two
							// lines, and a clickable that wraps is a broken tap target.
							className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-border bg-secondary/50 py-1.5 pl-2.5 pr-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-2.5 sm:pl-3 sm:pr-4 sm:text-sm"
						>
							<ShieldCheck className="h-4 w-4 flex-none text-primary" />
							No approvals, no custody, no fee
							<ChevronsDown className="hidden h-3.5 w-3.5 flex-none -rotate-90 text-muted-foreground sm:block" />
						</a>
					</div>

					<div className="flex flex-col gap-6">
						<h1 className="max-w-5xl font-regular text-[2.6rem] leading-[1.03] tracking-tighter sm:text-5xl md:text-6xl xl:text-7xl">
							<span className="block text-brand">Point your .eth at</span>
							<span className="relative block h-[1.12em] overflow-hidden">
								{titles.map((title, index) => (
									<motion.span
										key={title}
										className="absolute left-0 font-semibold"
										initial={{ opacity: 0, y: "-100" }}
										transition={{ type: "spring", stiffness: 50 }}
										animate={
											titleNumber === index
												? {
														y: 0,
														opacity: 1,
													}
												: {
														y: titleNumber > index ? -150 : 150,
														opacity: 0,
													}
										}
									>
										{title}
									</motion.span>
								))}
							</span>
						</h1>

						<p className="max-w-xl text-base leading-relaxed tracking-tight text-muted-foreground">
							Your name forwards to any URL you choose. Point it somewhere else
							later without setting the redirect up again.
						</p>
					</div>

					<div className="flex w-full flex-col gap-x-6 gap-y-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex flex-col gap-3 sm:flex-row">
							<Button
								size="lg"
								onClick={onChooseName}
								className="group gap-2.5 rounded-md px-6"
							>
								<Sparkles className="h-4 w-4 flex-none transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
								Choose a name
							</Button>
							<Button
								size="lg"
								variant="outline"
								className="group gap-2.5 rounded-md px-6"
								asChild
							>
								<a href="#how">
									How it works
									<ChevronsDown className="h-4 w-4 flex-none transition-transform duration-500 group-hover:translate-y-0.5" />
								</a>
							</Button>
						</div>

						<p className="font-mono text-xs tracking-wide text-muted-foreground">
							One transaction to switch on. One to switch off.
						</p>
					</div>

					{/* The product itself, directly under the claim it supports. */}
					<div className="mt-4 flex w-full lg:mt-8">
						<HeroArtifact />
					</div>
				</div>
			</div>
		</div>
	);
}

export { Hero };
