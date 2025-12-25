# Hierarchical Categories System Design

## Current State

- Categories stored as 2-element arrays: `["Parent", "Child"]`
- Displayed as flat strings: `"Mat og drikke ➡ Dagligvarer"`
- No expand/collapse functionality
- Fixed 2 levels only

## Target State

### Data Structure

Categories stored as arrays of arbitrary depth:

```json
{
  "Grocery Stores, Supermarkets": ["Mat og drikke", "Dagligvarer"],
  "Some Specific Store": ["Mat og drikke", "Dagligvarer", "Rema"],
  "Airlines": ["Reise", "Flyselskap"],
  "SAS Domestic": ["Reise", "Flyselskap", "SAS", "Domestic"]
}
```

### Display Behavior

User controls a "depth" setting (0 to max depth in data).

**Level 0 (most collapsed):**
| Category       | Jan  | Feb  | Sum   | Avg  |
|----------------|------|------|-------|------|
| Mat og drikke  | 8000 | 7500 | 15500 | 7750 |
| Reise          | 5000 | 6000 | 11000 | 5500 |

**Level 1:**
| Category                     | Jan  | Feb  | Sum   | Avg  |
|------------------------------|------|------|-------|------|
| Mat og drikke → Dagligvarer  | 5000 | 4500 | 9500  | 4750 |
| Mat og drikke → Restaurant   | 3000 | 3000 | 6000  | 3000 |
| Reise → Flyselskap           | 3000 | 4000 | 7000  | 3500 |
| Reise → Hotel                | 2000 | 2000 | 4000  | 2000 |

**Level 2 (more expanded):**
| Category                           | Jan  | Feb  | Sum  | Avg  |
|------------------------------------|------|------|------|------|
| Mat og drikke → Dagligvarer → Rema | 3000 | 2500 | 5500 | 2750 |
| Mat og drikke → Dagligvarer → Kiwi | 2000 | 2000 | 4000 | 2000 |
| ...                                | ...  | ...  | ...  | ...  |

### Key Requirements

1. **Unlimited depth**: Category arrays can have any number of elements
2. **Dynamic aggregation**: When depth < max, amounts roll up to parent categories
3. **User control**: Slider or buttons to adjust visible depth
4. **Separator**: Use `→` between levels in display
5. **Sorting**: Categories sorted alphabetically at each level

### Implementation Components

1. **Data model change**: `CategoryMapping` values become `string[]` (variable length)
2. **Category truncation**: Function to truncate category path to N levels
3. **Aggregation logic**: Group and sum by truncated category path
4. **UI control**: Depth selector component
5. **State management**: Track current display depth

### Edge Cases

- Transactions with categories shorter than display depth: show as-is
- Empty categories: show as "Ukjent kategori"
- Mixed depths in same parent: aggregate correctly at each level
