-- V5__drop_resource_jobs.sql
-- ADR-007: RabbitMQ replaces PostgreSQL resource_jobs for async ingestion.
-- No Java/Python/TS code references this table; only V1 migration DDL remains.
-- Safe to drop.

DROP INDEX IF EXISTS idx_resource_jobs_status_available_lease;
DROP TABLE IF EXISTS resource_jobs;
