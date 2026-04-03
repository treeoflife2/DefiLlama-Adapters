// TVL Transparency helper
//
// Two new adapter export keys:
//
//   supplies: async (api) => [
//     { protocol: "drift", balances: { "TOKEN_MINT": 1000000 } },
//     { protocol: "hyperliquid", balances: { "USDC_MINT": 5000000 } },
//   ]
//
//   owes: async (api) => [
//     { protocol: "jupiter-perps", balances: { "USDC_MINT": 2000000 } },
//   ]
//
// "supplies" = this protocol's funds currently sitting in another protocol
//   (distinct from "tvl" which is what users deposited INTO this protocol)
//
// "owes" = this protocol currently owes another protocol
//   (distinct from "borrowed" which is what users borrowed FROM this protocol)
//
// Each entry uses the DefiLlama protocol slug (e.g., "drift", "jupiter-perps", "kamino")
// and standard token balances format — so computeTVL gives real USD values per entry.

const SUPPLIES_KEY = 'supplies'
const OWES_KEY = 'owes'

module.exports = {
  SUPPLIES_KEY,
  OWES_KEY,
}
