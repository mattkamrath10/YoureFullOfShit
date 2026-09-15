# Native API contracts

## Implemented public endpoints
| Method | Path | Auth | Behavior |
|---|---|---|---|
| GET | `/api/public/categories` | No | Database-backed carousel categories. |
| GET | `/api/public/stories?category=&q=&page=&limit=` | No | Published, non-demo stories ordered newest-first; category, search, and pagination. |
| GET | `/api/public/stories/:id` | No | Published story detail only. |

All responses use `{ "data": ... }`; failures use `{ "error": { "code", "message" } }`. Public responses omit author IDs, moderation state, R2 keys, and private profile fields.

## Not implemented in Phase 4A
Authenticated profile, write/story creation, block/report, entitlement, Apple verification, and restore APIs remain later phases. Existing R2 and account-deletion APIs remain web-compatible routes.
