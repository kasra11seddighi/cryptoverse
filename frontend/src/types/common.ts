export type SortDirection = "asc" | "desc";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Sort<K extends string> {
  key: K;
  direction: SortDirection;
}
