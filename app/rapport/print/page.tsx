import { Suspense } from "react";
import PrintClient from "./PrintClient";

export const dynamic = "force-static";

export default function PrintPage() {
  return (
    <Suspense>
      <PrintClient />
    </Suspense>
  );
}
