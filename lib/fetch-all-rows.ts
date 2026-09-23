/** Fetch complete datasets despite the per-request row limit in the API. */
export async function fetchAllRows<T>(
  fetchPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 500,
  maxRows = Number.POSITIVE_INFINITY
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; from < maxRows; from += pageSize * 3) {
    const pages = await Promise.all(
      [0, 1, 2]
        .filter((index) => from + index * pageSize < maxRows)
        .map((index) =>
          fetchPage(
            from + index * pageSize,
            Math.min(from + (index + 1) * pageSize, maxRows) - 1
          )
        )
    );

    for (const page of pages) {
      if (page.error) throw new Error(page.error.message);
      rows.push(...(page.data ?? []));
    }

    if (pages.some((page) => (page.data?.length ?? 0) < pageSize)) {
      return rows;
    }
  }

  return rows;
}
