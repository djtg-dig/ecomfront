import { Suspense } from "react";
import { CartDetail } from "@/components/carts/cart-manager";
import { PrivatePageFallback } from "@/components/private/private-page-fallback";
type CartDetailPageProps = Pick<PageProps<"/compte/paniers/[reference]">, "params">;

export default function AccountCartDetailPage({ params }: CartDetailPageProps) {
  return <Suspense fallback={<PrivatePageFallback />}><AccountCartDetailContent params={params} /></Suspense>;
}

async function AccountCartDetailContent({ params }: CartDetailPageProps) {
  const { reference } = await params;
  return <CartDetail reference={reference} />;
}
