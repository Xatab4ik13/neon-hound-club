// ВРЕМЕННЫЙ маршрут для покадровой проверки HOUND HUNT без авторизации.
import { createFileRoute } from "@tanstack/react-router";
import { HoundHuntPage } from "./club.hound-hunt";

export const Route = createFileRoute("/hh-check")({
  component: HoundHuntPage,
});
