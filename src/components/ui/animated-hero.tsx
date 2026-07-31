import { motion } from "framer-motion";
import { ArrowDown, MoveRight, ShieldCheck } from "lucide-react";
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
				<div className="flex flex-col items-center justify-center gap-8 pb-10 pt-14 lg:pb-16 lg:pt-20">
					<div>
						<a
							href="#scope"
							className="inline-flex items-center gap-2.5 rounded-full border border-border/70 bg-secondary/60 py-1.5 pl-3 pr-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
						>
							<ShieldCheck className="h-4 w-4 flex-none text-primary" />
							No approvals, no custody, no fee
							<MoveRight className="h-3.5 w-3.5 flex-none text-muted-foreground" />
						</a>
					</div>

					<div className="flex flex-col gap-5">
						<h1 className="max-w-3xl text-center font-regular text-[2.6rem] leading-[1.05] tracking-tighter sm:text-6xl md:text-7xl">
							<span className="text-brand">Point your .eth at</span>
							<span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
								&nbsp;
								{titles.map((title, index) => (
									<motion.span
										key={title}
										className="absolute font-semibold"
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

						<p className="max-w-xl text-center text-base leading-relaxed tracking-tight text-muted-foreground md:text-lg">
							Your name forwards to any URL you choose. Point it somewhere else
							later without setting the redirect up again.
						</p>
					</div>

					<div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
						<Button
							size="lg"
							onClick={onChooseName}
							className="gap-2 sm:gap-3"
						>
							Choose a name <MoveRight className="h-4 w-4" />
						</Button>
						<Button size="lg" variant="outline" className="gap-2 sm:gap-3" asChild>
							<a href="#how">
								How it works <ArrowDown className="h-4 w-4" />
							</a>
						</Button>
					</div>

					<p className="font-mono text-xs tracking-wide text-muted-foreground">
						One transaction to switch on. One to switch off.
					</p>

					{/* The product itself, directly under the claim it supports. */}
					<div className="mt-6 flex w-full justify-center lg:mt-10">
						<HeroArtifact />
					</div>
				</div>
			</div>
		</div>
	);
}

export { Hero };
