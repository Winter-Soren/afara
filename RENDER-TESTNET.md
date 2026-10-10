# Full Toju server on Render Free

This is the complete `tojunetwork/afara` server, based on
`a0053d5fdd81904e00d1f6ac5889af31a8153d9d`. No route families or background-job
handlers have been removed. QuantumNodes runs separately and calls this API.

Render: Node 22.22.3, Free compute, Singapore, repository root blank.
Build: `corepack pnpm --filter server... install --frozen-lockfile --prod=false && corepack pnpm --dir server build`
Start: `corepack pnpm --dir server exec tsx scripts/migrate.ts staging && node server/dist/index.js`
Health check: `/health/live` (process liveness; `/health` retains the database check).
Disable auto-deploy during the demo. Neon Free: 0.25 CU, 5-minute idle shutdown.

Required secret environment: DATABASE_URL, ADMIN_API_KEY, PINATA_JWT,
RESEND_API_KEY, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY.
Other environment: PINATA_GATEWAY, EMAIL_FROM, EMAIL_REPLY_TO, BASE_URL,
X402_NETWORK=sepolia, BASE_USDC_WALLET, SOLANA_RPC_URL=https://api.testnet.solana.com,
SOLANA_PROGRAM_IDL (checked-in IDL JSON), FILECOIN_NETWORK=calibration,
NODE_ENV=staging, NODE_VERSION=22.22.3, HUSKY=0, SKIP_INSTALL_DEPS=true.
Do not supply a mainnet wallet key or run Solana initialization/deployment commands.

Fresh database pricing: 3e-12 USD/byte/day, minimum 7 days. Read the existing
Solana testnet config to populate its public admin/withdrawal addresses; no
administrative private key is required to use the initialized testnet program.

## Fixes to the upstream revision

- Execute migration SQL with Neon `query()`; `unsafe()` only constructs a SQL fragment.
- Correct fresh-schema SQL literals and transaction table names.
- Quote Base storage in USD with the same micro-USDC rounding as the payment gate.
- Reject missing payment configuration instead of allowing an unpaid agent upload.
- Validate the uploaded file before payment; optional export ID and hash bind agent approvals.
- Return Pinata's actual CID and persist the facilitator's real settlement hash.
- Claim a unique agent export before pinning; expose receipt lookup for uncertain outcomes.
- Add non-database liveness checks so Render probes do not keep Neon awake.
- Bound multipart memory usage and update Multer's security fixes.
- Preserve QStash signature verification for empty-body scheduled requests.

All existing Solana, Filecoin, storage, pricing, transaction, console and job routes
remain mounted. Contract-admin operations still require the mentor's authority;
configuring an API does not grant it. Production/mainnet has not been exercised.
