/**
 * Each expanded ranking is a real history entry. Pass only our state to
 * Next.js's patched History API; copying __NA would bypass its URL sync.
 * @param {History} history
 * @param {string} fromHref
 * @param {string} toHref
 */
export function pushRankingDialog(history, fromHref, toHref) {
  if (fromHref === toHref) return;
  history.pushState({ pivnikRankingDialog: toHref }, "", toHref);
}

/**
 * Back closes an entry created here. A directly opened/bookmarked URL has no
 * known previous page, so remove the dialog in place instead of leaving the app.
 * @param {History} history
 * @param {string} currentHref
 * @param {string} closedHref
 */
export function closeRankingDialog(history, currentHref, closedHref) {
  if (currentHref === closedHref) return;
  if (history.state?.pivnikRankingDialog === currentHref) {
    history.back();
  } else {
    history.replaceState(null, "", closedHref);
  }
}
