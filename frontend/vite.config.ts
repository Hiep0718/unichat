import { existsSync, readFileSync } from 'node:fs';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * The development certificate, when one has been generated.
 *
 * Returns undefined rather than throwing if the files are missing: needing a
 * certificate is the exception, and failing the dev server for everyone else
 * would be worse than serving plain HTTP.
 */
function devCertificate() {
  const key = process.env.DEV_TLS_KEY;
  const cert = process.env.DEV_TLS_CERT;
  if (!key || !cert || !existsSync(key) || !existsSync(cert)) return undefined;
  return { key: readFileSync(key), cert: readFileSync(cert) };
}

export default defineConfig({
  plugins: [react()],
  server: {
    // Loopback by default. `npm run dev -- --host` exposes it on the LAN for
    // testing from another machine, which is a decision about the network the
    // machine is on rather than something to switch on for everyone.
    host: '127.0.0.1',
    port: 5173,
    // HTTPS when a certificate is provided, because getUserMedia does not
    // exist outside a secure context: on a LAN address or a tunnel the call
    // button cannot open a microphone at all. localhost is exempt, so plain
    // HTTP stays the default and nobody needs a certificate to work locally.
    //
    //   mkcert -key-file dev-key.pem -cert-file dev-cert.pem localhost 192.168.1.x
    //   DEV_TLS_KEY=dev-key.pem DEV_TLS_CERT=dev-cert.pem npm run dev -- --host
    https: devCertificate(),
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8082',
        changeOrigin: true,
      },
      // Work Chat's STOMP socket. `ws: true` is what makes the dev server
      // forward the upgrade rather than answering it as a plain request.
      '/ws': {
        target: 'http://127.0.0.1:8082',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Mỗi worker dựng một jsdom riêng, và ở số worker mặc định chúng bị hệ
    // điều hành giết giữa chừng: báo cáo trả về "Worker exited unexpectedly"
    // kèm số test nhảy loạn giữa các lần chạy, vì file của worker chết thì
    // không được tính. Không test nào hỏng cả — chỉ là hết bộ nhớ. Giới hạn
    // lại để một lần chạy luôn đếm đúng số file.
    maxWorkers: '50%',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/test-setup.ts',
        'src/**/*.test.{ts,tsx}',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});