import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  totalItems: number;
  perPage: number;
}

export function Pagination({ page, totalPages, onPage, totalItems, perPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, totalItems);

  return (
    <div className="flex items-center justify-between px-1 mt-4">
      <p className="text-sm text-muted-foreground">
        Showing {from}–{to} of {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p: number;
          if (totalPages <= 5) {
            p = i + 1;
          } else if (page <= 3) {
            p = i + 1;
          } else if (page >= totalPages - 2) {
            p = totalPages - 4 + i;
          } else {
            p = page - 2 + i;
          }
          return (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPage(p)}
              className={`h-8 w-8 p-0 ${p === page ? "bg-brand text-brand-foreground" : ""}`}
            >
              {p}
            </Button>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function usePagination<T>(items: T[], perPage = 20) {
  return { perPage, totalPages: Math.ceil(items.length / perPage) };
}
