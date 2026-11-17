/** Shape of a single-resource response from Laravel API Resources. */
export interface ApiResource<T> {
  data: T;
}

export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

export interface PaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

/** Shape of a paginated collection from Laravel API Resources. */
export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
  links: PaginationLinks;
}

/** Error body returned by the HireFlow API (see docs/ARCHITECTURE.md §2.4). */
export interface ApiErrorBody {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}

/** Common list query parameters accepted by index endpoints. */
export interface ListParams {
  page?: number;
  per_page?: number;
  sort?: string;
  search?: string;
  filter?: Record<string, string | number | boolean | undefined>;
}
