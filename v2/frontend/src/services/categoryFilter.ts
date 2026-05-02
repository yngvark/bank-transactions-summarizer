// Separator used in tx.Category and rules.ts when joining category segments.
const SEPARATOR = ' ➡ ';

// Returns true when a transaction's category equals the selected path or is a
// descendant of it. Matching is segment-based: "Mat" must not match
// "Mat og drikke" — the boundary is enforced by checking for the separator.
export function transactionMatchesCategoryFilter(
  txCategory: string,
  selectedJoinedPath: string,
): boolean {
  if (selectedJoinedPath === '') return true;
  return (
    txCategory === selectedJoinedPath ||
    txCategory.startsWith(selectedJoinedPath + SEPARATOR)
  );
}
