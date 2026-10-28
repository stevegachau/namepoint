import {
	BrowserProvider,
	Contract,
	type Eip1193Provider,
	FallbackProvider,
	Interface,
	JsonRpcProvider,
	Network,
	ZeroAddress,
	dnsEncode,
	getAddress,
	id,
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
/**
 * The client-facing Universal Resolver proxy. Since ENSv2 went live on mainnet
 * it is the one place that knows where any name's resolver is: a name
 * registered or migrated under ENSv2 has no entry in the v1 registry at all.
 * The redirect page already resolves through this same address.
 */
const UNIVERSAL_RESOLVER = "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe";
/**
 * ENSv2's read-only mirror of the v1 registry. The Universal Resolver answers
 * with it for every name still living in v1, but it holds no records and takes
 * no writes; the real resolver is still the one the v1 registry points at.
 */
const ENSV1_MIRROR_RESOLVER = "0x394d8eb4a4fdf599384deab25f31d111d755c398";
const RESOLVIO = "https://api.resolvio.xyz/ens/v2/profile/";
const RESOLVIO_REV = "https://api.resolvio.xyz/ens/v2/reverse/";

const REGISTRY_ABI = ["function resolver(bytes32 node) view returns (address)"];
const UNIVERSAL_RESOLVER_ABI = [
	"function findResolver(bytes name) view returns (address resolver, bytes32 node, uint256 offset)",
];
/**
 * Two resolver dialects are live. ENSv1 resolvers, and ENSv2's shared
 * PublicResolverV2, key everything by node. ENSv2's per-name
 * PermissionedResolver keys setters by DNS-encoded name and answers reads only
 * through ENSIP-10 `resolve`; calling the node-keyed functions on it reverts.
 */
const RESOLVER_ABI = [
	"function contenthash(bytes32 node) view returns (bytes)",
	"function setContenthash(bytes32 node, bytes hash) external",
	"function text(bytes32 node, string key) view returns (string)",
	"function setText(bytes32 node, string key, string value) external",
	"function setContenthash(bytes name, bytes hash) external",
	"function setText(bytes name, string key, string value) external",
	"function resolve(bytes name, bytes data) view returns (bytes)",
	"function supportsInterface(bytes4 interfaceId) view returns (bool)",
	// ENS's Multicallable, implemented by the Public Resolver and by ENSv2's
	// resolvers alike. It re-enters the resolver per item preserving msg.sender,
	// so authorisation still applies to each inner call and the destination plus
	// the redirect fit in one signature.
	"function multicall(bytes[] data) external returns (bytes[] results)",
];

/** The url text record: the destination every redirect reads at visit time. */
export const URL_KEY = "url";

const resolverIface = new Interface(RESOLVER_ABI);

/**
 * ERC-165 ids of ENSv2's name-keyed ITextSetter and IContenthashSetter. Each
 * interface has one function, so its id is that function's selector.
 */
const NAME_KEYED_SETTERS = [
	id("setText(bytes,string,string)").slice(0, 10),
	id("setContenthash(bytes,bytes)").slice(0, 10),
];

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
const universalResolver = new Contract(
	norm(UNIVERSAL_RESOLVER),
	UNIVERSAL_RESOLVER_ABI,
	read,
);

export const shortAddr = (a?: string | null) =>
	a ? `${a.slice(0, 6)}\u2026${a.slice(-4)}` : "";

/* ------------------------------------------------------------------ *
 * Name discovery — Bigname
 *
 * ENS's own REST index (github.com/ensdomains/bigname). It covers both ENSv1
 * and ENSv2 names, needs no key and sends `Access-Control-Allow-Origin: *`, so
 * the browser calls it directly. The ENS subgraph it replaces indexes v1 only.
 * ------------------------------------------------------------------ */

const BIGNAME = "https://api.bigname.sh/v1";

/** Bigname's page-size ceiling. */
const PAGE_SIZE = 200;

type BignameName = {
	name: string;
	expires_at: string | null;
	grace_ends_at: string | null;
};

/**
 * `owner` is the token holder (registrant, or wrapped owner) and `manager` is
 * the effective controller, which together match the owner / registrant /
 * wrappedOwner filter the subgraph query used. `role_holder` is left out: an
 * ENSv2 registry role is not a resolver write grant, so those rows would only
 * fail the write simulation and read as noise in a picker that says "the names
 * your wallet manages".
 */
function namesUrl(address: string, cursor: string | null): string {
	const q = new URLSearchParams({
		namespace: "ens",
		relation: "owner,manager",
		page_size: String(PAGE_SIZE),
	});
	if (cursor) q.set("cursor", cursor);
	return `${BIGNAME}/addresses/${address}/names?${q}`;
}

/**
 * Still live, grace period included: a name in grace can be renewed and its
 * records still resolve, so it belongs in the picker as it did before.
 */
function live(row: BignameName, now: number): boolean {
	const end = row.grace_ends_at ?? row.expires_at;
	return end === null || Number(end) > now;
}

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
	const addr = address.toLowerCase();
	const now = Math.floor(Date.now() / 1000);
	const names: string[] = [];
	/** Bigname's opaque cursor, so paging cannot skip or repeat. */
	let cursor: string | null = null;

	for (let page = 0; page < 60; page++) {
		const res: Response = await fetch(namesUrl(addr, cursor));
		if (!res.ok) throw new Error(`The ENS index returned ${res.status}.`);

		const json: {
			data?: BignameName[];
			page?: { has_more?: boolean; next_cursor?: string | null };
		} = await res.json();
		const rows = json.data ?? [];
		for (const d of rows)
			if (d.name && live(d, now) && usable(d.name)) names.push(d.name);

		cursor = json.page?.has_more ? (json.page.next_cursor ?? null) : null;
		if (!cursor) break;
	}

	return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

/* ------------------------------------------------------------------ *
 * Per-name onchain state
 * ------------------------------------------------------------------ */

export type NameStatus = {
	name: string;
	node: string;
	/** The DNS-encoded name, which ENSv2 resolvers key their records by. */
	dnsName: string;
	resolver: string | null;
	/** ENSv2 PermissionedResolver: setters take the DNS-encoded name, not the node. */
	nameKeyed: boolean;
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

/**
 * The resolver that holds this exact name's records, or null.
 *
 * The Universal Resolver walks ENSv2 first and falls back to v1, so it is
 * right for both. Two of its answers need translating:
 *
 *  - The ENSv1 mirror means the name still lives in v1, and its records sit on
 *    the resolver the v1 registry points at.
 *  - A non-zero offset means the resolver was found on an ancestor (ENSIP-10
 *    wildcard). The name has none of its own, which is how the v1 registry
 *    read used to report it, and writing to the parent's resolver for it is not
 *    something this app should attempt.
 */
async function findResolver(node: string, dnsName: string): Promise<string | null> {
	const [found, , offset] = await universalResolver.findResolver(dnsName);
	if (norm(found) === norm(ENSV1_MIRROR_RESOLVER)) {
		const r: string = await registry.resolver(node);
		return r === ZeroAddress ? null : r;
	}
	if (found === ZeroAddress || offset !== 0n) return null;
	return found;
}

async function isNameKeyed(rc: Contract): Promise<boolean> {
	try {
		for (const iid of NAME_KEYED_SETTERS)
			if (!(await rc.supportsInterface(iid))) return false;
		return true;
	} catch {
		return false;
	}
}

/** Calldata for one record write, in whichever dialect the resolver speaks. */
function encodeSetText(s: NameStatus, key: string, value: string): string {
	return resolverIface.encodeFunctionData(
		s.nameKeyed
			? "setText(bytes,string,string)"
			: "setText(bytes32,string,string)",
		[s.nameKeyed ? s.dnsName : s.node, key, value],
	);
}

function encodeSetContenthash(s: NameStatus, hash: string): string {
	return resolverIface.encodeFunctionData(
		s.nameKeyed ? "setContenthash(bytes,bytes)" : "setContenthash(bytes32,bytes)",
		[s.nameKeyed ? s.dnsName : s.node, hash],
	);
}

/**
 * A view call, read straight off a node-keyed resolver or through ENSIP-10
 * `resolve` on a name-keyed one, which ignores the node inside the calldata.
 */
async function readRecord(
	rc: Contract,
	s: NameStatus,
	fn: "contenthash" | "text",
	args: unknown[],
): Promise<string> {
	const sig = fn === "text" ? "text(bytes32,string)" : "contenthash(bytes32)";
	if (!s.nameKeyed) return rc.getFunction(sig)(...args);
	const data = resolverIface.encodeFunctionData(sig, args);
	const out: string = await rc.resolve(s.dnsName, data);
	return resolverIface.decodeFunctionResult(sig, out)[0];
}

export async function inspectName(
	name: string,
	account: string,
): Promise<NameStatus> {
	// namehash rejects a name that is not ENSIP-15 normalised. The indexer can
	// hand back such names, and the raw ethers error is unreadable, so it is
	// translated here rather than surfaced.
	let node: string;
	let dnsName: string;
	try {
		node = namehash(name);
		dnsName = dnsEncode(name, 255);
	} catch {
		throw new Error(
			`${name} is not a normalised ENS name, so its records cannot be addressed.`,
		);
	}

	const s: NameStatus = {
		name,
		node,
		dnsName,
		resolver: null,
		nameKeyed: false,
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
		s.resolver = await findResolver(node, dnsName);
	} catch (e) {
		throw new Error(`Finding the resolver for ${name} failed: ${errText(e)}`);
	}
	s.hasResolver = !!s.resolver;

	if (s.hasResolver) {
		const rc = new Contract(norm(s.resolver as string), RESOLVER_ABI, read);
		s.nameKeyed = await isNameKeyed(rc);
		try {
			s.current = await readRecord(rc, s, "contenthash", [node]);
		} catch {
			/* resolver may not implement contenthash */
		}
		// Read the destination from the resolver rather than trusting the profile
		// API below. The app now writes this record, so guessing it is empty when
		// a third-party service is merely unreachable would overwrite a live value.
		try {
			s.url = (await readRecord(rc, s, "text", [node, URL_KEY])) || null;
		} catch {
			/* resolver may not implement text */
		}
		// Simulating the write from the connected address is the only check that
		// covers registrant, manager, wrapped owner, operator, per-resolver
		// delegate and ENSv2 role schemes without guessing which one this resolver
		// implements.
		try {
			await read.call({
				to: norm(s.resolver as string),
				from: norm(account),
				data: encodeSetContenthash(s, REDIRECT_CONTENTHASH),
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
						encodeSetText(s, URL_KEY, s.url ?? "https://example.com"),
						encodeSetContenthash(s, REDIRECT_CONTENTHASH),
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
			data: encodeSetText(status, URL_KEY, intent.url),
		});
	}
	if (intent.contenthash !== null) {
		calls.push({
			label:
				intent.contenthash === "0x"
					? "switch the redirect off"
					: "switch the redirect on",
			data: encodeSetContenthash(status, intent.contenthash),
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
