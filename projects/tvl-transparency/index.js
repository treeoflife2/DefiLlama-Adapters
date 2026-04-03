const sdk = require('@defillama/sdk')
const { util: { humanizeNumber: { humanizeNumber } } } = sdk
const { SUPPLIES_KEY, OWES_KEY } = require('./helper')

// Process a supplies/owes array: compute USD value for each entry
async function processEntries(entries, chain) {
  const results = []
  for (const entry of entries) {
    const balances = entry.balances || {}
    let usdTvl = 0
    if (Object.keys(balances).length > 0) {
      const tempApi = new sdk.ChainApi({ chain })
      // Balances already have chain prefix (e.g., "solana:TOKEN_MINT")
      // Use addBalances to avoid double-prefixing
      tempApi.addBalances(balances)
      try {
        usdTvl = await tempApi.getUSDValue()
      } catch (e) {
        usdTvl = 0
      }
    }
    results.push({
      protocol: entry.protocol,
      usdTvl,
      balances,
    })
  }
  return results
}

// Run supplies/owes for a single adapter and chain
async function runAdapterChain(adapter, chain) {
  const chainObj = adapter[chain]
  if (!chainObj || typeof chainObj !== 'object') return null

  const output = { supplies: [], owes: [] }

  if (typeof chainObj[SUPPLIES_KEY] === 'function') {
    const api = new sdk.ChainApi({ chain, timestamp: Math.round(Date.now() / 1000) - 60 })
    api.api = api
    try {
      const entries = await chainObj[SUPPLIES_KEY](api)
      if (Array.isArray(entries)) {
        output.supplies = await processEntries(entries, chain)
      }
    } catch (e) {
      output.supplies = [{ protocol: '_error', usdTvl: 0, error: e.message }]
    }
  }

  if (typeof chainObj[OWES_KEY] === 'function') {
    const api = new sdk.ChainApi({ chain, timestamp: Math.round(Date.now() / 1000) - 60 })
    api.api = api
    try {
      const entries = await chainObj[OWES_KEY](api)
      if (Array.isArray(entries)) {
        output.owes = await processEntries(entries, chain)
      }
    } catch (e) {
      output.owes = [{ protocol: '_error', usdTvl: 0, error: e.message }]
    }
  }

  return output
}

// Print a single adapter's transparency data
async function printAdapter(name, adapter) {
  const chains = Object.keys(adapter).filter(k => typeof adapter[k] === 'object' && !Array.isArray(adapter[k]))

  console.log(`\n${name}`)
  console.log('='.repeat(70))

  for (const chain of chains) {
    const result = await runAdapterChain(adapter, chain)
    if (!result) continue
    if (!result.supplies.length && !result.owes.length) continue

    console.log(`\n  [${chain}]`)

    if (result.supplies.length) {
      console.log('  SUPPLIES (protocol funds sitting in):')
      let total = 0
      for (const s of result.supplies) {
        total += s.usdTvl
        const err = s.error ? ` (ERROR: ${s.error})` : ''
        console.log(`    ${s.protocol.padEnd(30)} $${humanizeNumber(Math.round(s.usdTvl))}${err}`)
      }
      console.log(`    ${'─'.repeat(50)}`)
      console.log(`    ${'Total'.padEnd(30)} $${humanizeNumber(Math.round(total))}`)
    }

    if (result.owes.length) {
      console.log('  OWES (protocol debt to):')
      let total = 0
      for (const o of result.owes) {
        total += o.usdTvl
        console.log(`    ${o.protocol.padEnd(30)} $${humanizeNumber(Math.round(o.usdTvl))}`)
      }
      console.log(`    ${'─'.repeat(50)}`)
      console.log(`    ${'Total'.padEnd(30)} $${humanizeNumber(Math.round(total))}`)
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2)

  // --adapter <path>: run a specific adapter file
  const adapterIdx = args.indexOf('--adapter')
  if (adapterIdx !== -1 && args[adapterIdx + 1]) {
    const adapterPath = require('path').resolve(process.cwd(), args[adapterIdx + 1])
    const adapter = require(adapterPath)
    const name = require('path').basename(args[adapterIdx + 1], '.js').replace('/index', '')
    await printAdapter(name, adapter)
    return
  }

  // --exposure <slug>: find all adapters with supplies to target protocol
  const exposureIdx = args.indexOf('--exposure')
  if (exposureIdx !== -1 && args[exposureIdx + 1]) {
    const target = args[exposureIdx + 1]
    const fs = require('fs')
    const path = require('path')
    const projectsDir = path.join(__dirname, '..')

    console.log(`\nProtocols with funds supplied to "${target}":`)
    console.log('─'.repeat(60))

    let totalExposed = 0
    // Scan all project directories for adapters with supplies
    const dirs = fs.readdirSync(projectsDir)
    for (const dir of dirs) {
      const indexPath = path.join(projectsDir, dir, 'index.js')
      const filePath = path.join(projectsDir, dir + '.js')
      let adapter
      try {
        adapter = fs.existsSync(indexPath) ? require(indexPath) : (fs.existsSync(filePath) ? require(filePath) : null)
      } catch (e) { continue }
      if (!adapter) continue

      const chains = Object.keys(adapter).filter(k => typeof adapter[k] === 'object' && !Array.isArray(adapter[k]))
      for (const chain of chains) {
        if (typeof adapter[chain]?.supplies !== 'function') continue
        try {
          const result = await runAdapterChain(adapter, chain)
          if (!result) continue
          for (const s of result.supplies) {
            if (s.protocol === target) {
              totalExposed += s.usdTvl
              console.log(`  ${dir.padEnd(25)} [${chain}] $${humanizeNumber(Math.round(s.usdTvl))}`)
            }
          }
        } catch (e) { continue }
      }
    }
    console.log('─'.repeat(60))
    console.log(`  ${'Total at risk'.padEnd(25)}        $${humanizeNumber(Math.round(totalExposed))}`)
    return
  }

  console.log('Usage:')
  console.log('  node projects/tvl-transparency/index.js --adapter projects/neutral-trade')
  console.log('  node projects/tvl-transparency/index.js --exposure drift')
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1) })
}

module.exports = { runAdapterChain, processEntries }
