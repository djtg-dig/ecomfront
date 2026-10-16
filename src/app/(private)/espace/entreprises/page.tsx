import { BusinessList } from "@/components/businesses/business-manager";

type Props = { searchParams: Promise<{ invitation?: string | string[] }> };

export default async function BusinessesPage({ searchParams }: Props) {
  const invitation = (await searchParams).invitation;
  const outcome = typeof invitation === "string" ? invitation : undefined;
  return <BusinessList invitationOutcome={outcome} />;
}
