/** Call minutes are paid by the participant with the most credits; ties keep a stable order. */
export function callPayerOrder(balances: { user_id: string; balance: number }[]) {
  return balances
    .filter((row) => row.balance > 0)
    .sort((a, b) => b.balance - a.balance || a.user_id.localeCompare(b.user_id))
    .map((row) => row.user_id);
}
