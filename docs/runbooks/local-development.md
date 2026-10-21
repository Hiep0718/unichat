# Local development runbook

## Preconditions

Use the approved portable runtimes under `.tools` or matching system installations. Copy `.env.example` to `.env` and provide local-only secrets.

## Internal service keys

Generate two distinct RSA key pairs: one Core identity and one AI identity. Private keys must be unencrypted PKCS#8 PEM, and public keys must be X.509 SubjectPublicKeyInfo PEM. OpenSSL can create compatible local-only material:

```text
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out .service-keys/core-service-private.pem
openssl pkey -in .service-keys/core-service-private.pem -pubout -out .service-keys/core-service-public.pem
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out .service-keys/ai-service-private.pem
openssl pkey -in .service-keys/ai-service-private.pem -pubout -out .service-keys/ai-service-public.pem
```

Keep private keys local, outside version control, logs and shared messages. Configure `CORE_SERVICE_PRIVATE_KEY_PATH`, `CORE_SERVICE_PUBLIC_KEY_PATH`, `AI_SERVICE_PRIVATE_KEY_PATH` and `AI_SERVICE_PUBLIC_KEY_PATH` as shown in `.env.example`; paths in the repository `.env` are repository-root-relative. `dev-service.ps1` normalizes only those four non-empty relative paths to absolute paths before starting child services. When launching a service without the dev runner, use absolute paths or preserve the repository-root working-directory relationship.

## Startup order

1. PostgreSQL and ChromaDB.
2. AI Service on the private application network.
3. Core API.
4. Frontend.

## Verification

Run frontend lint/typecheck/test/build, Core API verify and AI Service ruff/mypy/pytest before integration. Never call Gemini or other external providers from automated tests.

## Troubleshooting

Use request IDs across services. Inspect structured logs without printing tokens, prompts, chunks or document contents. Do not weaken CORS, authorization or Evidence Gate to bypass local failures.

If Core compiles but stops during Flyway initialization with SQLSTATE `08001` and an authentication `EOFException`, inspect database connectivity separately from compilation. For the long-running Spring/Hibernate datasource, use the Supabase **session pooler on port5432**, retain `sslmode=require`, and omit startup `options=-c TimeZone=...`. The JVM already selects `Asia/Ho_Chi_Minh`; do not assume a transaction pooler retains session timezone settings. See the [official Spring Boot connection guide](https://supabase.com/docs/guides/getting-started/quickstarts/spring-boot).

Verify an actual JDBC read-only query with the same JVM, URL and credentials before restarting Core. A successful TCP connection or unit test does not establish application readiness. Check `/actuator/health` after the startup log reports success; an open port alone is insufficient. Inspect existing Flyway metadata before starting against a shared database, and obtain approval if any migration is pending.

Hive setup, gate migration, admission/drain và provider rollback: [Hive generation](hive-generation.md). New gate schema chưa được apply vào shared DB phải được phê duyệt trước khi startup/restart Core; giữ database tests trên disposable PostgreSQL.
