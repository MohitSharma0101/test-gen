# Database backup and restore

The Atlas cluster is on the **free M0 tier, which has no backups of its own**, so these GitHub workflows are the only safety net. They cover the whole `test` database, which holds the data for both apps.

| Workflow | When | What it does |
|---|---|---|
| `DB backup` (`.github/workflows/db-backup.yml`) | Every night at 02:47 IST, or on demand | Dumps the `test` database with `mongodump`, encrypts it (AES-256), and uploads it to Cloudflare R2 with that night's per-collection document counts. Keeps the 7 newest daily, 4 weekly (Sundays) and 12 monthly (1st of the month) copies. Backups started by hand with a label go to `manual/` and are never deleted automatically |
| `DB restore` (`.github/workflows/db-restore.yml`) | Only when you start it | Restores a backup into a separate cluster (`copy`) or over the live collections (`replace`), for all collections or the ones you name |

Cost: ₹0 (GitHub Actions free minutes; R2's free 10 GB).

Scheduled workflows only run from the **default branch (`main`)**, so the nightly backup starts once this is merged.

---

## One-time setup (about 15 minutes)

### 1. Atlas: two database users

Atlas → your project → **Database Access** → **Add New Database User** (password authentication):

| User | Built-in role | Used for |
|---|---|---|
| `backup` | **Only read any database** | Nightly backup, and the safety backup before a restore |
| `restore` | **Read and write to any database** | Restores only |

Build the connection strings from the existing one:
`mongodb+srv://backup:<password>@cluster0.nfwacai.mongodb.net/?retryWrites=true&w=majority`
(and the same with `restore`).

**Network Access** must allow GitHub's runners. Their IP addresses change, so the access list needs `0.0.0.0/0`. That's usually already the case for Vercel; check it.

### 2. Cloudflare R2: a bucket and a key

1. Create a free Cloudflare account. Open **R2** (Cloudflare asks for a payment method to enable R2; the first 10 GB a month are free).
2. **Create bucket** `eplus-backups`. Location hint: Asia-Pacific.
3. **Manage API tokens** → **Create API token**. Permission: **Object Read & Write**, limited to `eplus-backups`.
4. Note the **Access Key ID**, the **Secret Access Key**, and your **Account ID** (shown on the R2 overview page).

### 3. A passphrase

Make a long random passphrase (for example 5–6 random words). **Store it outside GitHub too**, in a password manager or on paper. Without it the backups can't be opened, and nobody can recover it.

### 4. GitHub secrets

Repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret | Value |
|---|---|
| `MONGO_BACKUP_URI` | Connection string for the `backup` user |
| `MONGO_RESTORE_URI` | Connection string for the `restore` user |
| `MONGO_COPY_URI` | *(optional)* connection string for a second, empty cluster, for `copy` restores. A free M0 in another Atlas project works for one collection at a time; M0 is capped at 512 MB |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 token access key ID |
| `R2_SECRET_ACCESS_KEY` | R2 token secret |
| `R2_BUCKET` | `eplus-backups` |
| `BACKUP_PASSPHRASE` | The passphrase |

Optional **variable** (not secret) `DB_NAME`, if the database is ever renamed from `test`.

### 5. First run

**Actions** → **DB backup** → **Run workflow**, label `first`. Check that the run is green and that the summary shows a size and the collection counts. The file should then appear in R2 under `manual/`.

---

## Before risky data changes

Run **DB backup** by hand with a label (for example `before-remark`) before any bulk change, such as "Re-mark all tests", an import or a migration. Labelled backups are kept until you delete them in R2.

## How to restore

**Actions** → **DB restore** → **Run workflow**:

| Field | Example |
|---|---|
| backup | `daily/2026-11-16` or `manual/2026-11-16-before-remark` (as listed in R2, without `.archive.gz.enc`) |
| mode | `copy` to look at the data elsewhere first; `replace` to put it back on the live cluster |
| collections | `answersheets` (blank = every collection) |
| confirm | For `replace` only: `REPLACE LIVE DATA` |

`replace` first saves the current live data as `manual/<date-time>-pre-restore`, so a restore can be undone the same way. Each restored collection is **replaced**, not merged: anything written to it after the backup is lost. Restore only the collections that need it.

Collection names: `answersheets`, `questions`, `papers`, `schedulepapers`, `users`, `batches`, `attendances`, `examresults`, `feesummaries`, `chapters`, `books`, `accounts`, `counters`, `facesignatures`, `bookmarks`, `suggestions`.

### Restoring by hand (without GitHub)

Download the file from the R2 dashboard, then on any computer with the [MongoDB Database Tools](https://www.mongodb.com/try/download/database-tools):

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in daily-2026-11-16.archive.gz.enc -out backup.archive.gz
# asks for the passphrase
mongorestore --uri="<connection string>" --gzip --archive=backup.archive.gz --nsInclude="test.answersheets" --drop
```

MongoDB Compass can also open the restored data for inspection.
