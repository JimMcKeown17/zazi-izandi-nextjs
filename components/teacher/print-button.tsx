"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      onClick={() => window.print()}
      className="print:hidden gap-2"
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      Download PDF
    </Button>
  );
}
