/**
 * BoxFrame - A data analysis library for JavaScript
 */

import { Series } from "./series.ts";
import { DataFrame } from "./dataframe.ts";
import type { ColumnData, CsvOptions, DataFrameInput, DataValue, DType, Index, JsonOptions, MergeOptions, RowData } from "./types.ts";
import { isWasmEngineEnabled } from "./types.ts";
import { type CsvParseOptions, parseCsv, parseCsvFromFile } from "./csv_parser.ts";
import { readFile } from "@cross/fs/io";
import { CurrentRuntime, Runtime } from "@cross/runtime";
// Enable WASM Engine by default; users can override by setting DF_USE_WASM_ENGINE=false
// deno-lint-ignore no-explicit-any
(globalThis as any).DF_USE_WASM_ENGINE = (globalThis as any).DF_USE_WASM_ENGINE ?? true;

export * from "./types.ts";

export { Series } from "./series.ts";
export { DataFrame } from "./dataframe.ts";
export { parseCsv, parseCsvFromFile } from "./csv_parser.ts";
export { analyzeCsv, parseCsvBatchedStream, parseCsvStream } from "./csv_stream.ts";

export { GroupBy } from "./groupby.ts";
export { DataFrameGroupBy } from "./dataframe_groupby.ts";

export { GoogleSheets } from "./google_sheets.ts";

/**
 * BoxFrame namespace containing static methods for data creation and I/O
 */
export class BoxFrame {
    /**
     * Check if the WASM engine is currently enabled
     * @returns true if WASM engine is enabled, false otherwise
     */
    static isWasmEngineEnabled(): boolean {
        return isWasmEngineEnabled();
    }

    /**
     * Create a DataFrame from a record of column data
     */
    static DataFrame(data: DataFrameInput, options?: { index?: Index[]; columns?: string[] }): DataFrame {
        return new DataFrame(data, options);
    }

    /**
     * Create a DataFrame from a record of column data (alias for DataFrame)
     */
    static fromRecord(data: Record<string, ColumnData>, options?: { index?: Index[]; columns?: string[] }): DataFrame {
        return new DataFrame(data, options);
    }

    /**
     * Create a DataFrame from an array of objects
     */
    static fromObjects(objects: RowData[], options?: { index?: Index[] }): DataFrame {
        if (objects.length === 0) {
            return new DataFrame({});
        }

        const columns = Object.keys(objects[0]);
        const data: Record<string, ColumnData> = {};

        for (const col of columns) {
            data[col] = objects.map((obj) => obj[col]);
        }

        return new DataFrame(data, options);
    }

    /**
     * Create a Series from an array
     */
    static Series(data: DataValue[], options?: { name?: string; index?: Index[]; dtype?: DType }): Series {
        return new Series(data, options);
    }

    /**
     * Create a Series from an array (alias for Series)
     */
    static fromArray(data: DataValue[], options?: { name?: string; index?: Index[]; dtype?: DType }): Series {
        return new Series(data, options);
    }

    /**
     * Read CSV file using Deno standard library CSV parser
     */
    static async readCsv(pathOrUrl: string, options?: CsvParseOptions): Promise<DataFrame> {
        try {
            return await parseCsvFromFile(pathOrUrl, options);
        } catch (error) {
            throw new Error(`Failed to read CSV file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Parse CSV content from string using Deno standard library CSV parser
     */
    static parseCsv(content: string, options?: CsvParseOptions): DataFrame {
        return parseCsv(content, options);
    }

    /**
     * Read JSON file
     */
    static async readJson(pathOrUrl: string, options?: JsonOptions): Promise<DataFrame> {
        let content: string;

        if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
            try {
                const response = await fetch(pathOrUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                content = await response.text();
            } catch (error) {
                throw new Error(`Failed to fetch JSON from URL: ${error instanceof Error ? error.message : String(error)}`);
            }
        } else {
            // Check if we're in a browser environment for local file access
            if (CurrentRuntime === Runtime.Browser) {
                throw new Error(
                    "Local file reading is not supported in browser environments. Use BoxFrame.fromObjects() or provide a URL instead.",
                );
            }

            try {
                content = await readFile(pathOrUrl, "utf-8");
            } catch (error) {
                throw new Error(`Failed to read JSON file: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        try {
            const data = JSON.parse(content);
            return this.fromObjects(data, options);
        } catch (error) {
            throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Read Google Sheets (public sheets only)
     *
     * @param spreadsheetId - The Google Sheets ID from the URL
     * @param sheetName - Name of the sheet (default: "Sheet1")
     * @param options - CSV parsing options
     * @returns Promise<DataFrame>
     *
     * @example
     * ```typescript
     * // From spreadsheet ID
     * const df = await BoxFrame.readGoogleSheet("1ABC123...");
     *
     * // From full URL
     * const df = await BoxFrame.readGoogleSheetFromUrl(
     *   "https://docs.google.com/spreadsheets/d/1ABC123.../edit"
     * );
     * ```
     */
    static async readGoogleSheet(
        spreadsheetId: string,
        sheetName: string = "Sheet1",
        options?: CsvOptions,
    ): Promise<DataFrame> {
        const { GoogleSheets } = await import("./google_sheets.ts");
        return GoogleSheets.readSheet(spreadsheetId, sheetName, options);
    }

    /**
     * Read Google Sheets from URL (convenience method)
     *
     * @param url - Full Google Sheets URL
     * @param sheetName - Name of the sheet (default: "Sheet1")
     * @param options - CSV parsing options
     * @returns Promise<DataFrame>
     */
    static async readGoogleSheetFromUrl(
        url: string,
        sheetName: string = "Sheet1",
        options?: CsvOptions,
    ): Promise<DataFrame> {
        const { GoogleSheets } = await import("./google_sheets.ts");
        return GoogleSheets.readFromUrl(url, sheetName, options);
    }

    /**
     * Concatenate multiple DataFrames
     */
    static concat(dataFrames: DataFrame[], axis: 0 | 1 = 0, options: { ignore_index?: boolean } = {}): DataFrame {
        if (dataFrames.length === 0) {
            throw new Error("At least one DataFrame must be provided");
        }

        if (axis !== 0 && axis !== 1) {
            throw new Error("Axis must be 0 or 1");
        }

        if (axis === 0) {
            const allColumns = new Set<string>();
            for (const df of dataFrames) {
                df.columns.forEach((col: string) => allColumns.add(col));
            }

            const resultData: Record<string, ColumnData> = {};
            const resultIndex: Index[] = [];

            for (const col of allColumns) {
                resultData[col] = [];
            }

            for (const df of dataFrames) {
                for (const col of allColumns) {
                    const series = df.data.get(col);
                    if (series) {
                        resultData[col].push(...series.values);
                    } else {
                        resultData[col].push(...new Array(df.length).fill(null));
                    }
                }
                resultIndex.push(...df.index);
            }

            const finalIndex = options.ignore_index ? Array.from({ length: resultIndex.length }, (_, i) => i) : resultIndex;
            return new DataFrame(resultData, { index: finalIndex });
        } else {
            const firstDf = dataFrames[0];
            const resultData: Record<string, ColumnData> = {};
            const resultColumns: string[] = [];

            for (const df of dataFrames) {
                for (const [colName, series] of df.data) {
                    const newColName = resultColumns.includes(colName) ? `${colName}_${resultColumns.length}` : colName;
                    resultData[newColName] = series.values;
                    resultColumns.push(newColName);
                }
            }

            return new DataFrame(resultData, {
                index: firstDf.index,
                columns: resultColumns,
            });
        }
    }

    /**
     * Merge two DataFrames using SQL-style joins
     *
     * @param left - Left DataFrame
     * @param right - Right DataFrame
     * @param options - Merge options
     * @returns Merged DataFrame
     *
     * @example
     * ```typescript
     * const df1 = new DataFrame({ id: [1, 2, 3], name: ["Alice", "Bob", "Charlie"] });
     * const df2 = new DataFrame({ id: [2, 3, 4], age: [25, 30, 35] });
     *
     * // Inner join on 'id'
     * const inner = BoxFrame.merge(df1, df2, { on: "id", how: "inner" });
     *
     * // Left join with different column names
     * const left = BoxFrame.merge(df1, df2, {
     *   leftOn: "id",
     *   rightOn: "id",
     *   how: "left"
     * });
     * ```
     */
    static merge(left: DataFrame, right: DataFrame, options: MergeOptions = {}): DataFrame {
        const {
            how = "inner",
            on,
            leftOn,
            rightOn,
            suffixes = ["_x", "_y"],
        } = options;

        let leftKeys: string[];
        let rightKeys: string[];

        if (on) {
            const keys = Array.isArray(on) ? on : [on];
            leftKeys = keys;
            rightKeys = keys;

            for (const key of keys) {
                if (!left.columns.includes(key)) {
                    throw new Error(`Column '${key}' not found in left DataFrame`);
                }
                if (!right.columns.includes(key)) {
                    throw new Error(`Column '${key}' not found in right DataFrame`);
                }
            }
        } else if (leftOn && rightOn) {
            leftKeys = Array.isArray(leftOn) ? leftOn : [leftOn];
            rightKeys = Array.isArray(rightOn) ? rightOn : [rightOn];

            if (leftKeys.length !== rightKeys.length) {
                throw new Error("leftOn and rightOn must have the same number of keys");
            }

            for (const key of leftKeys) {
                if (!left.columns.includes(key)) {
                    throw new Error(`Column '${key}' not found in left DataFrame`);
                }
            }
            for (const key of rightKeys) {
                if (!right.columns.includes(key)) {
                    throw new Error(`Column '${key}' not found in right DataFrame`);
                }
            }
        } else {
            throw new Error("Either 'on' or both 'leftOn' and 'rightOn' must be specified");
        }

        const leftKeyMap = new Map<string, number[]>();
        for (let i = 0; i < left.length; i++) {
            const keyValues = leftKeys.map((key) => {
                const series = left.data.get(key);
                return series ? series.values[i] : null;
            });
            const key = this._createKey(keyValues);
            if (!leftKeyMap.has(key)) {
                leftKeyMap.set(key, []);
            }
            leftKeyMap.get(key)!.push(i);
        }

        const rightKeyMap = new Map<string, number[]>();
        for (let i = 0; i < right.length; i++) {
            const keyValues = rightKeys.map((key) => {
                const series = right.data.get(key);
                return series ? series.values[i] : null;
            });
            const key = this._createKey(keyValues);
            if (!rightKeyMap.has(key)) {
                rightKeyMap.set(key, []);
            }
            rightKeyMap.get(key)!.push(i);
        }

        const allKeys = new Set<string>();
        if (how === "inner" || how === "left" || how === "outer") {
            leftKeyMap.forEach((_, key) => allKeys.add(key));
        }
        if (how === "inner" || how === "right" || how === "outer") {
            rightKeyMap.forEach((_, key) => allKeys.add(key));
        }

        const resultData: Record<string, ColumnData> = {};
        const resultIndex: Index[] = [];
        const resultColumns: string[] = [];

        for (let i = 0; i < leftKeys.length; i++) {
            const leftKey = leftKeys[i];
            resultColumns.push(leftKey);
            resultData[leftKey] = [];
        }

        for (const col of left.columns) {
            if (!leftKeys.includes(col)) {
                resultColumns.push(col);
                resultData[col] = [];
            }
        }

        for (const col of right.columns) {
            if (!rightKeys.includes(col)) {
                let finalColName = col;
                if (left.columns.includes(col) && !leftKeys.includes(col)) {
                    finalColName = col + suffixes[1];
                }
                resultColumns.push(finalColName);
                resultData[finalColName] = [];
            }
        }

        for (const key of allKeys) {
            const leftIndices = leftKeyMap.get(key) || [];
            const rightIndices = rightKeyMap.get(key) || [];

            let leftRows: number[];
            let rightRows: number[];

            if (how === "inner") {
                if (leftIndices.length > 0 && rightIndices.length > 0) {
                    leftRows = leftIndices;
                    rightRows = rightIndices;
                } else {
                    continue;
                }
            } else if (how === "left") {
                leftRows = leftIndices;
                rightRows = rightIndices.length > 0 ? rightIndices : [];
            } else if (how === "right") {
                leftRows = leftIndices.length > 0 ? leftIndices : [];
                rightRows = rightIndices;
            } else {
                leftRows = leftIndices;
                rightRows = rightIndices;
            }

            if (leftRows.length === 0 && rightRows.length > 0) {
                for (const rightIdx of rightRows) {
                    for (let i = 0; i < rightKeys.length; i++) {
                        const rightKey = rightKeys[i];
                        const series = right.data.get(rightKey);
                        const value = series ? series.values[rightIdx] : null;
                        resultData[leftKeys[i]].push(value);
                    }

                    for (const col of left.columns) {
                        if (!leftKeys.includes(col)) {
                            resultData[col].push(null);
                        }
                    }

                    for (const col of right.columns) {
                        if (!rightKeys.includes(col)) {
                            let finalColName = col;
                            if (left.columns.includes(col) && !leftKeys.includes(col)) {
                                finalColName = col + suffixes[1];
                            }
                            const series = right.data.get(col);
                            const value = series ? series.values[rightIdx] : null;
                            resultData[finalColName].push(value);
                        }
                    }

                    resultIndex.push(right.index[rightIdx]);
                }
            } else if (rightRows.length === 0 && leftRows.length > 0) {
                for (const leftIdx of leftRows) {
                    for (let i = 0; i < leftKeys.length; i++) {
                        const leftKey = leftKeys[i];
                        const series = left.data.get(leftKey);
                        const value = series ? series.values[leftIdx] : null;
                        resultData[leftKey].push(value);
                    }

                    for (const col of left.columns) {
                        if (!leftKeys.includes(col)) {
                            const series = left.data.get(col);
                            const value = series ? series.values[leftIdx] : null;
                            resultData[col].push(value);
                        }
                    }

                    for (const col of right.columns) {
                        if (!rightKeys.includes(col)) {
                            let finalColName = col;
                            if (left.columns.includes(col) && !leftKeys.includes(col)) {
                                finalColName = col + suffixes[1];
                            }
                            resultData[finalColName].push(null);
                        }
                    }

                    resultIndex.push(left.index[leftIdx]);
                }
            } else {
                for (const leftIdx of leftRows) {
                    for (const rightIdx of rightRows) {
                        for (let i = 0; i < leftKeys.length; i++) {
                            const leftKey = leftKeys[i];
                            const series = left.data.get(leftKey);
                            const value = series ? series.values[leftIdx] : null;
                            resultData[leftKey].push(value);
                        }

                        for (const col of left.columns) {
                            if (!leftKeys.includes(col)) {
                                const series = left.data.get(col);
                                const value = series ? series.values[leftIdx] : null;
                                resultData[col].push(value);
                            }
                        }

                        for (const col of right.columns) {
                            if (!rightKeys.includes(col)) {
                                let finalColName = col;
                                if (left.columns.includes(col) && !leftKeys.includes(col)) {
                                    finalColName = col + suffixes[1];
                                }
                                const series = right.data.get(col);
                                const value = series ? series.values[rightIdx] : null;
                                resultData[finalColName].push(value);
                            }
                        }

                        const leftIndexValue = left.index[leftIdx];
                        const rightIndexValue = right.index[rightIdx];
                        const combinedIndex = `${leftIndexValue}_${rightIndexValue}`;
                        resultIndex.push(combinedIndex);
                    }
                }
            }
        }

        return new DataFrame(resultData, {
            index: resultIndex,
            columns: resultColumns,
        });
    }

    /**
     * Create a string key from key values for efficient matching
     * @private
     */
    private static _createKey(keyValues: (DataValue | null)[]): string {
        return keyValues.map((v) => {
            if (v === null || v === undefined) {
                return "__NULL__";
            }
            if (v instanceof Date) {
                return v.getTime().toString();
            }
            return String(v);
        }).join("|");
    }

    /**
     * Convert data to numeric type
     */
    static toNumeric(data: Series | DataValue[]): Series {
        const values = data instanceof Series ? data.values : data;
        const numericValues = (values as DataValue[]).map((val: DataValue): number | null => {
            if (val === null || val === undefined) return null;
            const num = Number(val);
            return isNaN(num) ? null : num;
        });

        return new Series(numericValues, {
            name: data instanceof Series ? data.name : "numeric",
            dtype: "float64",
        });
    }

    /**
     * Convert data to datetime type
     */
    static toDatetime(data: Series | DataValue[]): Series {
        const values = data instanceof Series ? data.values : data;
        const dateValues = (values as DataValue[]).map((val: DataValue): Date | null => {
            if (val === null || val === undefined) return null;
            if (typeof val === "boolean") return null;
            const date = new Date(val as string | number | Date);
            return isNaN(date.getTime()) ? null : date;
        });

        return new Series(dateValues, {
            name: data instanceof Series ? data.name : "datetime",
            dtype: "datetime",
        });
    }

    /**
     * Cut data into bins
     */
    static cut(data: Series, bins: number | number[], labels?: string[]): Series {
        const values = data.values as number[];
        const numericValues = values.filter((v) => v !== null && v !== undefined) as number[];

        if (numericValues.length === 0) {
            return new Series(values.map(() => null), {
                name: `${data.name}_cut`,
                dtype: "string",
            });
        }

        let binEdges: number[];
        if (typeof bins === "number") {
            if (bins <= 0) {
                throw new Error("Number of bins must be positive");
            }
            const min = Math.min(...numericValues);
            const max = Math.max(...numericValues);
            const step = (max - min) / bins;
            binEdges = Array.from({ length: bins + 1 }, (_, i) => min + i * step);
        } else {
            if (bins.length < 2) {
                throw new Error("Bins array must have at least 2 elements");
            }
            for (let i = 1; i < bins.length; i++) {
                if (bins[i] <= bins[i - 1]) {
                    throw new Error("Bins must be in ascending order");
                }
            }
            binEdges = bins;
        }

        if (labels && labels.length !== binEdges.length - 1) {
            throw new Error("Number of labels must match number of bins");
        }

        const result = values.map((val) => {
            if (val === null || val === undefined) return null;

            const numVal = Number(val);
            if (isNaN(numVal)) return null;

            for (let i = 0; i < binEdges.length - 1; i++) {
                const isFirstBin = i === 0;

                const leftMatch = isFirstBin ? numVal >= binEdges[i] : numVal > binEdges[i];
                const rightMatch = numVal <= binEdges[i + 1];

                if (leftMatch && rightMatch) {
                    return labels ? labels[i] : `${isFirstBin ? "[" : "("}${binEdges[i]}, ${binEdges[i + 1]}]`;
                }
            }

            return null;
        });

        return new Series(result, {
            name: `${data.name}_cut`,
            dtype: "string",
        });
    }

    /**
     * Generate a range of equally spaced time points
     */
    static dateRange(options: {
        start?: string | Date;
        end?: string | Date;
        periods?: number;
        freq?: string;
        name?: string;
        inclusive?: "both" | "neither" | "left" | "right";
    } = {}): Series<Date> {
        const { start, end, periods, freq = "D", name = "date_range", inclusive = "both" } = options;

        const startDate = start ? new Date(start) : null;
        const endDate = end ? new Date(end) : null;

        const hasStart = startDate !== null;
        const hasEnd = endDate !== null;
        const hasPeriods = periods !== undefined;

        if (!hasStart && !hasEnd && !hasPeriods) {
            throw new Error("At least one of start, end, or periods must be specified");
        }

        if (hasStart && hasEnd && hasPeriods) {
            throw new Error("Cannot specify start, end, and periods simultaneously");
        }

        if (!hasStart && !hasEnd && hasPeriods) {
            throw new Error("Cannot specify periods without start or end");
        }

        if (hasStart && !hasEnd && !hasPeriods) {
            throw new Error("Either end date or periods must be specified");
        }

        if (!hasStart && hasEnd && !hasPeriods) {
            throw new Error("Either start date or periods must be specified");
        }

        let dates: Date[] = [];

        if (hasStart && hasEnd) {
            dates = this._generateDateRange(startDate!, endDate!, freq, inclusive);
        } else if (hasStart && hasPeriods) {
            const tempEnd = this._addFrequency(startDate!, freq, periods - 1);
            dates = this._generateDateRange(startDate!, tempEnd, freq, "both");
        } else if (hasEnd && hasPeriods) {
            const tempStart = this._addFrequency(endDate!, freq, -(periods - 1));
            dates = this._generateDateRange(tempStart, endDate!, freq, "both");
        } else if (hasPeriods) {
            const today = new Date();
            const tempEnd = this._addFrequency(today, freq, periods - 1);
            dates = this._generateDateRange(today, tempEnd, freq, "both");
        }

        return new Series(dates, {
            name,
            dtype: "datetime",
        });
    }

    /**
     * Generate a range of dates between start and end with given frequency
     */
    private static _generateDateRange(start: Date, end: Date, freq: string, inclusive: string): Date[] {
        const dates: Date[] = [];
        let current = new Date(start);

        if (freq === "D" || freq === "1D") {
            const normalizedStart = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
            const normalizedEnd = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()));
            start = normalizedStart;
            end = normalizedEnd;
            current = new Date(start);
        }

        // Safety limit to prevent infinite loops and excessive memory usage
        // This might want to be adjusted for large datasets or find a better solution.
        const maxIterations = 100000;
        let iterations = 0;

        while (iterations < maxIterations) {
            let shouldInclude = false;

            if (inclusive === "both") {
                shouldInclude = current >= start && current <= end;
            } else if (inclusive === "left") {
                shouldInclude = current >= start && current < end;
            } else if (inclusive === "right") {
                shouldInclude = current > start && current <= end;
            } else if (inclusive === "neither") {
                shouldInclude = current > start && current < end;
            }

            if (shouldInclude) {
                dates.push(new Date(current));
            }

            if (current >= end) {
                break;
            }

            const previousDate = new Date(current);
            current = this._addFrequency(current, freq, 1);

            if (current.getTime() === previousDate.getTime()) {
                console.warn(`Warning: Frequency '${freq}' did not advance the date. Breaking to prevent infinite loop.`);
                break;
            }

            iterations++;
        }

        if (iterations >= maxIterations) {
            console.warn(`Warning: Reached maximum iterations (${maxIterations}) in date range generation.`);
        }

        return dates;
    }

    /**
     * Add frequency to a date
     */
    private static _addFrequency(date: Date, freq: string, multiplier: number = 1): Date {
        const result = new Date(date);

        const match = freq.match(/^(\d*)([A-Za-z]+)$/);
        if (!match) {
            throw new Error(`Invalid frequency format: ${freq}`);
        }

        const [, numStr, unit] = match;
        const num = numStr ? parseInt(numStr) : 1;
        const totalNum = num * multiplier;

        switch (unit.toUpperCase()) {
            case "D":
            case "DAY":
            case "DAYS":
                result.setDate(result.getDate() + totalNum);
                break;
            case "H":
            case "HOUR":
            case "HOURS":
                result.setHours(result.getHours() + totalNum);
                break;
            case "M":
            case "MONTH":
            case "MONTHS":
                result.setMonth(result.getMonth() + totalNum);
                break;
            case "MIN":
            case "MINUTE":
            case "MINUTES":
                result.setMinutes(result.getMinutes() + totalNum);
                break;
            case "S":
            case "SEC":
            case "SECOND":
            case "SECONDS":
                result.setSeconds(result.getSeconds() + totalNum);
                break;
            case "MS":
            case "MILLISECOND":
            case "MILLISECONDS":
                result.setMilliseconds(result.getMilliseconds() + totalNum);
                break;
            case "W":
            case "WEEK":
            case "WEEKS":
                result.setDate(result.getDate() + (totalNum * 7));
                break;
            case "ME":
            case "MONTHEND":
                result.setMonth(result.getMonth() + totalNum);
                result.setDate(1);
                result.setMonth(result.getMonth() + 1);
                result.setDate(0);
                break;
            case "MONTHSTART":
                result.setMonth(result.getMonth() + totalNum);
                result.setDate(1);
                break;
            case "Y":
            case "YEAR":
            case "YEARS":
                result.setFullYear(result.getFullYear() + totalNum);
                break;
            default:
                throw new Error(`Unsupported frequency unit: ${unit}`);
        }

        return result;
    }
}
