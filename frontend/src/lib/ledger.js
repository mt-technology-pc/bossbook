// Annotates chronologically-ordered (oldest-first) rows with .debit, .credit,
// and a running .balance, folding oldest -> newest. Does not mutate or reorder input.
export function withRunningBalance(rowsAscending, { debit, credit, opening = 0 }) {
  let balance = Number(opening) || 0
  return rowsAscending.map((row) => {
    const d = Number(debit(row)) || 0
    const c = Number(credit(row)) || 0
    balance += d - c
    return { ...row, debit: d, credit: c, balance }
  })
}
