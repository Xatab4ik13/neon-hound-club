import { createFileRoute, redirect } from "@tanstack/react-router";

// Старый mock-чекаут заменён единым флоу /club/checkout.
export const Route = createFileRoute("/checkout/")({
  beforeLoad: () => {
    throw redirect({ to: "/club/checkout" });
  },
});
