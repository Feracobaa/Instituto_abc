import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Search, ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Column<T> {
  /** Unique key for this column */
  key: string;
  /** Header label */
  header: string;
  /** How to render this cell */
  render: (row: T, index: number) => React.ReactNode;
  /** Optional className for the header cell */
  headerClassName?: string;
  /** Optional className for the body cell */
  cellClassName?: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface PaginatedTableProps<T> {
  /** Column definitions */
  columns: Column<T>[];
  /** Full dataset */
  data: T[];
  /** Unique key extractor */
  getRowKey: (row: T) => string;
  /** Fields to search against (returns the searchable text for a row) */
  searchFn?: (row: T) => string;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Optional filter options */
  filterOptions?: FilterOption[];
  /** Filter predicate: return true if the row passes the given filter value */
  filterFn?: (row: T, filterValue: string) => boolean;
  /** Label for the "all" filter option */
  filterAllLabel?: string;
  /** Rows per page (default 10) */
  pageSize?: number;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Message when no data at all */
  emptyMessage?: string;
  /** Icon for empty state */
  emptyIcon?: LucideIcon;
  /** CTA action for empty state */
  emptyAction?: { label: string; onClick: () => void };
  /** Message when search yields no results */
  noResultsMessage?: string;
}

export function PaginatedTable<T>({
  columns,
  data,
  getRowKey,
  searchFn,
  searchPlaceholder = "Buscar...",
  filterOptions,
  filterFn,
  filterAllLabel = "Todos",
  pageSize = 10,
  isLoading = false,
  emptyMessage = "No hay registros.",
  emptyIcon,
  emptyAction,
  noResultsMessage = "Ningún registro coincide con tu búsqueda.",
}: PaginatedTableProps<T>) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("__all__");
  const [page, setPage] = useState(0);

  // Reset page when search or filter changes
  const filteredData = useMemo(() => {
    let result = data;

    // Apply text search
    if (searchFn && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((row) => searchFn(row).toLowerCase().includes(q));
    }

    // Apply filter
    if (filterFn && activeFilter !== "__all__") {
      result = result.filter((row) => filterFn(row, activeFilter));
    }

    return result;
  }, [data, search, searchFn, activeFilter, filterFn]);

  // Reset page when filtered data length changes
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  if (safePage !== page) setPage(safePage);

  const paginatedData = useMemo(() => {
    const start = safePage * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize]);

  const showingFrom = filteredData.length === 0 ? 0 : safePage * pageSize + 1;
  const showingTo = Math.min((safePage + 1) * pageSize, filteredData.length);

  return (
    <div className="space-y-3">
      {/* Search bar + Filter chips */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {searchFn && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9 h-9"
            />
          </div>
        )}
        {filterOptions && filterOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => { setActiveFilter("__all__"); setPage(0); }}
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                activeFilter === "__all__"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted",
              )}
            >
              {filterAllLabel}
            </button>
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setActiveFilter(opt.value); setPage(0); }}
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  activeFilter === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-muted",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton columns={columns.length} rows={Math.min(pageSize, 5)} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyMessage}
          action={emptyAction}
          className="py-10"
        />
      ) : filteredData.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Sin resultados"
          description={noResultsMessage}
          className="py-10"
        />
      ) : (
        <div className="w-full overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key} className={col.headerClassName}>
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row, index) => (
                <TableRow key={getRowKey(row)}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.cellClassName}>
                      {col.render(row, safePage * pageSize + index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination footer */}
      {filteredData.length > pageSize && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando {showingFrom}–{showingTo} de {filteredData.length} registros
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={safePage === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs text-muted-foreground tabular-nums">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
