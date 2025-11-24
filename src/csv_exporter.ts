/**
 * CSV Export - Functions for converting DataFrames to CSV format and writing to files
 */

import type { DataFrame } from "./dataframe.ts";
import type { DataValue } from "./types.ts";

/**
 * Options for CSV export
 */
export interface CsvExportOptions {
    /** Custom delimiter (default: ',') */
    delimiter?: string;
    /** Whether to include index column (default: false) */
    includeIndex?: boolean;
}

/**
 * Escape CSV value (handles quotes, commas, newlines)
 */
export function escapeCsvValue(value: string, delimiter: string): string {
    if (value.includes('"') || value.includes("\n") || value.includes("\r") || value.includes(delimiter)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/**
 * Format value for CSV output
 */
export function formatCsvValue(value: DataValue): string {
    if (value === null || value === undefined) {
        return "";
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    return String(value);
}

/**
 * Convert DataFrame to CSV string
 * Optimized for performance - skips unnecessary escape checks for simple values
 */
export function toCsv(df: DataFrame, options: CsvExportOptions = {}): string {
    const delimiter = options.delimiter || ",";
    const includeIndex = options.includeIndex ?? false;
    const numCols = df.columns.length;

    // Fast escape check - only for strings that might need it
    const needsEscape = (s: string): boolean => {
        if (s.length === 0) return false;
        // Quick character-by-character check (faster than includes for short strings)
        for (let i = 0; i < s.length; i++) {
            const c = s[i];
            if (c === '"' || c === "\n" || c === "\r" || c === delimiter) {
                return true;
            }
        }
        return false;
    };

    const parts: string[] = [];
    parts.length = df.length + 1; // Pre-allocate: header + rows

    // Header
    const headerCols: string[] = [];
    if (includeIndex) {
        headerCols.push("index");
    }
    headerCols.push(...df.columns);
    parts[0] = headerCols.map((col) => {
        const needsEsc = needsEscape(col);
        return needsEsc ? `"${col.replace(/"/g, '""')}"` : col;
    }).join(delimiter);

    // Process rows - optimize by checking value type before string conversion
    for (let i = 0; i < df.length; i++) {
        const rowParts: string[] = [];
        rowParts.length = numCols + (includeIndex ? 1 : 0);
        let colIdx = 0;

        if (includeIndex) {
            const idxVal = df.index[i];
            const idxStr = String(idxVal);
            // Numbers and simple strings rarely need escaping
            if (typeof idxVal === "number" || (typeof idxVal === "string" && idxStr.length < 50)) {
                // Quick check for common problematic chars
                let needsEsc = false;
                for (let j = 0; j < idxStr.length; j++) {
                    const c = idxStr[j];
                    if (c === '"' || c === "\n" || c === "\r" || c === delimiter) {
                        needsEsc = true;
                        break;
                    }
                }
                rowParts[colIdx++] = needsEsc ? `"${idxStr.replace(/"/g, '""')}"` : idxStr;
            } else {
                rowParts[colIdx++] = needsEscape(idxStr) ? `"${idxStr.replace(/"/g, '""')}"` : idxStr;
            }
        }

        for (const col of df.columns) {
            const series = df.data.get(col);
            let val: string;
            let rawValue: DataValue = null;
            if (series) {
                rawValue = series.values[i];
                if (rawValue === null || rawValue === undefined) {
                    val = "";
                } else if (rawValue instanceof Date) {
                    val = rawValue.toISOString();
                } else {
                    val = String(rawValue);
                }
            } else {
                val = "";
            }

            // Fast path for numbers - they never need escaping
            if (typeof rawValue === "number") {
                rowParts[colIdx++] = val;
            } else if (val.length < 50) {
                // Quick check for short strings
                let needsEsc = false;
                for (let j = 0; j < val.length; j++) {
                    const c = val[j];
                    if (c === '"' || c === "\n" || c === "\r" || c === delimiter) {
                        needsEsc = true;
                        break;
                    }
                }
                rowParts[colIdx++] = needsEsc ? `"${val.replace(/"/g, '""')}"` : val;
            } else {
                rowParts[colIdx++] = needsEscape(val) ? `"${val.replace(/"/g, '""')}"` : val;
            }
        }

        parts[i + 1] = rowParts.join(delimiter);
    }

    return parts.join("\n");
}
