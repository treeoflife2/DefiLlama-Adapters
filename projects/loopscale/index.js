const { Program } = require("@coral-xyz/anchor");
const { getProvider, sumTokens2 } = require("../helper/solana");
const { PublicKey } = require("@solana/web3.js");

let idl = {
    "address": "1oopBoJG58DgkUVKkEzKgyG9dvRmpgeEm1AVjoHkF78",
    "version": "0.1.0",
    "metadata": {"name": "loopscale", "version": "0.1.0", "spec": "0.1.0", "description": "Created with Anchor"},
    "name": "whirlpool",
    "instructions": [],
    "accounts": [
      {
        "name": "whirlpool",
        "type": {
          "kind": "struct",
          "fields": [
            {"name": "whirlpoolsConfig", "type": "pubkey"},
            {"name": "whirlpoolBump", "type": {"array": ["u8", 1]}},
            {"name": "tickSpacing", "type": "u16"},
            {"name": "tickSpacingSeed", "type": {"array": ["u8", 2]}},
            {"name": "feeRate", "type": "u16"},
            {"name": "protocolFeeRate", "type": "u16"},
            {"name": "liquidity", "type": "u128"},
            {"name": "sqrtPrice", "type": "u128"},
            {"name": "tickCurrentIndex", "type": "i32"},
            {"name": "protocolFeeOwedA", "type": "u64"},
            {"name": "protocolFeeOwedB", "type": "u64"},
            {"name": "tokenMintA", "type": "pubkey"},
            {"name": "tokenVaultA", "type": "pubkey"},
            {"name": "feeGrowthGlobalA", "type": "u128"},
            {"name": "tokenMintB", "type": "pubkey"},
            {"name": "tokenVaultB", "type": "pubkey"},
            {"name": "feeGrowthGlobalB", "type": "u128"},
            {"name": "rewardLastUpdatedTimestamp", "type": "u64"},
            {"name": "rewardInfos", "type": {"array": [{"defined": "WhirlpoolRewardInfo"}, 3]}}
          ]
        },
        "size": 1064
      }
    ],
    "types": [
      {
        "name": "WhirlpoolRewardInfo",
        "type": {
          "kind": "struct",
          "fields": [
            {"name": "mint", "type": "pubkey"},
            {"name": "vault", "type": "pubkey"},
            {"name": "authority", "type": "pubkey"},
            {"name": "emissionsPerSecondX64", "type": "u128"},
            {"name": "growthGlobalX64", "type": "u128"}
          ]
        }
      }
    ]
}

async function tvl() {
  const provider = getProvider()
  const programId = new PublicKey("1oopBoJG58DgkUVKkEzKgyG9dvRmpgeEm1AVjoHkF78")
  idl.metadata.address = programId
  const program = new Program(idl, programId, provider)

  const pools = await program.account.whirlpool.all()
  const tokenAccounts = pools.map(i => [i.account.tokenVaultA, i.account.tokenVaultB]).flat()
  return sumTokens2({ tokenAccounts })
}

module.exports = {
  solana: { tvl, },
  isHeavyProtocol: true,
}
