import {
	BrowserProvider,
	Contract,
	type Eip1193Provider,
	FallbackProvider,
	Interface,
	JsonRpcProvider,
	Network,
	ZeroAddress,
	getAddress,
	namehash,
} from "ethers";

/** The redirect page, as an ENSIP-7 contenthash. */
export const REDIRECT_CONTENTHASH =
	"0xe3010170122086c5144fe51e4f19beb9b98388f0a0165fa6927e47c96d90968b861d99d45e49";

export const MAINNET_HEX = "0x1";

/**
 * Read endpoints, in preference order. Every read the app makes goes through
 * these: name inspection, the write simulation and waiting for receipts. A
 * single endpoint meant one outage took the whole app down, so reads now fall
 * through to the next one.
 *
 * Both were checked to serve `eth_call` without an API key, which is the part
 * that matters. Several well-known public endpoints answer `eth_chainId` but
 * reject `eth_call`, so they are useless here and deliberately absent.
 */
const MAINNET_RPCS = [
	"https://ethereum-rpc.publicnode.com",
	"https://eth.drpc.org",
];
const ENS_REGISTRY = "0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e";
const RESOLVIO = "https://api.resolvio.xyz/ens/v2/profile/";
const RESOLVIO_REV = "https://api.resolvio.xyz/ens/v2/reverse/";

const REGISTRY_ABI = ["function resolver(bytes32 node) view returns (address)"];
const RESOLVER_ABI = [
	"function contenthash(bytes32 node) view returns (bytes)",
	"function setContenthash(bytes32 node, bytes hash) external",
	"function text(bytes32 node, string key) view returns (string)",
	"function setText(bytes32 node, string key, string value) external",
	// ENS's Multicallable, implemented by the Public Resolver. It re-enters the
	// resolver per item preserving msg.sender, so authorisation still applies to
	// each inner call and the destination plus the redirect fit in one signature.
	"function multicall(bytes[] data) external returns (bytes[] results)",
];

/** The url text record: the destination every redirect reads at visit time. */
export const URL_KEY = "url";

const resolverIface = new Interface(RESOLVER_ABI);

/**
 * Canonicalise an address. Lowercasing first is the whole point: getAddress()
 * on a mixed-case string *validates* and throws "bad address checksum",
 * whereas a single-case string carries no checksum to fail, so it is simply
 * recomputed. Every address entering ethers goes through here.
 */
export function norm(addr: string): string {
	return getAddress(String(addr).trim().toLowerCase());
}

/**
 * `staticNetwork` skips the chain-id handshake per endpoint, and quorum 1 means
 * the first healthy provider answers rather than waiting for agreement — this
 * is failover, not consensus.
 */
const read = new FallbackProvider(
	MAINNET_RPCS.map((url, i) => ({
		provider: new JsonRpcProvider(url, undefined, {
			staticNetwork: Network.from(1),
		}),
		priority: i + 1,
		stallTimeout: 2_000,
		weight: 1,
	})),
	Network.from(1),
	{ quorum: 1 },
);
const registry = new Contract(norm(ENS_REGISTRY), REGISTRY_ABI, read);

export const shortAddr = (a?: string | null) =>
	a ? `${a.slice(0, 6)}\u2026${a.slice(-4)}` : "";

/* ------------------------------------------------------------------ *
 * Name discovery — the ENS subgraph
 *
 * Reached through TheGraph's decentralised gateway rather than the hosted
 * service, because the hosted service sends no Access-Control-Allow-Origin and
 * so cannot be called from a browser at all.
 *
 * The gateway key is a rate-limit identifier rather than a secret: a browser
 * app has nowhere to hide it, so it necessarily ships in the bundle. It is read
 * from the environment only to keep it out of the repository, where it would be
 * trivially scraped. Set limits for it in TheGraph Studio.
 * ------------------------------------------------------------------ */

const SUBGRAPH_KEY = import.meta.env.VITE_ENS_SUBGRAPH_KEY as string | undefined;
const ENS_SUBGRAPH_ID = "5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH";

/** namehash("addr.reverse"). Reverse records are excluded in the query. */
const ADDR_REVERSE_NODE =
	"0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";
const ZERO = "0x0000000000000000000000000000000000000000";

/**
 * Mirrors the filter @ensdomains/ensjs sends for getNamesForAddress, minus its
 * `resolvedAddress` clause: that matches names which merely point at you, which
 * would fail the write simulation and read as noise in a picker that says "the
 * names your wallet manages".
 *
 * Expired names and reverse records are excluded here rather than client-side,
 * so they never cross the wire.
 */
const NAMES_QUERY = `query Names($addr: String!, $after: String!, $now: BigInt!) {
  domains(
    first: 1000
    orderBy: id
    orderDirection: asc
    where: {
      and: [
        { id_gt: $after }
        { or: [{ owner: $addr }, { registrant: $addr }, { wrappedOwner: $addr }] }
        { parent_not: "${ADDR_REVERSE_NODE}" }
        { or: [{ expiryDate_gt: $now }, { expiryDate: null }] }
        { or: [
            { owner_not: "${ZERO}" }
            { resolver_not: null }
            { and: [{ registrant_not: "${ZERO}" }, { registrant_not: null }] }
        ] }
      ]
    }
  ) { id name }
}`;

/**
 * Names the index returns that this app cannot redirect, and so are noise in
 * the picker:
 *
 *  - Anything not ending in `.eth`, which is DNS names imported into the
 *    registry; they resolve through their own gateway rather than eth.limo.
 *  - `*.base.eth`. Basenames subnames are registered on Base, so their records
 *    do not live on the mainnet registry this app writes to. The exact name
 *    `base.eth` is a normal mainnet 2LD and is left in.
 *  - `[<labelhash>].eth`, the index saying it does not know the label behind a
 *    hash. `namehash` rejects those, so nothing can be done with them here.
 */
function usable(name: string): boolean {
	if (!name.endsWith(".eth")) return false;
	if (name.endsWith(".base.eth")) return false;
	if (name.includes("[") && name.includes("]")) return false;
	return true;
}

export async function fetchOwnedNames(address: string): Promise<string[]> {
	if (!SUBGRAPH_KEY) {
		throw new Error(
			"No ENS subgraph key is configured, so names cannot be listed.",
		);
	}

	const url = `https://gateway.thegraph.com/api/${SUBGRAPH_KEY}/subgraphs/id/${ENS_SUBGRAPH_ID}`;
	const addr = address.toLowerCase();
	const now = String(Math.floor(Date.now() / 1000));
	const names: string[] = [];
	/** Cursor on id rather than an offset, so paging cannot skip or repeat. */
	let after = "";

	for (let page = 0; page < 12; page++) {
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				query: NAMES_QUERY,
				variables: { addr, after, now },
			}),
		});
		if (!res.ok) throw new Error(`The ENS index returned ${res.status}.`);

		const json = await res.json();
		if (json.errors?.length)
			throw new Error(json.errors[0].message || "ENS index error");

		const rows: { id: string; name: string | null }[] = json.data?.domains ?? [];
		for (const d of rows) if (d.name && usable(d.name)) names.push(d.name);

		if (rows.length < 1000) break;
		after = rows[rows.length - 1].id;
	}

	return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

/* ------------------------------------------------------------------ *
 * Per-name onchain state
 * ------------------------------------------------------------------ */

export type NameStatus = {
	name: string;
	node: string;
	resolver: string | null;
	hasResolver: boolean;
	current: string | null;
	url: string | null;
	avatar: string | null;
	on: boolean;
	other: boolean;
	canWrite: boolean;
	writeError: string | null;
	/** Resolver implements Multicallable, so destination + redirect are one tx. */
	canMulticall: boolean;
};

function errText(e: unknown): string {
	const x = e as { shortMessage?: string; reason?: string; message?: string };
	return x?.shortMessage || x?.reason || x?.message || String(e);
}

export async function inspectName(
	name: string,
	account: string,
): Promise<NameStatus> {
	// namehash rejects a name that is not ENSIP-15 normalised. The indexer can
	// hand back such names, and the raw ethers error is unreadable, so it is
	// translated here rather than surfaced.
	let node: string;
	try {
		node = namehash(name);
	} catch {
		throw new Error(
			`${name} is not a normalised ENS name, so its records cannot be addressed.`,
		);
	}

	const s: NameStatus = {
		name,
		node,
		resolver: null,
		hasResolver: false,
		current: null,
		url: null,
		avatar: null,
		on: false,
		other: false,
		canWrite: false,
		writeError: null,
		canMulticall: false,
	};

	try {
		s.resolver = await registry.resolver(node);
	} catch (e) {
		throw new Error(`Reading the registry for ${name} failed: ${errText(e)}`);
	}
	s.hasResolver = !!s.resolver && s.resolver !== ZeroAddress;

	if (s.hasResolver) {
		const rc = new Contract(norm(s.resolver as string), RESOLVER_ABI, read);
		try {
			s.current = await rc.contenthash(node);
		} catch {
			/* resolver may not implement contenthash */
		}
		// Read the destination from the resolver rather than trusting the profile
		// API below. The app now writes this record, so guessing it is empty when
		// a third-party service is merely unreachable would overwrite a live value.
		try {
			s.url = (await rc.text(node, URL_KEY)) || null;
		} catch {
			/* resolver may not implement text */
		}
		// Simulating the write from the connected address is the only check that
		// covers registrant, manager, wrapped owner, operator and per-resolver
		// delegate schemes without guessing which one this resolver implements.
		try {
			await rc.setContenthash.staticCall(node, REDIRECT_CONTENTHASH, {
				from: norm(account),
			});
			s.canWrite = true;
		} catch (e) {
			s.writeError = errText(e);
		}
		// Same trick for batching. Simulating the batch is more reliable than
		// probing supportsInterface, because it also proves the inner calls are
		// authorised for this address rather than only that the entry point exists.
		if (s.canWrite) {
			try {
				await rc.multicall.staticCall(
					[
						resolverIface.encodeFunctionData("setText", [
							node,
							URL_KEY,
							s.url ?? "https://example.com",
						]),
						resolverIface.encodeFunctionData("setContenthash", [
							node,
							REDIRECT_CONTENTHASH,
						]),
					],
					{ from: norm(account) },
				);
				s.canMulticall = true;
			} catch {
				/* older or custom resolver: the writes go one transaction at a time */
			}
		}
	}

	s.on =
		!!s.current &&
		s.current.toLowerCase() === REDIRECT_CONTENTHASH.toLowerCase();
	s.other = !!s.current && s.current !== "0x" && !s.on;

	// The profile API supplies the avatar, and stands in for the destination only
	// if the onchain read above could not produce one.
	try {
		const r = await fetch(RESOLVIO + encodeURIComponent(name));
		if (r.ok) {
			const p = await r.json();
			const texts: { key: string; value?: string; exists?: boolean }[] =
				p.texts ?? [];
			s.avatar =
				texts.find((t) => t.key === "avatar" && t.exists)?.value ?? null;
			if (!s.url) {
				s.url =
					texts.find((t) => t.key === URL_KEY && t.exists)?.value ?? null;
			}
		}
	} catch {
		/* profile lookup is best-effort */
	}

	return s;
}

export async function primaryName(address: string) {
	try {
		const r = await fetch(RESOLVIO_REV + encodeURIComponent(address));
		if (!r.ok) return null;
		const j = await r.json();
		return j?.hasReverseRecord && typeof j.name === "string" ? j.name : null;
	} catch {
		return null;
	}
}

export async function profileAvatar(name: string): Promise<string | null> {
	try {
		const r = await fetch(RESOLVIO + encodeURIComponent(name));
		if (!r.ok) return null;
		const p = await r.json();
		const texts: { key: string; value?: string; exists?: boolean }[] =
			p.texts ?? [];
		return texts.find((t) => t.key === "avatar" && t.exists)?.value ?? null;
	} catch {
		return null;
	}
}

/* ------------------------------------------------------------------ *
 * Write
 * ------------------------------------------------------------------ */

/**
 * Tidy a typed destination into something worth writing to a text record, or
 * return null if it cannot be one.
 *
 * Only http and https are allowed. A url record is read back by the redirect
 * page and handed to the browser, so permitting `javascript:` or `data:` here
 * would turn the record into a script-injection channel against every visitor.
 */
export function normalizeUrl(input: string): string | null {
	const raw = input.trim();
	if (!raw) return null;
	// Someone typing "example.com" means https, not a relative path.
	const withScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(raw)
		? raw
		: `https://${raw}`;
	let u: URL;
	try {
		u = new URL(withScheme);
	} catch {
		return null;
	}
	if (u.protocol !== "http:" && u.protocol !== "https:") return null;
	if (!u.hostname.includes(".")) return null;
	return u.toString();
}

/** What the user wants to end up with. `null` means leave that record alone. */
export type WriteIntent = {
	/** REDIRECT_CONTENTHASH to switch on, "0x" to switch off. */
	contenthash: string | null;
	/** A normalised destination for the url record. */
	url: string | null;
};

/** One wallet confirmation. More than one `data` entry means a multicall. */
export type PlannedTx = { label: string; data: string[] };

/**
 * Turn an intent into the fewest confirmations the resolver will accept.
 *
 * A Multicallable resolver takes the destination and the redirect together, so
 * the common case (activate and point somewhere in one go) costs one signature.
 * Anything older falls back to a transaction per record, which is worth telling
 * the user about rather than surprising them with a second wallet prompt.
 */
export function planTransactions(
	status: NameStatus,
	intent: WriteIntent,
): PlannedTx[] {
	const calls: { label: string; data: string }[] = [];

	if (intent.url !== null) {
		calls.push({
			label: "set the destination",
			data: resolverIface.encodeFunctionData("setText", [
				status.node,
				URL_KEY,
				intent.url,
			]),
		});
	}
	if (intent.contenthash !== null) {
		calls.push({
			label:
				intent.contenthash === "0x"
					? "switch the redirect off"
					: "switch the redirect on",
			data: resolverIface.encodeFunctionData("setContenthash", [
				status.node,
				intent.contenthash,
			]),
		});
	}

	if (calls.length < 2) {
		return calls.map((c) => ({ label: c.label, data: [c.data] }));
	}
	if (status.canMulticall) {
		return [
			{
				label: calls.map((c) => c.label).join(" and "),
				data: calls.map((c) => c.data),
			},
		];
	}
	return calls.map((c) => ({ label: c.label, data: [c.data] }));
}

/** Submit one planned confirmation, returning as soon as there is a hash. */
export async function submitPlanned(
	provider: Eip1193Provider & { request: (a: unknown) => Promise<unknown> },
	status: NameStatus,
	tx: PlannedTx,
): Promise<string> {
	const chainId = await provider.request({ method: "eth_chainId" });
	if (chainId !== MAINNET_HEX) {
		await provider.request({
			method: "wallet_switchEthereumChain",
			params: [{ chainId: MAINNET_HEX }],
		});
	}
	const signer = await new BrowserProvider(provider).getSigner();
	const resolver = norm(status.resolver as string);

	if (tx.data.length > 1) {
		const rc = new Contract(resolver, RESOLVER_ABI, signer);
		const sent = await rc.multicall(tx.data);
		return sent.hash as string;
	}
	const sent = await signer.sendTransaction({ to: resolver, data: tx.data[0] });
	return sent.hash as string;
}

/**
 * Wait on our own read provider rather than tx.wait() on the wallet's.
 * Injected providers frequently stop polling once the wallet UI closes, so
 * tx.wait() can hang indefinitely on a transaction that already confirmed.
 * Resolves null on timeout instead of hanging.
 */
export async function waitForTx(hash: string, timeoutMs = 180_000) {
	try {
		return await read.waitForTransaction(hash, 1, timeoutMs);
	} catch {
		return null;
	}
}

export { errText };
