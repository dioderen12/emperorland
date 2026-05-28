// Module augmentation — adds `id` to the Session user type so server-side
// queries can do `prisma.user.findUnique({ where: { id: session.user.id }})`.

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
