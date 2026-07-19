import { Button } from "@/components/ui/button";

export function PaginationControls({
  page,
  totalPages,
  totalElements,
  isFetching,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalElements: number;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
}) {
  if (totalElements === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">
        {totalElements} kayıt
        {isFetching ? " · Güncelleniyor…" : ""}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 0 || isFetching}
          onClick={() => onPageChange(page - 1)}
        >
          Önceki
        </Button>
        <span className="min-w-24 text-center">
          {page + 1} / {Math.max(totalPages, 1)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page + 1 >= totalPages || isFetching}
          onClick={() => onPageChange(page + 1)}
        >
          Sonraki
        </Button>
      </div>
    </div>
  );
}
