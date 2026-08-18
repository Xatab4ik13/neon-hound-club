import { createFileRoute } from "@tanstack/react-router";
import { HoundHuntShow } from "@/components/club/hound-hunt/HoundHuntShow";
export const Route = createFileRoute("/hh-preview")({ component: HoundHuntShow });
