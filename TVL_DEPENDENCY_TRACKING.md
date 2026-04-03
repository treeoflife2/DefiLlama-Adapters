# TVL Dependency Tracking System

## Problem

DeFi TVL doesn't sit where users think it sits. When a user deposits into Protocol A, that TVL often ends up deployed into Protocol B, C, or D. When Drift got hacked (April 2026), it wasn't just Drift users who lost money — every protocol that had deployed TVL into Drift (Carrot, etc.) also got hit. Nobody had a way to see these dependencies upfront.

There is currently no systematic way to answer: **"For a given protocol, where does its TVL actually live?"**

The only existing mechanism is a `doublecounted: true` boolean flag, which signals TVL overlap but says nothing about WHERE the TVL flows.

## Core Idea

The approach is simple:

**For every protocol that receives TVL from users and deploys it into other protocols — track where that TVL goes.**

That's one direction only: **Protocol → where its TVL lives**. We don't need to separately track incoming flows. Once we have the outgoing TVL trail for all protocols, the reverse relationships (who depends on Protocol X) emerge automatically by grouping.

```
Carrot    → [Drift]
Convex    → [Curve]
Yearn     → [Curve, Aave, Compound]
Alchemix  → [Yearn, Convex]
Kamino    → [Raydium, Orca, Meteora]
```

Group by destination and you instantly get:
```
Drift     ← [Carrot, ...]           // Who gets hit if Drift is hacked?
Curve     ← [Convex, Yearn, ...]    // Who gets hit if Curve is hacked?
```

This covers ALL categories uniformly — basis trading, CDPs, risk curators, yield aggregators, liquidity managers, leveraged farming, indexes, capital allocators. The question is always the same: **where does this protocol's TVL actually sit?**

### Prioritization: TVL $100M+ First

Start with protocols that have **$100M+ TVL** in the target categories. These represent the largest systemic risk — the blast radius scales with TVL. Smaller protocols get annotated incrementally afterward.

### Parent-Child Protocol Structure

Many large protocols operate as a **parent with multiple child projects**, each with its own DefiLlama adapter and category. The TVL trail must be tracked at the child level because each child may deploy TVL into completely different protocols.

**Example: Ethena (parent)**
| Child Project | DefiLlama Category | TVL | Where TVL lives |
|--------------|-------------------|-----|-----------------|
| Ethena USDe | Basis Trading | ~$5B+ | CEX perps (Binance, Bybit, OKX), staked ETH (Lido, Rocket Pool), Aave, Morpho, Maker |
| Ethena USDtb | RWA | ~$1B+ | BlackRock BUIDL (tokenized T-bills), RWA custodians |
| Ethena sUSDe/tSUSDe | Yield | Small | Staked USDe — depends on USDe's own TVL trail |

Each child has a **separate adapter** in `/projects/` and gets its own `depositsTo` declaration. What matters is where each specific pool of TVL lives, not the parent brand.

**More examples of parent-child structures:**
| Parent | Children | Categories |
|--------|----------|------------|
| Maker/Sky | Maker CDP, Sky Savings, Spark | CDP, Yield, Lending |
| Aave | Aave V2, Aave V3, GHO | Lending, CDP |
| Frax | Frax Lend, Frax Ether, sFRAX | Lending, Liquid Staking, Yield |

## Scope

We are tracking protocols where **TVL is managed by the project / vault managers / curators** — not directly controlled by end users. These are the categories where users deposit into a protocol and the protocol decides where that TVL gets deployed:

- **Basis Trading** — TVL deployed into perps, DEXs, lending venues
- **CDPs** — collateral deployed into yield strategies, lending, LPs
- **Risk Curators** — TVL allocated across lending markets, vaults
- **Yield Aggregators** — TVL routed to DEX LPs, lending, staking
- **Liquidity Managers** — TVL deployed into CLMM positions on DEXs
- **Leveraged Farming** — TVL deployed into DEX farms + lending
- **Indexes** — TVL held as baskets across various protocols
- **Onchain Capital Allocators** — TVL lent to institutions or deployed into credit

The common thread: users don't choose where the TVL goes. The protocol does.

---

## Target Protocol Categories

For each category below, the question is the same: **where does this protocol's TVL actually live?**

### Priority 1 (First Focus — $100M+ TVL)

#### Basis Trading
Users deposit → protocol deploys into perp positions, DEXs, lending venues to earn funding rates.

| Protocol | Adapter | Where TVL lives | Chain |
|----------|---------|-----------------|-------|
| Ethena USDe | `ethena` | CEX perps (Binance, Bybit, OKX), staked ETH (Lido), Aave, Morpho, Maker | Ethereum |
| Ethena USDtb | `ethena-usdtb` | BlackRock BUIDL (tokenized T-bills) | Ethereum |
| Carrot | `carrot` | Drift vaults, basis trade positions | Solana |
| Resolv | `resolv` | Delta-neutral positions across venues | Ethereum |
| UXD Protocol | `uxd` | Mango Markets, Drift | Solana |
| Elixir | `elixir` | Market making positions across DEXs | Multi |

#### CDPs
Users deposit → protocol holds/deploys collateral to back minted synthetics/stablecoins.

| Protocol | Adapter | Where TVL lives | Chain |
|----------|---------|-----------------|-------|
| Abracadabra | `abracadabra` | Yearn, Curve, Sushi LP | Multi |
| Prisma | `prisma` | Curve pools | Ethereum |
| Liquity | `liquity` | Direct hold (ETH) — `_self_custody` | Ethereum |
| Hubble | `hubble` | Lending protocols, staking | Solana |
| Parrot | `parrot` | Underlying DEX pools | Solana |

#### Risk Curators / Managed Vaults
Users deposit → curator/manager decides where TVL gets allocated.

| Protocol | Adapter | Where TVL lives | Chain |
|----------|---------|-----------------|-------|
| Gauntlet (Morpho) | `gauntlet` | Morpho markets, lending pools | Ethereum |
| Steakhouse (Morpho) | `steakhouse` | Morpho markets | Ethereum |
| MEV Capital (Morpho) | `mev-capital` | Morpho markets | Ethereum |
| Sommelier | `sommelier` | Aave, Uniswap, various DeFi | Ethereum |
| Maple Finance | `maple` | Institutional borrowers | Ethereum, Solana |

---

### Priority 2 (Next Phase — $100M+ TVL)

#### Yield Aggregators
Users deposit → protocol routes TVL to highest-yield venues.

| Protocol | Where TVL lives |
|----------|-----------------|
| Yearn | Curve, Aave, Compound, Convex |
| Beefy | Various DEX LPs, lending protocols |
| Convex | Curve gauges |
| Harvest Finance | Various DeFi protocols |
| Idle Finance | Aave, Compound, Clearpool |

#### Liquidity Managers
Users deposit → protocol manages CLMM positions on DEXs.

| Protocol | Where TVL lives |
|----------|-----------------|
| Kamino | Raydium, Orca, Meteora CLMMs |
| Arrakis | Uniswap V3 pools |
| Gamma | Uniswap V3, QuickSwap, etc. |
| Ichi | Uniswap V3 pools |

#### Leveraged Farming
Users deposit → protocol borrows and deploys into amplified farm positions.

| Protocol | Where TVL lives |
|----------|-----------------|
| Alpaca Finance | PancakeSwap, Venus lending |
| Francium | Raydium, Orca, lending |
| Tulip | Solana DEXs and lending |

#### Indexes
Users deposit → protocol holds basket of positions across other protocols.

| Protocol | Where TVL lives |
|----------|-----------------|
| Index Coop | Aave, Compound, Uniswap |
| TokenSets | Various DeFi protocols |
| PieDAO | Balancer, Sushi, lending |

#### Onchain Capital Allocators
Users deposit → protocol lends to institutions or deploys into credit markets.

| Protocol | Where TVL lives |
|----------|-----------------|
| Maple Finance | Institutional borrowers |
| Goldfinch | Real-world credit facilities |
| Clearpool | Institutional borrowers |

---

## Technical Design

### Two New Adapter Export Keys: `supplies` and `owes`

These live **directly in the main TVL adapter** alongside `tvl`, `borrowed`, `staking`, etc:

```js
// Existing keys and what they mean:
//   tvl        → what users deposited INTO this protocol
//   borrowed   → what users borrowed FROM this protocol
//   staking    → what's staked in this protocol
//
// New keys:
//   supplies   → where THIS PROTOCOL's funds currently sit (in other protocols)
//   owes       → what THIS PROTOCOL currently owes to other protocols
```

Both return an **array of entries**, each with a DefiLlama protocol slug and standard token balances:

```js
// projects/neutral-trade/index.js
module.exports = {
  solana: {
    tvl,      // standard TVL function (unchanged)
    supplies: async (api) => [
      { protocol: "hyperliquid", balances: { "solana:USDC_MINT": 500000000 } },
      { protocol: "@",           balances: { "solana:USDC_MINT": 2100000000 } },
      { protocol: "drift",       balances: {} },  // disabled post-hack
    ],
  }
}
```

Each entry uses:
- **`protocol`** — the DefiLlama protocol slug (e.g., `"drift"`, `"jupiter-perps"`, `"kamino"`)
- **`@`** — special slug for self-custody (funds not in another protocol)
- **`balances`** — standard token balances format (same as `tvl` returns), gets USD-priced automatically

### Why This Format Works

1. **Lives in the main adapter** — no separate files, co-located with the TVL code
2. **Reuses existing utilities** — same `api.add(token, amount)` pattern as `tvl`
3. **Gets real USD values** — each entry's balances go through the same pricing pipeline
4. **Double-entry built in** — `supplies` = where funds sit, `owes` = what protocol borrows
5. **Backward compatible** — test.js skips `supplies`/`owes` keys, existing TVL unaffected
6. **Protocol slugs are verifiable** — must match an existing adapter in `/projects/`

### Example: Vectis (Double-Entry)

```js
// projects/vectis/index.js
module.exports = {
  solana: {
    tvl,
    supplies: async (api) => {
      const entries = [];
      // Voltr vaults — funds sit in Voltr
      const voltrApi = new sdk.ChainApi({ chain: "solana" });
      // ... read voltr vault balances into voltrApi ...
      entries.push({ protocol: "voltr", balances: voltrApi.getBalances() });

      // Jupiter perps — JLP collateral locked
      const jupApi = new sdk.ChainApi({ chain: "solana" });
      // ... read jupiter positions into jupApi ...
      entries.push({ protocol: "jupiter-perps", balances: jupApi.getBalances() });

      // Hyperliquid margin
      const hlApi = new sdk.ChainApi({ chain: "solana" });
      // ... read hyperliquid positions ...
      entries.push({ protocol: "hyperliquid", balances: hlApi.getBalances() });

      return entries;
    },
    owes: async (api) => {
      // USDC borrowed against JLP from Jupiter Perps
      const debtApi = new sdk.ChainApi({ chain: "solana" });
      // ... read borrow positions ...
      return [
        { protocol: "jupiter-perps", balances: debtApi.getBalances() },
      ];
    },
  }
}
```

Output:
```
SUPPLIES (protocol funds sitting in):
  voltr                          $13.18 M
  jupiter-perps                   $8.21 M
  hyperliquid                     $1.40 M
  Total                          $22.79 M

OWES (protocol debt to):
  jupiter-perps                   $4.97 M
  Total                           $4.97 M
```

### Handling Off-Chain / Hardcoded Data

For protocols like Ethena where TVL lives on CEXs, add hardcoded balances with a descriptive slug:

```js
supplies: async (api) => [
  // On-chain reserves (read from chain)
  { protocol: "@", balances: onchainApi.getBalances() },
  // CEX positions (hardcoded from proof-of-reserves)
  { protocol: "binance-cex", balances: { "ethereum:USDC_ADDR": 2500000000e6 } },
  { protocol: "bybit-cex", balances: { "ethereum:USDC_ADDR": 1200000000e6 } },
  // Staked ETH
  { protocol: "lido", balances: { "ethereum:stETH_ADDR": 500000000e18 } },
]
```

### Runner: `projects/tvl-transparency/index.js`

A standalone script that reads any adapter's `supplies`/`owes` and displays USD-valued breakdowns:

```bash
# Show where neutral-trade's TVL sits
node projects/tvl-transparency/index.js --adapter projects/neutral-trade

# "Who gets hit if Drift is hacked?" — scan all adapters for supplies to drift
node projects/tvl-transparency/index.js --exposure drift
```

### Changes to Existing Files

| File | Change |
|------|--------|
| `projects/helper/whitelistedExportKeys.json` | Add `"supplies"`, `"owes"` |
| `test.js` | Skip `supplies`/`owes` keys (they return arrays, not balances) |
| Individual adapters | Add `supplies`/`owes` functions alongside existing `tvl` |

---

## Historical Snapshots (Time Machine)

### Why History Matters

Dependencies change over time. A protocol might:
- Switch from Aave V2 to Aave V3
- Add a new downstream venue (e.g., Ethena adding Morpho as a deployment target)
- Remove a downstream after a hack (e.g., protocols pulling out of Drift post-exploit)
- A curator rebalances vault allocations entirely

Being able to see "what did the dependency graph look like on April 1st 2026, the day before Drift was hacked?" is critical for post-mortem analysis and understanding historical risk exposure.

### Design: Git-Based Snapshots

The dependency graph is deterministic from the adapter code. Since adapters live in git, **every git commit is already a historical snapshot**. The graph generator script can be run against any commit:

```bash
# Current dependency graph
node scripts/generateDependencyGraph.js

# Graph as of a specific date
git stash && git checkout `git rev-list -n 1 --before="2026-04-01" main` -- projects/
node scripts/generateDependencyGraph.js --output snapshots/2026-04-01.json
git checkout main -- projects/ && git stash pop
```

### Automated Daily Snapshots

For convenience, a scheduled job can generate and store daily snapshots:

```bash
# Output directory for snapshots
snapshots/
  2026-04-01.json
  2026-04-02.json
  2026-04-03.json   # ← today
  latest.json       # ← symlink to today
```

**Snapshot format** — same as the standard graph output, plus metadata:

```json
{
  "generated": "2026-04-03T00:00:00Z",
  "snapshotDate": "2026-04-03",
  "gitCommit": "abc123...",
  "stats": { ... },
  "edges": [ ... ],
  "forward": { ... },
  "reverse": { ... }
}
```

### Diff Between Snapshots

```bash
# What dependencies changed between two dates?
node scripts/generateDependencyGraph.js --diff 2026-03-01 2026-04-01
```

Output:
```json
{
  "added": [
    { "from": "ethena", "to": "morpho", "category": "lending", "addedDate": "2026-03-15" }
  ],
  "removed": [
    { "from": "carrot", "to": "drift", "category": "perps", "removedDate": "2026-04-02" }
  ],
  "unchanged": [ ... ]
}
```

### Current Focus

**For now, we only implement current-state graph generation.** Historical support is designed into the system (git-native, snapshot-friendly output format) so it can be added later without changing the adapter format or graph structure. The `snapshotDate` and `gitCommit` fields in the output future-proof the format.

---

### Runner: `projects/tvl-transparency/index.js`

```bash
# Show where a protocol's TVL sits (reads supplies/owes from the main adapter)
node projects/tvl-transparency/index.js --adapter projects/neutral-trade

# "Who gets hit if Drift is hacked?" — scan all adapters for supplies to drift
node projects/tvl-transparency/index.js --exposure drift
```

**Example output:**
```
neutral-trade
======================================================================
  [solana]
  SUPPLIES (protocol funds sitting in):
    hyperliquid                    $0.00
    @                              $21.29 M
    drift                          $0.00
    ──────────────────────────────────────────────────
    Total                          $21.29 M
```

---

## Implementation Phases

### Phase 1: Foundation (Done)
1. Add `supplies`/`owes` to `whitelistedExportKeys.json`
2. Update `test.js` to skip `supplies`/`owes` (they return arrays, not balances)
3. Create `projects/tvl-transparency/index.js` runner with `--adapter` and `--exposure` commands
4. Add `supplies` to `neutral-trade` adapter as proof of concept

### Phase 2: Priority 1 Protocols ($100M+ TVL)
5. Add `supplies`/`owes` to vectis, gauntlet, carrot adapters
6. **Basis Trading:** Ethena (hardcoded CEX + onchain reserves), Resolv
7. **CDPs:** Abracadabra, Prisma (trace where collateral sits)
8. **Risk Curators:** Gauntlet, Steakhouse, Sommelier
9. Ensure parent-child protocols each get their own `supplies` (Ethena USDe vs USDtb)

### Phase 3: Priority 2 + Historical Snapshots
10. Expand to yield aggregators, liquidity managers, leveraged farming, indexes ($100M+ TVL)
11. Add `--snapshot` flag to save timestamped JSON output
12. Add `--diff` flag to compare snapshots and show added/removed edges

### Phase 4: Visualization & API
13. Graphviz DOT output for visual dependency maps
14. CSV export for spreadsheet analysis
15. Potential integration with DefiLlama API/frontend for risk dashboards

---

## Why This Matters: The Drift Hack Case Study

```
Carrot's TVL lives in → Drift ($10M), Kamino ($2M)
Neutral Trade's TVL lives in → Drift ($5M), Kamino ($3M), Hyperliquid ($2M)
Vectis's TVL lives in → Drift ($4M), Jupiter Perp ($1M)

Drift gets hacked →
  Carrot: $10M exposed (83% of TVL)
  Neutral Trade: $5M exposed (50% of TVL)
  Vectis: $4M exposed (57% of TVL)
  Total cascade: $19M across 3 protocols
```

With this system:
```bash
$ node projects/tvl-transparency/index.js --exposure drift

Protocols with funds supplied to "drift":
────────────────────────────────────────────────────────────
  carrot                    [solana] $10.00 M
  neutral-trade             [solana] $5.00 M
  vectis                    [solana] $4.00 M
────────────────────────────────────────────────────────────
  Total at risk                     $19.00 M
```

- **Before depositing:** users check where a protocol's TVL actually sits and how concentrated it is
- **Risk monitoring:** identify systemic concentration ("$500M from 15 protocols all sits in Protocol X")
- **During a hack:** immediately see which protocols are exposed and by how much
- **Post-mortem:** historical snapshots show how the dependency graph looked at the time of the hack

---

## Relationship to Existing TVL Keys

| Key | Direction | What it tracks | Returns |
|-----|-----------|---------------|---------|
| `tvl` | Users → Protocol | What users deposited into this protocol | Token balances |
| `borrowed` | Users ← Protocol | What users borrowed from this protocol | Token balances |
| `staking` | Users → Protocol | What users staked in this protocol | Token balances |
| **`supplies`** | **Protocol → Others** | **Where this protocol's funds sit** | **Array of `{ protocol, balances }`** |
| **`owes`** | **Protocol ← Others** | **What this protocol borrowed from others** | **Array of `{ protocol, balances }`** |

`supplies` and `owes` live directly in the main adapter. They don't change how TVL is calculated — they add visibility into where it lives and what the protocol owes.


Future Ideas:

- DefiBeat

Sources:

- https://github.com/walletbeat/walletbeat/tree/beta
- https://www.walletbeat.fyi/
- https://beta.walletbeat.eth.limo/
- https://curatorwatch.com/
- https://www.defiscan.info/
- https://demo.rmckinley.net/
- https://app.defi-sphere.com/
- https://www.stakingrewards.com/defi
