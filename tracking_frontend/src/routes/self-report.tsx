import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/self-report")({ beforeLoad: () => { throw redirect({ to: "/student/self-report" }); }, component: () => null });
