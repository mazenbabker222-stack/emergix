// Runs before every test file. Integration tests need a real Postgres in DATABASE_URL_TEST
// (schema pushed first: DATABASE_URL=$DATABASE_URL_TEST pnpm --filter @workspace/db run push);
// without it they are skipped. Unit tests only need *a* URL because pg connects lazily.
process.env.APP_URL ??= 'http://localhost:5173';
process.env.SESSION_SECRET ??= 'test-secret-test-secret-test-secret-123456';
process.env.E2E_TEST_HOOKS = '1';
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? 'postgres://test:test@127.0.0.1:5432/unit_tests_unused';
