import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/health")({
  component: Health,
  head: () => ({
    title: "IAmax Hub — Health",
    meta: [{ name: "robots", content: "noindex" }],
  }),
});

function Health() {
  return <main>OK</main>;
}
