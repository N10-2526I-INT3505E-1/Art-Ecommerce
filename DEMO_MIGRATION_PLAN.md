# Demo Migration Plan: Vercel Free + Render Free + Turso Free

## TL;DR

| Layer              | Service                                             | Cost         |
| ------------------ | --------------------------------------------------- | ------------ |
| **Frontend (SSR)** | Vercel Free (SvelteKit)                             | $0           |
| **Backend API**    | Render Free (ElysiaJS monolith)                     | $0           |
| **Database**       | Turso Free (existing 4× LibSQL DBs)                 | $0           |
| **Search**         | Replace Meilisearch → SQLite LIKE queries via Turso | $0           |
| **AI Service**     | Stubbed (canned responses)                          | $0           |
| **Payments**       | Stubbed (instant "paid" in demo)                    | $0           |
| **Message Queue**  | Eliminated (no RabbitMQ)                            | $0           |
| **Total**          |                                                     | **$0/month** |

---

## Current vs. New Architecture

### Before (requires multiple servers):

```
Browser → SvelteKit → Gateway(:3000) → Users(:4004)
                                      → Products(:4003)
                                      → Orders(:4001)
                                      → Payments(:4002)
                                      → Search(:4005) → Meilisearch
                       AI Service(:8000) → Ollama + Qdrant
```

### After (two free-tier hosts):

```
Browser → SvelteKit (Vercel Free)
              │
              │ fetch()
              ▼
         ElysiaJS API Monolith (Render Free)
              │
              │ HTTP (libsql driver)
              ▼
         Turso (Free) — 4 databases
```

---

## Why This Combo Works

### Vercel Free (Frontend + SSR)

- **1M function invocations/month** — SvelteKit SSR pages
- **10s function timeout** (60s configurable) — plenty for API calls
- **100 GB-hrs function duration**
- **1,000 image optimizations** — product thumbnails
- Great global CDN for static assets (CSS, JS, images)

### Render Free (Backend API)

- **750 instance-hours/month** (enough for 1 service 24/7)
- Spins down after 15min idle → **~1min cold start** (acceptable for demo)
- Supports Node.js / Bun web services
- Can connect to external DBs (Turso) over HTTPS
- Custom domain + TLS included

### Turso Free (Database)

- **5GB storage**, **500M reads/month**, **10M writes/month**
- No expiration (unlike Render Postgres 30-day limit!)
- HTTP-based driver — works from serverless AND Render
- Already has your data

---

## Implementation Plan

### Phase 1: Consolidate Backend into Single ElysiaJS Monolith

The existing `services/api/src/index.ts` already does this! It runs all plugins on port 3000. We just need to:

1. **Remove Meilisearch dependency** — replace search with DB LIKE queries
2. **Remove RabbitMQ dependency** — orders/payments work synchronously
3. **Stub payment URL generation** — return fake "paid" status
4. **Keep everything else** — users, products, orders all work via Turso

#### Files to modify in `services/api/`:

**`services/api/src/index.ts`** — Re-enable orders & payments plugins (without RabbitMQ):

```ts
// Current (orders/payments commented out):
// .use(ordersPlugin({ orderService: new OrderService(orderDb) }))
// .use(paymentsPlugin({ paymentService: new PaymentService(paymentDb) }))

// New: use simplified versions without RabbitMQ
.use(ordersPlugin({ orderService: new OrderService(orderDb) }))
.use(paymentsPlugin({ paymentService: new PaymentService(paymentDb) }))
```

**`services/api/src/search/meilisearch.service.ts`** — Replace with DB-backed search:

```ts
// Replace Meilisearch client with direct Turso queries
// search() → SELECT ... FROM products WHERE name LIKE '%query%'
// indexProduct() / updateProduct() / deleteProduct() → no-op
```

**`services/api/src/products/product.service.ts`** — Remove Meilisearch calls:

- `createProduct()` — remove `meilisearchService.indexProduct()` call
- `update()` — remove `meilisearchService.updateProduct()` call
- `delete()` — remove `meilisearchService.deleteProduct()` call

**`services/api/src/orders/index.ts`** — Remove RabbitMQ:

- Remove `rabbitPlugin()` usage
- Remove `.onStart()` consumer logic
- Keep CRUD operations (they use Turso directly)

**`services/api/src/payments/index.ts`** — Remove RabbitMQ:

- Remove `rabbitPlugin()` usage
- Stub VNPay IPN handler
- Keep basic payment CRUD

**`services/api/src/orders/order.service.ts`** — Remove RabbitMQ:

- Remove channel/queue references
- `createOrder()` works directly with DB (no expiry queue)
- `calculateTotalAmount()` — call product DB directly instead of HTTP

### Phase 2: Deploy Backend to Render

#### Create `Dockerfile.api` (or use Render's native Node.js):

Option A — **Native Bun on Render** (simpler):

```
# Render Build Command:
bun install

# Render Start Command:
cd services/api && bun run src/index.ts

# Environment: Node
# Or use Docker for Bun runtime
```

Option B — **Dockerfile** (if Render doesn't support Bun natively):

```dockerfile
FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lock ./
COPY services/api/ ./services/api/
RUN bun install --production
EXPOSE 3000
CMD ["bun", "run", "services/api/src/index.ts"]
```

#### Render Environment Variables:

```env
# Turso (all 4 DBs)
TURSO_PRODUCTS_DATABASE_URL=libsql://...
TURSO_PRODUCTS_AUTH_TOKEN=...
TURSO_USERS_DATABASE_URL=libsql://...
TURSO_USERS_AUTH_TOKEN=...
TURSO_ORDERS_DATABASE_URL=libsql://...
TURSO_ORDERS_AUTH_TOKEN=...
TURSO_PAYMENTS_DATABASE_URL=libsql://...
TURSO_PAYMENTS_AUTH_TOKEN=...

# Auth
JWT_SECRET=your-secret-here

# No Meilisearch, no RabbitMQ, no VNPay needed!
```

#### Render Service Config:

- **Type**: Web Service (Free)
- **Runtime**: Docker (for Bun) or Node.js
- **Build Command**: `bun install`
- **Start Command**: `bun run services/api/src/index.ts`
- **Port**: `3000`

### Phase 3: Deploy Frontend to Vercel

#### `apps/web/svelte.config.js` — Switch to Vercel adapter:

```js
import adapter from '@sveltejs/adapter-vercel';
export default {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
	},
};
```

#### Install:

```bash
cd apps/web && bun add -D @sveltejs/adapter-vercel
```

#### Vercel Environment Variables:

```env
# Point to Render backend
PRIVATE_API_URL=https://your-api.onrender.com
PUBLIC_API_URL=https://your-api.onrender.com

# Google OAuth (if keeping)
PUBLIC_GOOGLE_CLIENT_ID=...

# Optional demo flag
PUBLIC_DEMO_MODE=true
```

#### Vercel Project Config:

- **Root Directory**: `apps/web`
- **Framework**: SvelteKit (auto-detected)
- **Build Command**: `bun run build`
- **Install Command**: `bun install`

### Phase 4: Replace Meilisearch with DB Search

**Option A: Simple LIKE queries** (easiest, good enough for demo):

Create new `services/api/src/search/db-search.service.ts`:

```ts
import { db } from '../products/db';
import { products, categories, product_tags, tags } from '../products/product.model';
import { like, and, gte, lte, isNull, desc, eq } from 'drizzle-orm';

export class DbSearchService {
	async search(query: string, options: any = {}) {
		const conditions = [isNull(products.deletedAt)];
		if (query) conditions.push(like(products.name, `%${query}%`));
		if (options.filter) {
			/* parse filter string into conditions */
		}

		const results = await db.query.products.findMany({
			where: and(...conditions),
			limit: options.limit || 20,
			orderBy: [desc(products.createdAt)],
			with: { category: true, productTags: { with: { tag: true } } },
		});

		return {
			hits: results.map((p) => ({
				id: p.id,
				name: p.name,
				description: p.description,
				price: p.price,
				imageUrl: p.imageUrl,
				categoryName: p.category?.name || 'Uncategorized',
				tags: p.productTags.map((pt) => pt.tag?.name).filter(Boolean),
			})),
			processingTimeMs: 0,
			estimatedTotalHits: results.length,
			limit: options.limit || 20,
		};
	}
}
```

Then in `services/api/src/search/index.ts`, swap `meilisearchService` for `DbSearchService`.

**Option B: Turso's SQLite FTS5** (if available — better search quality):

```sql
-- Could use FTS5 virtual table for full-text search
-- This depends on Turso supporting FTS5 extensions
```

### Phase 5: Stub AI Service

Modify the frontend to not call the external AI service:

**`apps/web/src/routes/ai-consult/+page.svelte`** — Replace fetch to AI:

```ts
// Before:
const response = await fetch('https://api.novus.io.vn/analyze', { ... });

// After:
const response = {
  ok: true,
  json: async () => ({
    analysis: "🏠 **Phân tích Demo**\n\nĐây là bản demo...",
    products: data.sampleProducts // show some products from DB
  })
};
```

**`apps/web/src/lib/components/AIChatWidget.svelte`** — Replace WebSocket:

- Show a text input with canned responses
- Or disable with message: "AI tư vấn chỉ có trong phiên bản đầy đủ"

### Phase 6: Handle Render Cold Starts

Since Render spins down after 15min idle with ~1min cold start:

1. **Add a loading state** in the SvelteKit frontend for when API is waking up
2. **Optional**: Set up a free cron ping (e.g., UptimeRobot free tier) to keep Render awake:
   - Ping `https://your-api.onrender.com/` every 14 minutes
   - UptimeRobot free = 50 monitors, 5-min intervals

3. **Add retry logic** in `apps/web/src/lib/server/http.ts`:

```ts
// Already has retry: { limit: 2 } — this helps with cold starts
```

---

## Summary of Changes

### Files to Modify

#### Backend (`services/api/`):

| File                                | Change                                               |
| ----------------------------------- | ---------------------------------------------------- |
| `src/index.ts`                      | Re-enable orders/payments plugins (without RabbitMQ) |
| `src/search/meilisearch.service.ts` | Replace with DB-backed search                        |
| `src/search/index.ts`               | Use new DbSearchService                              |
| `src/products/product.service.ts`   | Remove Meilisearch index/update/delete calls         |
| `src/orders/index.ts`               | Remove RabbitMQ plugin + consumers                   |
| `src/orders/order.service.ts`       | Remove RabbitMQ channel, simplify                    |
| `src/payments/index.ts`             | Remove RabbitMQ, stub VNPay                          |

#### Frontend (`apps/web/`):

| File                                     | Change                            |
| ---------------------------------------- | --------------------------------- |
| `svelte.config.js`                       | Switch to `adapter-vercel`        |
| `.env`                                   | Point `PRIVATE_API_URL` to Render |
| `src/routes/ai-consult/+page.svelte`     | Stub AI analyze call              |
| `src/lib/components/AIChatWidget.svelte` | Stub WebSocket → canned response  |
| `src/lib/api-client.ts`                  | Update default prod URL           |
| `src/lib/server/http.ts`                 | Update default prod URL           |

### Files to Create

| File                                           | Purpose                      |
| ---------------------------------------------- | ---------------------------- |
| `services/api/src/search/db-search.service.ts` | DB-backed search replacement |
| `Dockerfile.api` (optional)                    | Bun Docker image for Render  |
| `render.yaml` (optional)                       | Render Blueprint for IaC     |

### Files/Services Eliminated

| What                | Why                                      |
| ------------------- | ---------------------------------------- |
| `services/gateway/` | Not needed — frontend calls API directly |
| `services/ai/`      | Stubbed in frontend                      |
| Meilisearch         | Replaced with DB LIKE queries            |
| RabbitMQ            | Not needed for synchronous demo          |
| Qdrant              | Part of AI service — eliminated          |
| Ollama              | Part of AI service — eliminated          |

---

## Render Cold Start Mitigation Options

| Option                            | Cost               | Effectiveness                  |
| --------------------------------- | ------------------ | ------------------------------ |
| UptimeRobot ping every 5min       | Free (50 monitors) | ✅ Keeps service warm          |
| Cron-job.org ping                 | Free               | ✅ Keeps service warm          |
| Accept cold starts                | $0                 | ⚠️ ~1min first load after idle |
| Upgrade to Render Starter ($7/mo) | $7/mo              | ✅ No spin-down                |

---

## Estimated Effort

| Task                                       | Effort           |
| ------------------------------------------ | ---------------- |
| Remove Meilisearch from product.service.ts | ~30 min          |
| Create DbSearchService                     | ~2 hours         |
| Remove RabbitMQ from orders + payments     | ~2 hours         |
| Re-enable orders/payments in index.ts      | ~30 min          |
| Stub AI in frontend                        | ~1 hour          |
| Switch to adapter-vercel + configure       | ~30 min          |
| Create Dockerfile / Render config          | ~1 hour          |
| Update env vars + API URLs                 | ~30 min          |
| Deploy to Render                           | ~1 hour          |
| Deploy to Vercel                           | ~30 min          |
| Test end-to-end                            | ~2 hours         |
| **Total**                                  | **~11-12 hours** |

---

## Deployment Checklist

- [ ] Remove Meilisearch dependency from backend
- [ ] Remove RabbitMQ dependency from backend
- [ ] Create DB-backed search service
- [ ] Re-enable orders & payments plugins
- [ ] Stub VNPay payment flow
- [ ] Test backend runs standalone: `bun run services/api/src/index.ts`
- [ ] Deploy backend to Render (free web service)
- [ ] Verify Render can reach Turso DBs
- [ ] Switch SvelteKit to adapter-vercel
- [ ] Update frontend API URLs to point to Render
- [ ] Stub AI features in frontend
- [ ] Deploy frontend to Vercel
- [ ] Set environment variables on both platforms
- [ ] Test full flow: browse → search → login → cart → checkout
- [ ] (Optional) Set up UptimeRobot to prevent Render cold starts
