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

Keep private keys local, outside version control, logs and shared messages. Configure `CORE_SERVICE_PRIVATE_KEY_PATH`, `CORE_SERVICE_PUBLIC_KEY_PATH`, `AI_SERVICE_PRIVATE_KEY_PATH` and `AI_SERVICE_PUBLIC_KEY_PATH` as shown in `.env.example`; paths in the repository `.env` are repository-root-relative. `dev-service.ps1` normalizes only those four non-empty relative paths to absolute paths before starting child services. When launching a service without the dev runner, use absolute paths or preserve the repository-root working-directory relationship. When `CORE_SERVICE_PRIVATE_KEY_PATH` or `AI_SERVICE_PUBLIC_KEY_PATH` is absent, Core API falls back to the repository-root-relative defaults `.service-keys/core-service-private.pem` and `.service-keys/ai-service-public.pem` declared on the `ServiceKeys` constructor; the keys are still required at first use, so generate them as shown above.

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

### Metro thoát ngay với mã `3221226505`

`npm run dev` trong `mobile/` thoát với `3221226505` (`0xC0000409`,
`STATUS_STACK_BUFFER_OVERRUN`) và nhật ký kết thúc bằng:

```
Starting Metro Bundler
FATAL ERROR: Zone Allocation failed - process out of memory
```

Đây **không** phải lỗi của dự án: thông báo "out of memory" đi kèm heap chỉ vài
MB nghĩa là hệ điều hành từ chối cấp vùng nhớ, chứ không phải V8 tràn heap.
Metro chết lúc dựng zone đầu tiên, trước khi đọc bất kỳ tệp nguồn nào, nên
`--clear`, xoá `node_modules` hay sửa `metro.config.js` đều không giúp gì.

Đo hạn mức commit của máy:

```powershell
$os = Get-CimInstance Win32_OperatingSystem
"FreePhysical_MB={0:N0}" -f ($os.FreePhysicalMemory/1KB)
"FreeCommit_MB={0:N0}"   -f ($os.FreeVirtualMemory/1KB)
```

Dưới khoảng 2.000 MB free commit thì Metro không khởi động được. Tìm thứ đang
giữ chỗ — lưu ý sắp xếp theo **commit**, không theo working set, vì một dịch vụ
nằm im có thể giữ hàng GB hạn mức mà working set chỉ 1 MB:

```powershell
Get-Process | Group-Object Name | ForEach-Object {
  [pscustomobject]@{
    Name = $_.Name; Count = $_.Count
    Commit_MB = [math]::Round((($_.Group | Measure-Object PrivateMemorySize64 -Sum).Sum)/1MB)
  }
} | Sort-Object Commit_MB -Descending | Select-Object -First 15
```

Trên máy phát triển ngày 2026-11-02, thủ phạm là các hệ cơ sở dữ liệu
auto-start **không được dự án dùng** (UniChat chỉ dùng PostgreSQL): MariaDB
2.137 MB và bốn thể hiện SQL Server Express 1.690 MB. Đặt chúng về khởi động
thủ công, trong một PowerShell có quyền admin:

```powershell
$names = @('MariaDB','MSSQL$SQLEXPRESS','MSSQL$SQLEXPRESS01',
           'MSSQL$SQLEXPRESS02','MSSQL$SQLEXPRESS03')
foreach ($n in $names) {
  if (Get-Service -Name $n -ErrorAction SilentlyContinue) {
    Stop-Service -Name $n -Force
    Set-Service  -Name $n -StartupType Manual
  }
}
```

Chỉ dừng tiến trình và đổi chế độ khởi động; không gỡ cài đặt và không chạm
vào dữ liệu của chúng. Cần lại thì `Start-Service <tên>`.

Cùng nguyên nhân này cũng làm jest trong `mobile/` báo "Jest worker encountered
4 child process exceptions" và một số bộ test **không chạy nổi** dù không bộ
nào sai. Không hạ `maxWorkers` trong `jest.config.js` để chữa: đó là triệu
chứng của máy, và hạ xuống sẽ làm CI chậm hơn.
