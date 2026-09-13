# YFOS category rebalance

## Source of truth
`public.categories` (Postgres). App loads via `getCategories()` — no hard-coded TS list.

## 8 removed
| slug | name | why |
|------|------|-----|
| crime | Crime & Strange Crimes | Replaced by Crime & Criminal Justice |
| scams | Scams & Con Artists | Replaced by Scams & Fraud |
| famous-people | Famous People | Overlaps Celebrity Encounters |
| road-trips | Road Trips & Driving | Overlaps Travel & Vacation |
| teen-years | Teen Years | Overlaps Childhood Stories |
| love-stories | Love Stories | Overlaps Relationship Stories |
| marriage-weddings | Marriage & Weddings | Narrow; overlaps Relationships |
| hidden-talents | Hidden Talents | Low broad appeal / weak differentiation |

## 8 added
See migration SQL for names/descriptions.
