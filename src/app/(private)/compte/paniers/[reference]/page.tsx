import { CartDetail } from "@/components/carts/cart-manager";

export default async function AccountCartDetailPage({ params }: PageProps<"/compte/paniers/[reference]">) {
  const { reference } = await params;
  return <CartDetail reference={reference} />;
}
