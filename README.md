# namepoint

Point an ENS name at a URL. One transaction writes the `contenthash` and `url`
records on the name's existing resolver; one clears the `contenthash` again.

`contenthash` resolves to a redirect page pinned on IPFS. That page reads the
name's `url` record at request time and forwards to it, so the destination can be
changed later by editing one text record, with no further transaction.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit && vite build
npm run preview    # serve the production build
```

React 18, Vite, TypeScript, Tailwind, ethers v6. No backend.

## Layout

```
src/
  App.tsx              page composition, wallet state, provider listeners
  NameSheet.tsx        connect / select / confirm dialog
  ens.ts               registry + resolver reads, write planning, submission
  wallet.ts            EIP-6963 discovery, WalletConnect behind a dynamic import
  index.css            design tokens
  components/
    Navbar SpecTape AmbientBackground Wordmark ThemeToggle
    HeroArtifact         browser window resolving a name, on a loop
    HowItWorks           three steps as self-advancing tabs
    Scope                what changes / is untouched / was never in reach
    Faq FinalCta Footer
    Reveal SpotlightCard
    ui/animated-hero.tsx  ui/button.tsx
```

`HeroArtifact` carries the hero and the examples; they are not repeated in a
section below it. Abstract blocks stand in for the destination page, because a
specific screenshot would be a mock-up of a real site. `HeroArtifact`,
`HowItWorks` and `Reveal` all check `useReducedMotion`.

`Scope` merges what were two sections, "What it writes" and "What it cannot do".
They were the same argument — the blast radius of one call — split in half,
which made both weak and made the page repeat itself.

## Onchain behaviour

**Authorisation is simulated, not inferred.** Before a name is offered,
`setContenthash` is run through `staticCall` from the connected address. This
covers registrant, manager, wrapped owner, operator and per-resolver delegate
schemes without guessing which one a given resolver implements.

**Batching is detected the same way.** `multicall([setText, setContenthash])` is
simulated from the connected address. This proves the inner calls are authorised,
not merely that the entry point exists, which is what `supportsInterface` would
tell you. Resolvers without `multicall` fall back to one transaction per record,
and the UI states the count before the first prompt.

**The destination is read onchain** via `text(node, "url")`. A profile API
supplies the avatar and is only a fallback for the URL. Treating an unreachable
third-party service as "no record set" would overwrite a live destination.

**Only `http` and `https` URLs are accepted.** The `url` record is read back and
handed to a browser by the redirect page, so `javascript:` and `data:` are
rejected. A bare `example.com` is normalised to `https://example.com/`.

**Reads use a `FallbackProvider`** over multiple mainnet RPC endpoints. Note that
several well-known public endpoints answer `eth_chainId` but reject `eth_call`,
which makes them useless here; the list holds only endpoints verified to serve
calls.

**Receipts are awaited on the app's own provider**, not `tx.wait()`. Injected
providers frequently stop polling once the wallet UI closes, which can hang
`tx.wait()` on a transaction that already confirmed.

## States the UI handles

| State | Behaviour |
| --- | --- |
| No resolver set | Blocked, with the reason |
| Not authorised | Blocked; the simulated write is reported as rejected |
| Redirect off, no URL entered | Activates, warns the name will resolve blank |
| Redirect off, URL entered | Both records in one transaction |
| Redirect on, URL edited | `setText` only |
| Redirect on, `url` record empty | Primary action is "Set destination", `setText` only. Reachable by clearing the record elsewhere: the contenthash still resolves, so the name serves a blank page |
| Other contenthash present | Warns it will be replaced and stop resolving |

## Name list

Only `.eth` names on Ethereum mainnet are offered. Filtered out:

- **Anything not ending in `.eth`** — DNS names imported into the registry,
  which resolve through their own gateway rather than eth.limo. This also covers
  the `*.addr.reverse` reverse record every address with a primary name owns.
- **`*.base.eth`** — Basenames subnames are registered on Base, so their records
  are not on the mainnet registry this app writes to. The 2LD `base.eth` itself
  is a normal mainnet name and is kept.
- **`[<labelhash>].eth`** — the index cannot resolve the label, and `namehash`
  rejects these. Supporting them would mean deriving the node from the labelhash
  directly, which this does not do.

## Notes

- The contenthash value is not printed in the UI. It is readable onchain from any
  name already using the redirect, so it is discoverable rather than secret, but
  that is not the same as publishing it with a copy button.
- Light is the default theme. Only an explicit toggle selects dark; the system
  preference is not consulted. The pre-paint script in `index.html` and
  `getInitialTheme` in `ThemeToggle.tsx` must stay in agreement.
- `prefers-reduced-motion` is honoured in two places. `index.css` freezes
  declarative CSS animation; framer-motion drives transforms from JS and ignores
  that rule, so `Reveal` checks `useReducedMotion` separately.
- WalletConnect is the bulk of the bundle and sits behind a dynamic `import()`,
  so it is not in the initial load. The 500kB chunk warning at build refers to it.
- CI runs the type-check and build on every push.

MIT licensed.
