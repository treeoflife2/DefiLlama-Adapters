const {
  KAMINO_VAULTS,
  HYPERLIQUID_VAULTS,
  START_TIMESTAMP,
  TOKENS,
  VAULTS_REGISTRY_URL,
  DRIFT_VAULT_PROGRAM_ID,
  NT_VAULT_PROGRAM_ID,
} = require("./constants");
const { getConfig } = require("../helper/cache");
const { getTvl: getDriftVaultTvl } = require("./utils/drift");
const { getTvl: getKaminoVaultTvl } = require("./utils/kamino");
const { getTvl: getHyperliquidVaultTvl } = require("./utils/hyperliquid");
const { getTvl: getNtVaultTvl } = require("./utils/ntVaults");

async function getDriftAndBundleVaults() {
  const vaults = await getConfig("neutral-trade/vaults", VAULTS_REGISTRY_URL);
  if (!Array.isArray(vaults)) return { driftAddresses: [], bundleVaults: [] };
  const driftAddresses = vaults
    .filter((v) => v.type === "Drift")
    .map((v) => v.vaultAddress);
  const bundleVaults = vaults
    .filter((v) => v.type === "Bundle")
    .map((v) => {
      const token = TOKENS[v.depositToken];
      if (!token) return null;
      return {
        address: v.vaultAddress,
        token,
        programId: v.bundleProgramId ?? NT_VAULT_PROGRAM_ID,
      };
    })
    .filter(Boolean);
  return { driftAddresses, bundleVaults };
}

async function drift_vaults_tvl(api) {
  const { driftAddresses } = await getDriftAndBundleVaults();
  if (driftAddresses.length) await getDriftVaultTvl(api, driftAddresses);
}

async function kamino_vaults_tvl(api) {
  for (const vault of KAMINO_VAULTS) {
    const token_tvl = await getKaminoVaultTvl(vault.address);
    api.add(vault.token.mint, token_tvl);
  }
}

async function hyperliquid_vaults_tvl(api) {
  for (const vault of HYPERLIQUID_VAULTS) {
    const token_tvl = await getHyperliquidVaultTvl(vault.address);
    api.add(vault.token.mint, token_tvl);
  }
}

async function nt_vaults_tvl(api) {
  const { bundleVaults } = await getDriftAndBundleVaults();
  for (const vault of bundleVaults) {
    try {
      const token_tvl = await getNtVaultTvl(vault.address, vault.programId);
      api.add(vault.token.mint, token_tvl);
    } catch (e) {
      console.log(`Failed to fetch bundle vault ${vault.address}: ${e.message}`);
    }
  }
}

async function tvl(api) {
  // await drift_vaults_tvl(api);
  await kamino_vaults_tvl(api);
  await hyperliquid_vaults_tvl(api);
  await nt_vaults_tvl(api);
}


async function supplies(api) {
  const sdk = require("@defillama/sdk");
  const entries = [];

  // Hyperliquid perp vaults
  const hlApi = new sdk.ChainApi({ chain: "solana" });
  for (const vault of HYPERLIQUID_VAULTS) {
    try {
      const vaultTvl = await getHyperliquidVaultTvl(vault.address);
      hlApi.add(vault.token.mint, vaultTvl);
    } catch (e) { /* vault may be empty */ }
  }
  entries.push({ protocol: "hyperliquid", balances: hlApi.getBalances() });

  // NT bundle vaults (self-custody, not in another protocol)
  const selfApi = new sdk.ChainApi({ chain: "solana" });
  try {
    const vaults = await getConfig("neutral-trade/vaults", VAULTS_REGISTRY_URL);
    if (Array.isArray(vaults)) {
      for (const vault of vaults.filter((v) => v.type === "Bundle")) {
        const token = TOKENS[vault.depositToken];
        if (!token) continue;
        try {
          const vaultTvl = await getNtVaultTvl(
            vault.vaultAddress,
            vault.bundleProgramId ?? NT_VAULT_PROGRAM_ID
          );
          selfApi.add(token.mint, vaultTvl);
        } catch (e) { /* vault may be empty */ }
      }
    }
  } catch (e) { /* registry fetch failed */ }
  entries.push({ protocol: "@", balances: selfApi.getBalances() });

  // Drift vaults — disabled post-hack
  entries.push({ protocol: "drift", balances: {} });

  return entries;
}

module.exports = {
  start: START_TIMESTAMP,
  timetravel: false,
  hallmarks: [
    ["2026-04-01", "Drift hack"]
  ],
  doublecounted: false,
  methodology: "The combined TVL and PnL of all public and private vaults.",
  solana: { tvl, supplies },
};
