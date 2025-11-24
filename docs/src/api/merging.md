---
title: "Merging & Joins"
nav_order: 4
parent: "API Reference"
description: "Combine and join DataFrames using concat and merge operations"
---

# Merging & Joins

BoxFrame provides two main ways to combine DataFrames: **concatenation** (stacking) and **merging** (SQL-style joins).

## Concatenation

The `concat()` method stacks DataFrames vertically or horizontally. This is useful for combining datasets with the same structure or adding columns side-by-side.

### Vertical Concatenation (axis=0)

Stacks DataFrames on top of each other, adding rows:

```typescript
const df1 = new DataFrame({
    id: [1, 2],
    name: ["Alice", "Bob"],
    age: [25, 30]
});

const df2 = new DataFrame({
    id: [3, 4],
    name: ["Charlie", "Diana"],
    age: [35, 28]
});

const result = BoxFrame.concat([df1, df2], 0);
// Result: 4 rows with id, name, age columns
```

**When columns don't match:**

```typescript
const df1 = new DataFrame({ id: [1, 2], name: ["Alice", "Bob"] });
const df2 = new DataFrame({ id: [3, 4], age: [25, 30] });

const result = BoxFrame.concat([df1, df2], 0);
// Result: 4 rows with id, name, age columns
// Missing values are filled with null
```

### Horizontal Concatenation (axis=1)

Stacks DataFrames side-by-side, adding columns:

```typescript
const df1 = new DataFrame({ id: [1, 2], name: ["Alice", "Bob"] });
const df2 = new DataFrame({ age: [25, 30], city: ["NY", "LA"] });

const result = BoxFrame.concat([df1, df2], 1);
// Result: 2 rows with id, name, age, city columns
```

**With ignore_index option:**

```typescript
const result = BoxFrame.concat([df1, df2], 0, { ignore_index: true });
// Creates new sequential index: [0, 1, 2, 3, ...]
```

## SQL-Style Joins (merge)

The `merge()` method performs SQL-style joins based on matching key values. This is essential for combining datasets with related information.

### Join Types

BoxFrame supports four join types:

- **inner**: Only rows with matching keys in both DataFrames
- **left**: All rows from left DataFrame, matched with right where available
- **right**: All rows from right DataFrame, matched with left where available
- **outer**: All rows from both DataFrames

### Basic Merge Examples

#### Inner Join

```typescript
const customers = new DataFrame({
    id: [1, 2, 3],
    name: ["Alice", "Bob", "Charlie"]
});

const orders = new DataFrame({
    customer_id: [2, 3, 4],
    order_total: [100, 200, 150]
});

// Inner join - only matching rows
const result = BoxFrame.merge(customers, orders, {
    leftOn: "id",
    rightOn: "customer_id",
    how: "inner"
});
// Result: 2 rows (id 2 and 3 matched)
```

#### Left Join

```typescript
// Left join - all customers, with orders where available
const result = BoxFrame.merge(customers, orders, {
    leftOn: "id",
    rightOn: "customer_id",
    how: "left"
});
// Result: 3 rows (all customers, order_total is null for id=1)
```

#### Right Join

```typescript
// Right join - all orders, with customer info where available
const result = BoxFrame.merge(customers, orders, {
    leftOn: "id",
    rightOn: "customer_id",
    how: "right"
});
// Result: 3 rows (all orders, name is null for customer_id=4)
```

#### Outer Join

```typescript
// Outer join - all rows from both DataFrames
const result = BoxFrame.merge(customers, orders, {
    leftOn: "id",
    rightOn: "customer_id",
    how: "outer"
});
// Result: 4 rows (all customers and all orders)
```

### Same Column Names

When both DataFrames have the same column name for the key, use `on`:

```typescript
const df1 = new DataFrame({ id: [1, 2, 3], name: ["Alice", "Bob", "Charlie"] });
const df2 = new DataFrame({ id: [2, 3, 4], age: [25, 30, 35] });

const result = BoxFrame.merge(df1, df2, { on: "id", how: "inner" });
```

### Multiple Join Keys

You can join on multiple columns:

```typescript
const df1 = new DataFrame({
    year: [2020, 2020, 2021],
    month: [1, 2, 1],
    sales: [1000, 1500, 1200]
});

const df2 = new DataFrame({
    year: [2020, 2020, 2021],
    month: [1, 2, 2],
    expenses: [500, 600, 550]
});

const result = BoxFrame.merge(df1, df2, {
    on: ["year", "month"],
    how: "inner"
});
// Matches rows where both year AND month are equal
```

### Column Name Conflicts

When both DataFrames have columns with the same name (other than join keys), the right DataFrame's columns get a suffix:

```typescript
const df1 = new DataFrame({ id: [1, 2], value: [10, 20] });
const df2 = new DataFrame({ id: [1, 2], value: [100, 200] });

const result = BoxFrame.merge(df1, df2, { on: "id", how: "inner" });
// Result columns: id, value (from df1), value_y (from df2)
```

**Custom suffixes:**

```typescript
const result = BoxFrame.merge(df1, df2, {
    on: "id",
    how: "inner",
    suffixes: ["_left", "_right"]
});
// Result columns: id, value_left, value_right
```

### Duplicate Keys (Cartesian Product)

When a key appears multiple times in either DataFrame, merge creates a cartesian product:

```typescript
const df1 = new DataFrame({
    id: [1, 1, 2],
    name: ["Alice", "Alice", "Bob"]
});

const df2 = new DataFrame({
    id: [1, 1, 3],
    order: ["A", "B", "C"]
});

const result = BoxFrame.merge(df1, df2, { on: "id", how: "inner" });
// Result: 4 rows (2 left rows × 2 right rows for id=1)
```

## When to Use Concat vs Merge

### Use `concat()` when:
- Combining datasets with the same structure (same columns)
- Appending new rows to existing data
- Adding columns side-by-side (axis=1)
- Simple stacking operations

### Use `merge()` when:
- Combining related data from different sources
- Joining on key values (like SQL JOIN)
- Need to match rows based on specific columns
- Working with relational data

## Complete Example

```typescript
// Employee data
const employees = new DataFrame({
    emp_id: [1, 2, 3, 4],
    name: ["Alice", "Bob", "Charlie", "Diana"],
    dept_id: [10, 20, 10, 30]
});

// Department data
const departments = new DataFrame({
    dept_id: [10, 20, 30],
    dept_name: ["Engineering", "Sales", "HR"]
});

// Join employees with departments
const withDept = BoxFrame.merge(employees, departments, {
    leftOn: "dept_id",
    rightOn: "dept_id",
    how: "left"
});

// Add salary data (same structure, use concat)
const newEmployees = new DataFrame({
    emp_id: [5, 6],
    name: ["Eve", "Frank"],
    dept_id: [20, 10]
});

const allEmployees = BoxFrame.concat([employees, newEmployees], 0);
```

## API Reference

### BoxFrame.concat()

```typescript
static concat(
    dataFrames: DataFrame[],
    axis?: 0 | 1,
    options?: { ignore_index?: boolean }
): DataFrame
```

**Parameters:**
- `dataFrames`: Array of DataFrames to concatenate
- `axis`: `0` for vertical (rows), `1` for horizontal (columns). Default: `0`
- `options.ignore_index`: If `true`, creates new sequential index. Default: `false`

### BoxFrame.merge()

```typescript
static merge(
    left: DataFrame,
    right: DataFrame,
    options?: MergeOptions
): DataFrame
```

**Parameters:**
- `left`: Left DataFrame
- `right`: Right DataFrame
- `options`: Merge configuration

**MergeOptions:**
```typescript
interface MergeOptions {
    how?: "inner" | "left" | "right" | "outer";  // Join type (default: "inner")
    on?: string | string[];                       // Column name(s) if same in both
    leftOn?: string | string[];                  // Left DataFrame key column(s)
    rightOn?: string | string[];                 // Right DataFrame key column(s)
    suffixes?: [string, string];                  // Suffixes for conflicts (default: ["_x", "_y"])
}
```

**Notes:**
- Either specify `on` (same column names) or both `leftOn` and `rightOn` (different names)
- Multiple keys are supported by passing arrays
- Unmatched rows are filled with `null` values
- Duplicate keys create cartesian products (all combinations)

