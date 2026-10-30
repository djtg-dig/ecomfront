import { DELETE as remove, GET as list, PATCH as update, POST as create } from "./[...path]/route";

const rootContext = { params: Promise.resolve({ path: [] as string[] }) } as RouteContext<"/api/private/carts/[...path]">;
export const GET = (request: Request) => list(request, rootContext);
export const POST = (request: Request) => create(request, rootContext);
export const PATCH = (request: Request) => update(request, rootContext);
export const DELETE = (request: Request) => remove(request, rootContext);
