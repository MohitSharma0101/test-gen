# Multi-institute SaaS: plan

The plan for selling the staff app and student app to other coaching institutes, managed from a super-admin console. It is written down to keep the decisions, numbers and open questions in one place.

Status: **planning, nothing built**. Last updated 2026-11-16.

Related:
- `docs/saas/market-analysis.md` is the full market research report (competitors, pricing, demand, risks), with sources.
- `CLAUDE.md` "Working rules": ask before any database change. That rule applies here too.

---

## 1. Decisions so far

| Topic | Decision |
|---|---|
| Founder setup | Full time, solo, bootstrapped |
| Education+ | **Untouched.** It keeps its current apps, MongoDB cluster and Vercel projects. The SaaS gets **separate infrastructure** |
| What we sell | A branded staff app and student app per institute, with an optional shared question library |
| B2C (pan-India student app with full syllabus) | **Deferred.** It competes with PW/Unacademy/Allen and with our own B2B customers. Revisit later, and then only as a low-priced test series |
| Online coaches / YouTubers | Not a target. That is Classplus/Graphy/Appx territory, and the product is built for the offline exam loop |
| Database type | **PostgreSQL (SQL)**. Document-style data goes in JSONB columns |
| Tenant isolation | **Shared tables + `institute_id` + row-level security (RLS)**. Not one table per institute. A large institute can move to its own database later as an upsell |
| AI features | **Premium add-on**, not in the base price |
| Mathpix | No cost today |

## 2. Market summary (from the research)

- **Verdict:** a conditional go. Sell narrowly to offline JEE/NEET and school-board coaching centres, starting in Rajasthan tier-2 cities (Ajmer, then Sikar, Jaipur and Kota). Run 3–5 paid pilots **before** building the super-admin console.
- **Incumbents have moved away from coaching software:**
  - Classplus's SaaS line earned ₹73.9 cr in FY24 at a loss; its test-prep business (Testbook) now earns more.
  - Teachmint grew mainly through school hardware and AI tools.
  - Graphy takes about 10% commission, and its parent Unacademy was sold to upGrad.
- **Our difference:** the offline exam loop as one product. That means papers generated from the institute's own question bank, three printed versions (student copy, answer key, teacher copy), AI checking of handwritten answers and weak-chapter insights, together with fees, attendance and results. None of the big vendors found sells this as one product.
- **Free alternatives:** no free all-in-one option was found. Google Workspace for Education explicitly excludes coaching businesses, and open-source Fedena has had no commits since 2016.
- **Gaps to close with real conversations:** willingness to pay, sales cycle, churn, and support hours per institute.

## 3. The offer

1. **Branded apps per institute.** Each institute gets its own name, logo, colours and app icon, on its own subdomain.
2. **Question library (add-on).** It removes the "empty question bank" barrier on day one, and competitors can't copy it quickly.
   - **Settle before selling it:**
     - **Copyright.** Questions copied from published books or coaching modules (HC Verma, Arihant, Allen, PW, NCERT…) can't be sold. Only original questions, and past papers after a legal check, can be.
     - **Ownership.** Who owns the code and the library: the founder or Education+? This needs a written agreement first.
   - **How to audit the library:**
     - Count questions per book: an admin report, needing no database change.
     - Google-search the exact text of about 20 random questions per subject.
     - Collect proof of original writing.
     - From now on, get signed rights assignments from anyone who writes questions.
3. **AI pack (premium):** AI checking of answer sheets, question variants and diagram prompts, with monthly quotas.

### Suggested pricing (to validate in pilots)

| Plan | Price (excl. GST) | For |
|---|---|---|
| Starter | ₹18k / year | up to 100 students |
| Standard (lead plan) | ₹36k / year | 101–400 students |
| Institute | ₹60k / year | 400–1,000 students or several branches |
| Onboarding | ₹5k–₹15k one-time | setup and data import |
| Add-ons | question library per subject (₹10k–₹20k / year), AI pack (quota) | |
| Pass-through | WhatsApp: prepaid wallet per institute | |

Publish one clear price page. Hidden charges are the main complaint about Classplus.

## 4. Architecture

### Tenancy

- **One Postgres database. Every tenant table has `institute_id`, and RLS policies restrict each request to the current institute.** The app sets the institute on the connection (`SET app.institute_id = …`) per request, and the policies do the filtering.
- Indexes start with `institute_id` (for example `(institute_id, batch_id, date)`).
- **Export / delete one institute** is one scripted command (`WHERE institute_id = …`), needed for data-protection requests and offboarding.
- **Upsell path:** identical tables mean a big institute can be copied to its own database or server later.
- **Shared question library** lives in its own tables, read-only to institutes. A per-institute licence table controls access.
- **Rejected:**
  - One table per institute: unmanageable.
  - Schema-per-institute: every migration runs N times.
  - Database-per-institute: connections, backups and cost multiply.

### Apps and domains

- **Staff app and student app** stay as two Next.js apps, both multi-tenant.
- **Institute lookup:** the request's host (`<slug>.<product>.in`, or later a custom domain) → institute → branding and settings. The login token also carries `institute_id`, and a token is rejected on a different institute's host.
- **Wildcard subdomain** `*.<product>.in` needs the domain's nameservers on the host (Vercel), or Cloudflare in front when self-hosting.
- **Per-institute settings:** name, logo, colours, PWA manifest and icons, courses and subjects, WhatsApp number and templates, plan limits.
- **Files:** object storage per institute under `institutes/<id>/…`. Answer-sheet photos are deleted automatically after 6–12 months.
- **Branded Play Store apps** are a paid add-on: a wrapper around the student web app, **published under the institute's own Google developer account**. Google's template-app policy can suspend a whole developer account, and Apple 4.2.6 rejects template apps the client doesn't submit itself.

### Super-admin console (separate app, its own login and domain)

1. **Institutes:**
   - Create: name, slug, logo, colours, plan, first admin login. This seeds default courses and subjects.
   - Edit branding and settings.
   - **Suspend:** the institute can read its data but can't write, used when payment lapses.
2. **Usage per institute:** students, active staff, papers, tests, AI pages, storage, last active. This flags churn risk and over-plan use.
3. **Plans and limits:** student cap, AI quota, WhatsApp wallet balance, enforced in the apps.
4. **Billing:** renewal dates, Razorpay payment links and GST invoices. Automate later.
5. **Support login** ("log in as this institute's admin"), with every use written to an **audit log**.
6. **Library access:** subject packs on or off per institute.
7. **One inbox** for student suggestions from every institute, plus announcements to institutes.

### Data protection (DPDP Act 2023, Rules 2025)

- Most obligations apply from about **May 2027**.
- **Roles:** the institute is the **Data Fiduciary** (legally responsible for the data); we are its **Data Processor**. Put this in the customer agreement.
- **Parental consent:** verifiable consent (OTP to a parent) is required for students under 18.
- **Face attendance:**
  - Opt-in only.
  - Store embeddings only, never photos.
  - Delete when a student leaves.
  - Get a lawyer's view on how the DPDP exemption applies to face data.

## 5. Infrastructure and running cost

All prices were checked on 2026-11-16, mostly from official docs.

**Currency:** $1 ≈ **₹120 all-in**, from a real bill: $20 → ₹2,400 including 18% GST and the card's foreign-exchange markup.
- With GST registration and a GSTIN added at each vendor, the GST is reverse-charge and claimable, which brings $1 to about ₹100.
- A low-markup card (Niyo, Scapia) saves the roughly 3.5% card markup.

### Hosting the apps

| Option | Cost / month | Notes |
|---|---|---|
| **Vercel Pro** | **$20 ≈ ₹2,400** | 1 deploying seat (both apps as projects in one team) and $20 of usage credit. Free CDN tier: 1M CDN requests + 1 TB transfer. Mumbai compute: $0.14/CPU-hr, $0.0116/GB-hr. **Unlimited custom domains per project** (soft limit 100k) with free automatic SSL. Wildcard domains supported. One free first-year domain (.app/.dev/.co/.tech…, not .in). The Hobby plan is **not allowed** for commercial use (Vercel terms) |
| Self-hosted server: **DigitalOcean Bangalore** | 2 GB/1 vCPU **$12**; 4 GB/2 vCPU **$24**; 8 GB/4 vCPU **$48**. Backups +20% weekly / +30% daily | Official prices. Run Coolify/Dokploy for git-push deploys, with Cloudflare (free) in front for DNS, SSL, CDN and wildcard. A 4 GB server can run both apps, the database and the face service |
| Self-hosted server: **Hostinger KVM 2** (India) | ~₹1,199 renewal + GST ≈ **₹1,415** | 2 vCPU / 8 GB / 100 GB. Billed in INR (GST claimable). Price from deal sites, so check hostinger.in |
| Others | Linode/Akamai (Mumbai, Chennai) ~$24 for 4 GB; Vultr (Mumbai/Bangalore/Delhi) ~$20–24 | Third-party prices |
| Avoid | Oracle Always Free (halved Aug 2026, capacity problems, idle servers reclaimed) | |

Self-hosting cost: OS updates, firewall, backups and restore tests, monitoring, and a single point of failure. Roughly 2–4 hours a month (estimate).

### Database options

| Option | Cost | Notes |
|---|---|---|
| **Self-hosted Postgres** on the app server | ₹0 extra | Cheapest. Nightly `pg_dump` to Cloudflare R2, plus server backups |
| **CockroachDB Cloud Basic** | **$15 free credit/month** (50M request units + 10 GiB), then $0.20 per 1M request units and $0.50/GiB-month | Postgres-compatible, managed, with failover. **Mumbai (AWS ap-south-1) available.** Usage-based bill. Default isolation is serializable, so the code needs transaction retries; prefer UUID keys. Don't self-host it (licence needs telemetry, 3+ nodes) |
| **Neon** | $0.106/compute-unit-hour + $0.35/GB-month, scales to zero | Mumbai region not verified |
| **Supabase Pro** | $25/month: 8 GB database, $10 compute credit; $0.125/GB after | Compute billed around the clock |
| DigitalOcean managed Postgres | from $15.15 (1 GB RAM) | |

Mongo-compatible options, for reference: these only matter if we stay on MongoDB.
- **DigitalOcean managed MongoDB:** $15.23 single node, ~$45.69 for 3 nodes.
- **Atlas:**
  - Flex: $8–30/month. 5 GB *uncompressed* including indexes, 100 databases / 500 collections, 500 connections, daily snapshot only.
  - M10: from $60/month.
- **Azure Cosmos DB for MongoDB (RU):** free tier of 1,000 RU/s + 25 GB for life. The free throughput only covers about 2 per-institute databases, so it fits a shared-collections design only, and Mongoose has differences.
- **Azure Cosmos DB for MongoDB (vCore):** 32 GB free, but no failover, no backups and limited regions.
- **Oracle Autonomous Database, Always Free:** 2 × 20 GB, Mumbai, MongoDB API only partly compatible.
- **Google Firestore with MongoDB compatibility:** small free tier, by allowlist only.
- **Amazon DocumentDB Serverless:** ~$30/month minimum. Not cheaper.
- **FerretDB:** self-hosted, MongoDB protocol on Postgres.
- Vercel cannot host a database itself. Its Marketplace (Atlas, Neon, Supabase) only moves the provider's bill onto the Vercel invoice.

### Files and other services

- **Cloudflare R2:** 10 GB free, then $0.015/GB-month, free downloads.
  - It does **not** support the browser form-POST upload the current app uses, so switch to presigned PUT URLs.
  - Keep Cloudinary (free 25 credits/month) only for question images, or drop it.
- **Domain:** a `.in` costs about $6–9 a year to renew.
- **Email, monitoring and analytics:** free tiers (Resend, Uptime Kuma, Vercel Analytics).
- **WhatsApp:** charged to each institute's wallet. Meta's utility-message rate is about ₹0.115 and marketing about ₹0.86, plus GST.
- **AI (Gemini):** metered per institute and sold as a premium quota.

### Minimum monthly cost (no AI, no Mathpix)

| Setup | ≈ ₹ / month | Notes |
|---|---|---|
| **One 4 GB DigitalOcean server** (apps + Postgres + face service) + Cloudflare + R2 | **~₹3,750** (with daily backups) | Everything on one server |
| Hostinger KVM 2 doing the same | **~₹1,415** | Cheapest. Check the price |
| Vercel Pro + CockroachDB Basic (within the free credit) + R2 | **~₹2,400–2,500** | Fully managed. The database bill grows with use |
| Vercel Pro + DigitalOcean managed Postgres or MongoDB (1 GB) | ~₹4,200 | Fully managed, fixed price |

**Break-even:** at ₹18k/year (₹1,500/month) per institute, **2–3 institutes** cover the minimum setup. Each extra institute adds only about ₹100–300/month of infrastructure, so the base price is set by **support time** (~1–2 hours per institute per month, estimate), not servers.

## 6. Phases

| Phase | Work | Rough time (solo) |
|---|---|---|
| 0 | Ownership agreement with Education+; question-library copyright audit; 15–20 conversations with coaching owners | alongside |
| 1 | Postgres schema + RLS; port the staff app and student app to multi-tenant on the new infrastructure; seed one demo institute | 4–6 weeks |
| 2 | Super-admin console: create, brand, suspend, support login, audit log | 2–3 weeks |
| 3 | Usage counting, plan limits, AI quota, WhatsApp wallet, billing | 2 weeks |
| 4 | Shared question library + per-institute licences (after the rights audit) | 1–2 weeks |
| 5 | 3–5 paid pilots; measure onboarding and support hours; adjust pricing | 1–3 months |
| 6 | Branded Play Store apps as an add-on (per customer) | per customer |

## 7. Open questions

1. Product name and domain.
2. Hosting: self-hosted (DigitalOcean or Hostinger) or managed (Vercel + CockroachDB/Neon)?
3. Database host for Postgres: self-hosted, CockroachDB Basic, or DigitalOcean managed?
4. Console as a separate repo, or a protected app in a monorepo?
5. Who owns the code and question library (founder or Education+), in writing.
6. Legal opinion on face data under DPDP, and on reusing past exam papers.
7. GST registration for the business (input credit on Vercel/DO/Atlas bills, and GST invoices to institutes).

## 8. Sources (official docs read 2026-11-16)

- **Vercel:**
  - [Pro plan](https://vercel.com/docs/plans/pro-plan)
  - [Mumbai pricing](https://vercel.com/docs/pricing/regional-pricing/bom1)
  - [Multi-tenant limits](https://vercel.com/docs/platforms/multi-tenant-platforms/limits)
  - [Terms (Hobby non-commercial)](https://vercel.com/legal/terms)
  - [Marketplace storage](https://vercel.com/docs/marketplace-storage)
- **MongoDB Atlas:**
  - [Flex costs](https://www.mongodb.com/docs/atlas/billing/atlas-flex-costs/)
  - [Flex limitations](https://www.mongodb.com/docs/atlas/reference/flex-limitations/)
  - [Atlas limits](https://www.mongodb.com/docs/atlas/reference/atlas-limits/)
- **DigitalOcean:**
  - [Droplet pricing](https://www.digitalocean.com/pricing/droplets)
  - [Managed databases pricing](https://www.digitalocean.com/pricing/managed-databases)
  - [Backups pricing](https://docs.digitalocean.com/products/backups/details/pricing/)
- **Cloudflare:**
  - [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
  - [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- **CockroachDB:**
  - [Basic plan](https://www.cockroachlabs.com/docs/cockroachcloud/plan-your-cluster-basic)
  - [Regions](https://www.cockroachlabs.com/docs/cockroachcloud/regions)
  - [Licensing FAQs](https://docs.cockroachlabs.com/docs/stable/licensing-faqs)
- **Azure Cosmos DB:**
  - [Free tier](https://learn.microsoft.com/azure/cosmos-db/free-tier)
  - [Throughput limits](https://learn.microsoft.com/azure/cosmos-db/set-throughput)
- **Others:**
  - [Cloudinary pricing](https://cloudinary.com/pricing)
  - [Neon pricing](https://neon.com/blog/why-we-no-longer-lock-premium-features)
  - [Oracle Always Free ADB](https://docs.oracle.com/en-us/iaas/Content/GSG/Concepts/alwaysfree.htm)
  - [Amazon DocumentDB pricing](https://aws.amazon.com/documentdb/pricing/)
- **Third-party prices (verify before buying):**
  - [Hostinger VPS India](https://zoutons.com/news/hostinger-vps-hosting-price-india-2026)
  - [Supabase pricing](https://selfhost.dev/supabase-pricing-explained/)
  - [Linode review](https://betterstack.com/community/guides/web-servers/linode-akamai-review/)
