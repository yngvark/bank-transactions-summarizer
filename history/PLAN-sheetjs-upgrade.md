# Replace read-excel-file with SheetJS 0.20.3

## Context

PR #39 replaced `xlsx` (SheetJS) with `read-excel-file` to fix two CVEs. The user doesn't want `read-excel-file` (Russian maintainer). SheetJS 0.20.3 at git.sheetjs.com fixes both CVEs (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9) and is maintained by SheetJS LLC. SheetJS is no longer on npm — it's distributed via CDN tarballs.

## Steps

### 1. Replace read-excel-file with SheetJS 0.20.3 in package.json
- **File:** `v2/frontend/package.json`
- Remove `"read-excel-file": "^8.0.2"`
- Add `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`
- Run `npm install` in `v2/frontend/`

### 2. Revert FileUpload.tsx to use SheetJS API
- **File:** `v2/frontend/src/components/FileUpload.tsx`
- Revert to the original SheetJS dynamic import pattern:
  ```typescript
  const reader = new FileReader();
  reader.onload = async (e) => {
    const data = new Uint8Array(e.target?.result as ArrayBuffer);
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const transactions = XLSX.utils.sheet_to_json<RawTransaction>(worksheet);
    onFileLoad(transactions, file.name);
  };
  reader.readAsArrayBuffer(file);
  ```
- Restore `.xls` support: `accept=".xlsx, .xls"`, regex `/\.xlsx?$/i`
- Update helper text back to "Supports .xlsx and .xls files"
- Remove the `read-excel-file/browser` import

### 3. Update parser.test.ts to use SheetJS instead of read-excel-file
- **File:** `v2/frontend/src/services/parser.test.ts`
- Replace `read-excel-file/node` import with `xlsx`
- Update `loadFixtureTransactions()` to use SheetJS API:
  ```typescript
  import XLSX from 'xlsx';
  // ...
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<RawTransaction>(worksheet, { cellDates: true });
  ```
- Since SheetJS `sheet_to_json` with `cellDates: true` returns Date objects directly, the date-handling tests should still pass

### 4. Check if parser.ts needs changes
- **File:** `v2/frontend/src/services/parser.ts`
- With SheetJS `cellDates: true`, dates come as Date objects, so the string→Date conversion in `toDate()` should still work (it already handles both strings and Dates)
- No changes expected, but verify

### 5. Run tests and build
- `cd v2/frontend && npm test` — all tests pass
- `cd v2/frontend && npm run build` — build succeeds

### 6. Verify UI with Playwright skill
- Use playwright skill to verify upload flow works

### 7. Commit changes

## Key files
- `v2/frontend/package.json`
- `v2/frontend/src/components/FileUpload.tsx`
- `v2/frontend/src/services/parser.test.ts`
- `v2/frontend/src/services/parser.ts` (verify only)
