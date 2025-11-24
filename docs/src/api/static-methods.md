---
title: "Static Methods"
nav_order: 5
parent: "API Reference"
description: "BoxFrame static factory methods and utilities"
---

# BoxFrame Static Methods

**BoxFrame is a static namespace** - it contains only static methods for creating DataFrames, Series, and performing data operations. You never instantiate BoxFrame. Instead, use it as a factory and utility namespace.

## DataFrame Creation

- `BoxFrame.DataFrame(data: DataFrameInput, options?)` - Create DataFrame
- `BoxFrame.fromRecord(data: Record<string, ColumnData>, options?)` - Create from record
- `BoxFrame.fromObjects(objects: RowData[], options?)` - Create from array of objects

## Series Creation

- `BoxFrame.Series(data: DataValue[], options?)` - Create Series
- `BoxFrame.fromArray(data: DataValue[], options?)` - Create Series from array

## Data I/O

BoxFrame provides methods for **reading** data from various sources. For exporting data, use the DataFrame instance methods `toCsv()` and `toJSON()`, then write to files using standard file I/O.

**Note:** Direct file writing methods (e.g., `writeCsv()`, `writeJson()`) are under consideration for future releases. For now, use the export methods combined with standard file I/O libraries.

### Reading Data

- `BoxFrame.readCsv(pathOrUrl: string, options?)` - Read CSV file or URL
- `BoxFrame.parseCsv(content: string, options?)` - Parse CSV string
- `BoxFrame.readJson(pathOrUrl: string, options?)` - Read JSON file
- `BoxFrame.readGoogleSheet(spreadsheetId: string, sheetName?, options?)` - Read Google Sheets
- `BoxFrame.readGoogleSheetFromUrl(url: string, sheetName?, options?)` - Read Google Sheets from URL

### Exporting Data

Use DataFrame instance methods:
- `df.toCsv(options?)` - Convert to CSV string (see [DataFrame API](dataframe#export))
- `df.toJSON()` - Convert to JSON object (see [DataFrame API](dataframe#export))

**Example:**
```typescript
// Read data
const df = await BoxFrame.readCsv("data.csv");

// Export to CSV string
const csv = df.toCsv();
await Deno.writeTextFile("output.csv", csv);

// Export to JSON
const json = df.toJSON();
await Deno.writeTextFile("output.json", JSON.stringify(json, null, 2));
```

## Data Manipulation

- `BoxFrame.concat(dataFrames: DataFrame[], axis?, options?)` - Concatenate DataFrames
- `BoxFrame.merge(left: DataFrame, right: DataFrame, options?)` - SQL-style joins
- `BoxFrame.toNumeric(data: Series | DataValue[])` - Convert to numeric
- `BoxFrame.toDatetime(data: Series | DataValue[])` - Convert to datetime
- `BoxFrame.cut(data: Series, bins: number | number[], labels?)` - Cut into bins
- `BoxFrame.dateRange(options?)` - Generate date range

**See [Merging & Joins](merging) for detailed documentation on `concat()` and `merge()` operations.**
