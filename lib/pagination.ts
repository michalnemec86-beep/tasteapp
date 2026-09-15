export const DEFAULT_PAGE_SIZE = 25;

export function parsePositivePage(value: string | string[] | undefined) {
  const raw = typeof value === "string" ? value : undefined;
  const parsed = Number(raw ?? "1");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function paginateItems<T>(items: T[], requestedPage: number, pageSize = DEFAULT_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  return {
    currentPage,
    totalPages,
    pageItems: items.slice(startIndex, startIndex + pageSize),
    pageStart: items.length === 0 ? 0 : startIndex + 1,
    pageEnd: Math.min(startIndex + pageSize, items.length),
  };
}
