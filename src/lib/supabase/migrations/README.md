# Supabase Migrations

This directory tracks all SQL schema changes for the RetroLab Supabase database.

## How to Apply

Run each migration file in order in the [Supabase SQL Editor](https://supabase.com/dashboard/project/tmwkuavfhnjthcicxsed/sql/new).

## Migration History

| # | File | Description | Date |
|---|------|-------------|------|
| 001 | `001_initial_schema.sql` | Profiles, user_settings, liked_posts, saved_posts, comments + RLS + auto-provisioning trigger | 2026-03-27 |
| 002 | `002_newsletter_subscriptions.sql` | Newsletter email subscriptions table with frequency (daily/weekly) + categories + indexes + RLS policies | 2026-04-05 |
| 003 | `003_add_newsletter_categories.sql` | Adds `frequency` + `categories` columns (run after 002 if applied without them) | 2026-04-06 |

## Notes

- **001** is the foundational schema — it was originally at `credentials/supabase_schema.sql` and is kept there as well for backward compatibility.
- **002** adds the newsletter feature. If you already have the tables from 001, you only need to run 002.
- All migrations use `CREATE TABLE IF NOT EXISTS` and `CREATE POLICY` to be idempotent where possible.
