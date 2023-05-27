import { createServerSideHelpers } from "@trpc/react-query/server";
import superjson from "superjson";
import { createInnerTRPCContext } from "./trpc";
import { appRouter } from "./root";

export function ssgHelper() {
  return createServerSideHelpers({
    router: appRouter,
    ctx: createInnerTRPCContext({ session: null, revalidateSSG: null }),
    transformer: superjson,
  });
}
