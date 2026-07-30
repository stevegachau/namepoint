import type { Eip1193Provider } from "ethers";

export type Injected = Eip1193Provider & {
	request: (a: unknown) => Promise<unknown>;
	on?: (event: string, cb: (...args: never[]) => void) => void;
	/** EIP-1193's counterpart to `on`. Optional, because not every wallet has it. */
	removeListener?: (event: string, cb: (...args: never[]) => void) => void;
	enable?: () => Promise<string[]>;
	disconnect?: () => Promise<void>;
};

export type WalletOption = {
	uuid: string;
	name: string;
	icon: string;
	connect: () => Promise<{ provider: Injected; account: string }>;
};

const WC_PROJECT_ID = "30e2ea901580311e378e5fb6eee06ee0";

const WC_ICON =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%233B99FC' d='M6.685 8.71c2.935-2.813 7.695-2.813 10.63 0l.353.339a.35.35 0 0 1 0 .51l-1.208 1.158a.194.194 0 0 1-.266 0l-.486-.466c-2.048-1.963-5.368-1.963-7.416 0l-.52.498a.194.194 0 0 1-.266 0L6.297 9.592a.35.35 0 0 1 0-.51zm13.13 2.396l1.075 1.03a.35.35 0 0 1 0 .51l-4.85 4.648a.39.39 0 0 1-.531 0l-3.443-3.299a.097.097 0 0 0-.132 0l-3.442 3.3a.39.39 0 0 1-.532 0l-4.85-4.65a.35.35 0 0 1 0-.508l1.076-1.031a.387.387 0 0 1 .531 0l3.442 3.299a.097.097 0 0 0 .133 0l3.442-3.3a.387.387 0 0 1 .532 0l3.442 3.3a.097.097 0 0 0 .133 0l3.442-3.3a.39.39 0 0 1 .531 0'/%3E%3C/svg%3E";

type EIP6963Detail = {
	info: { uuid: string; name: string; icon: string; rdns: string };
	provider: Injected;
};

const injected: EIP6963Detail[] = [];
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
	window.addEventListener("eip6963:announceProvider", (e) => {
		const detail = (e as CustomEvent<EIP6963Detail>).detail;
		if (injected.some((p) => p.info.uuid === detail.info.uuid)) return;
		injected.push(detail);
		for (const l of listeners) l();
	});
	window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function onWalletsChanged(cb: () => void) {
	listeners.add(cb);
	return () => listeners.delete(cb);
}

async function requestAccounts(provider: Injected, useEnable = false) {
	const accs = useEnable && provider.enable
		? await provider.enable()
		: ((await provider.request({ method: "eth_requestAccounts" })) as
				| string[]
				| { accounts?: { address: string }[] });
	const account = Array.isArray(accs)
		? accs[0]
		: (accs?.accounts?.[0]?.address as string);
	return account;
}

export function listWallets(): WalletOption[] {
	const out: WalletOption[] = injected.map(({ info, provider }) => ({
		uuid: info.uuid,
		name: info.name,
		icon: info.icon,
		connect: async () => ({
			provider,
			account: await requestAccounts(provider),
		}),
	}));

	out.push({
		uuid: "walletconnect",
		name: "WalletConnect",
		icon: WC_ICON,
		connect: async () => {
			const { EthereumProvider } = await import(
				"@walletconnect/ethereum-provider"
			);
			const provider = (await EthereumProvider.init({
				projectId: WC_PROJECT_ID,
				showQrModal: true,
				optionalChains: [1],
				rpcMap: { 1: "https://ethereum-rpc.publicnode.com" },
				metadata: {
					name: "namepoint",
					description: "Point an ENS name at a URL",
					url: window.location.origin,
					// Remote wallets fetch this over the network to render the session
					// proposal, so it has to be a real file. public/icon.png is a 256px
					// PNG rather than an .ico or an SVG, because that is what wallet
					// UIs render reliably.
					icons: [`${window.location.origin}/icon.png`],
				},
			})) as unknown as Injected;
			return { provider, account: await requestAccounts(provider, true) };
		},
	});

	return out;
}

export async function disconnect(provider: Injected | null) {
	if (!provider) return;
	try {
		await provider.request({
			method: "wallet_revokePermissions",
			params: [{ eth_accounts: {} }],
		});
	} catch {
		/* not supported by every wallet */
	}
	try {
		await provider.disconnect?.();
	} catch {
		/* not part of EIP-1193 */
	}
}
