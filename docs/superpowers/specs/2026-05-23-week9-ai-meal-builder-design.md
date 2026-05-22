# Week 9 — AI Meal Builder: Edge Function Deployment

## Goal

`supabase/functions/ai-meal-builder/index.ts` (166 lines) is fully implemented with three modes (`suggest`, `build`, `weekly_plan`), proper JWT authentication, Claude model selection (Haiku for quick modes, Sonnet for weekly plan), and Filipino food context. `hooks/useAIMealBuilder.ts` (270 lines) and `app/(tabs)/nutrition/mealbuilder.tsx` (519 lines) are also complete and call the function via `supabase.functions.invoke('ai-meal-builder', ...)`. The function is not yet deployed. This spec covers deploying it.

## Architecture

One operational step. No code changes.

### Action
- Deploy `supabase/functions/ai-meal-builder/index.ts` via Supabase MCP

### Not needed
- New secrets: `ANTHROPIC_API_KEY` is already set (used by the active `coach-chat` function)
- Import map or `deno.json`: function uses npm specifiers only (`npm:@anthropic-ai/sdk`, `npm:@supabase/supabase-js@2`)
- Code changes: all three layers (Edge Function, hooks, screen) are complete and reviewed

---

## Edge Function: ai-meal-builder

### Configuration
- `name`: `ai-meal-builder`
- `verify_jwt`: `true` (matches `coach-chat` pattern — requires valid user session)
- `entrypoint_path`: `index.ts`
- Single file: `supabase/functions/ai-meal-builder/index.ts`

### Modes
| Mode | Model | max_tokens | Purpose |
|------|-------|-----------|---------|
| `suggest` | `claude-haiku-4-5` | 1024 | Single meal suggestion for a slot |
| `build` | `claude-haiku-4-5` | 1024 | Up to 3 meals from user's ingredients |
| `weekly_plan` | `claude-sonnet-4-5` | 4096 | Full 7-day Filipino meal plan |

### Environment variables (already set)
- `ANTHROPIC_API_KEY` — set when `coach-chat` was deployed
- `SUPABASE_URL` — auto-injected by Supabase runtime
- `SUPABASE_ANON_KEY` — auto-injected
- `SUPABASE_SERVICE_ROLE_KEY` — auto-injected

---

## Out of Scope

- No code changes to `useAIMealBuilder.ts`, `mealbuilder.tsx`, or `mealplan.tsx`
- No new database migrations
- No new tests — no pure functions; existing 29 tests remain the suite
- `mealbuilder.tsx` navigation is already registered in `_layout.tsx` (done in Week 8)
