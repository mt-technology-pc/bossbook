// Annotates chronologically-ordered (oldest-first) rows with .debit, .credit,
// and a running .balance, folding oldest -> newest. Does not mutate or reorder
// input. `flip` reverses which side increases the balance (for credit-normal
// accounts — liabilities, equity, income — a credit increases the balance)
// without changing which raw value ends up in .debit vs .credit.
export function withRunningBalance(rowsAscending, { debit, credit, opening = 0, flip = false }) {
  let balance = Number(opening) || 0
  return rowsAscending.map((row) => {
    const d = Number(debit(row)) || 0
    const c = Number(credit(row)) || 0
    balance += flip ? c - d : d - c
    return { ...row, debit: d, credit: c, balance }
  })
}
