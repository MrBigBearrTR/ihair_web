import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  primaryLabel = "Kaydet",
  secondaryLabel = "Vazgeç",
  onPrimaryClick,
  onSecondaryClick,
  isSubmitting,
  primaryType = "submit",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  isSubmitting?: boolean;
  primaryType?: "button" | "submit";
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        {children}

        {footer ?? (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onSecondaryClick?.();
                onOpenChange(false);
              }}
            >
              {secondaryLabel}
            </Button>
            <Button
              type={primaryType}
              disabled={isSubmitting}
              onClick={primaryType === "button" ? onPrimaryClick : undefined}
            >
              {isSubmitting ? "Kaydediliyor…" : primaryLabel}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
