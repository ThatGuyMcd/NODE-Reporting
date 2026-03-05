import { createTRPCRouter } from "./create-context";
import { invoiceRouter } from "./routes/invoice";
import { quoteRouter } from "./routes/quote";
import { gocardlessRouter } from "./routes/gocardless";
import { transactionRouter } from "./routes/transaction";

export const appRouter = createTRPCRouter({
  invoice: invoiceRouter,
  quote: quoteRouter,
  gocardless: gocardlessRouter,
  transaction: transactionRouter,
});

export type AppRouter = typeof appRouter;
