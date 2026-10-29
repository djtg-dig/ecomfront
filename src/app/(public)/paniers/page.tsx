import type { Metadata } from "next"; import { CartManager } from "@/components/carts/cart-manager"; import { noIndexRobots } from "@/lib/seo/site";
export const metadata:Metadata={title:"Mes paniers",robots:noIndexRobots}; export default function CartsPage(){return <CartManager/>}
