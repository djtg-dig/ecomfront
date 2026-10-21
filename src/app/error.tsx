"use client";
import { ErrorContent } from "@/components/i18n/feedback-pages";

export default function ErrorPage({ reset }: { reset: () => void }) { return <ErrorContent reset={reset} />; }
