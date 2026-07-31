# namepoint

Point an ENS name at a URL.

Your `.eth` name becomes a link to any site you already have. Visitors who open
`yourname.eth` land on your site, and you can change where it points later by
editing one record, with no further transaction.

## How it works

Activating writes two records on the resolver already set on your name:

- **`contenthash`** resolves to a small redirect page pinned on IPFS.
- **`url`** holds your destination. The redirect page reads it on every request.

Because the destination lives in the `url` record rather than in the
`contenthash`, repointing the name later means editing that one text record,
here or in any ENS manager. Switching the redirect off clears the `contenthash`
and leaves the destination in place.

Both records are batched into a single call, so a standard ENS resolver asks for
one signature. There is no fee, no token approval, and nothing is delegated:
every write is signed by your own wallet.

Shared as `yourname.eth.limo`, the link works in any browser. Browsers and
extensions with native `.eth` resolution handle `yourname.eth` directly.

## Which names are listed

Only `.eth` names on Ethereum mainnet can be redirected, so the picker leaves out:

- Names not ending in `.eth`, including DNS names imported into the registry.
- `*.base.eth` subnames, which are registered on Base rather than on mainnet.
- Names the public ENS index cannot resolve a label for, shown as
  `[<labelhash>].eth`.

The index can also lag a recent registration or transfer. Whether you are
authorised to change a name is checked onchain when you select it, not taken
from the index.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit && vite build
npm run preview    # serve the production build
```

React 18, Vite, TypeScript, Tailwind and ethers v6. No backend and no API keys.

## Architecture

```
src/
  App.tsx          page composition, wallet state, provider listeners
  NameSheet.tsx    connect / select / confirm dialog
  ens.ts           registry and resolver reads, write planning, submission
  wallet.ts        EIP-6963 discovery, WalletConnect behind a dynamic import
  index.css        design tokens
  components/      landing page and shared UI
```

Notes for anyone working on `ens.ts`:

- **Authorisation is simulated, not inferred.** `setContenthash` is run through
  `staticCall` from the connected address before a name is offered. This covers
  registrant, manager, wrapped owner, operator and per-resolver delegate schemes
  without guessing which one a resolver implements.
- **Batching is detected the same way.** `multicall([setText, setContenthash])`
  is simulated from the connected address, which proves the inner calls are
  authorised rather than only that the entry point exists. Resolvers without
  `multicall` fall back to one transaction per record, and the UI states the
  count before the first prompt.
- **The destination is read onchain** via `text(node, "url")`. The profile API is
  only a fallback, so an unreachable third-party service is never mistaken for an
  empty record.
- **Only `http` and `https` destinations are accepted.** The `url` record is read
  back and handed to a browser by the redirect page.
- **Reads use a `FallbackProvider`** over several mainnet RPC endpoints. Some
  public endpoints answer `eth_chainId` but reject `eth_call`, so the list holds
  only endpoints verified to serve calls.
- **Receipts are awaited on the app's own provider** rather than `tx.wait()`.
  Injected providers often stop polling once the wallet UI closes.

Light is the default theme; the pre-paint script in `index.html` and
`getInitialTheme` in `ThemeToggle.tsx` must agree. `prefers-reduced-motion` is
handled both in `index.css` and, for JS-driven animation, via
`useReducedMotion`.

CI runs the type-check and build on every push.

## Licence

MIT.
