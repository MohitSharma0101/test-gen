#!/usr/bin/env bash
# Shared helpers for the database backup workflows (.github/workflows/db-*.yml).
set -euo pipefail

TOOLS_VERSION="100.10.0"

install_tools() {
  # MongoDB Database Tools (mongodump / mongorestore), pinned.
  if ! command -v mongodump >/dev/null; then
    curl -fsSL "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2204-x86_64-${TOOLS_VERSION}.tgz" -o /tmp/tools.tgz
    tar -xzf /tmp/tools.tgz -C /tmp
    sudo cp /tmp/mongodb-database-tools-*/bin/* /usr/local/bin/
  fi
  mongodump --version | head -1
}

# R2 speaks the S3 API; the AWS CLI is preinstalled on GitHub runners.
r2() {
  AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" AWS_DEFAULT_REGION=auto \
    aws --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" "$@"
}

# AES-256 with a passphrase (PBKDF2). Decrypt locally with:
#   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in FILE.enc -out FILE.archive.gz
encrypt() { openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:BACKUP_PASSPHRASE -in "$1" -out "$2"; }
decrypt() { openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in "$1" -out "$2"; }

# Document counts per collection of one database, as JSON, using the Node
# driver (mongosh isn't on the runner).
counts() { # $1 = uri, $2 = db name
  (cd /tmp && [ -d node_modules/mongodb ] || npm i --no-save --silent mongodb@6 >/dev/null)
  NODE_PATH=/tmp/node_modules node -e '
    const { MongoClient } = require("mongodb");
    (async () => {
      const c = await MongoClient.connect(process.argv[1]);
      const db = c.db(process.argv[2]); const out = {};
      for (const { name } of await db.listCollections({}, { nameOnly: true }).toArray())
        if (!name.startsWith("system.")) out[name] = await db.collection(name).estimatedDocumentCount();
      console.log(JSON.stringify(out, Object.keys(out).sort(), 0)); await c.close();
    })().catch((e) => { console.error(e.message); process.exit(1); });
  ' "$1" "$2"
}

# Keep only the newest N files under a prefix.
prune() { # $1 = prefix (e.g. daily/), $2 = keep
  r2 s3 ls "s3://${R2_BUCKET}/$1" | awk '{print $4}' | grep '\.enc$' | sort -r | tail -n +"$(( $2 + 1 ))" |
    while read -r f; do
      base="${f%.archive.gz.enc}"
      r2 s3 rm "s3://${R2_BUCKET}/$1$f"
      r2 s3 rm "s3://${R2_BUCKET}/$1$base.counts.json" || true
    done
}
