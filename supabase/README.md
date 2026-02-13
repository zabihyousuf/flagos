# Supabase migrations

Migrations are in `migrations/` as timestamped `.sql` files.

## Apply a migration

### Option 1: Supabase MCP (Cursor)

With the [Supabase MCP server](https://mcp.supabase.com) enabled in Cursor (see `.mcp.json`):

- Use the **apply_migration** tool and pass the migration file path (e.g. `supabase/migrations/20250212000000_add_first_down_to_field_settings.sql`), or  
- Use the **execute_sql** tool and run the SQL from the migration file.

### Option 2: Supabase CLI

From the repo root:

```bash
npx supabase link --project-ref ppljqzbekesprxmbfuso   # if not already linked
npx supabase db push
```

The project ref is also in `.mcp.json` (`project_ref=ppljqzbekesprxmbfuso`).
