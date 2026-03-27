import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../create-context";

const createInvoicePaymentFlowSchema = z.object({
  accessToken: z.string().min(1),
  environment: z.enum(["sandbox", "live"]),
  invoiceId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  amountPence: z.number().int().positive(),
  currency: z.string().min(3).max(3).default("GBP"),
  description: z.string().min(1),
  customer: z.object({
    givenName: z.string().min(1),
    familyName: z.string().min(1),
    email: z.string().email(),
  }),
  redirectUri: z.string().url(),
  exitUri: z.string().url(),
});

const completeBillingRequestFlowSchema = z.object({
  accessToken: z.string().min(1),
  environment: z.enum(["sandbox", "live"]),
  billingRequestFlowId: z.string().min(1),
});

type GoCardlessBillingRequestFlowCreateResponse = {
  billing_request_flows?: {
    id: string;
    authorisation_url: string;
    links?: {
      billing_request?: string;
    };
  };
};

type GoCardlessBillingRequestCreateResponse = {
  billing_requests?: {
    id: string;
    status: string;
  };
};

type GoCardlessBillingRequestFlowCompleteResponse = {
  billing_request_flows?: {
    id: string;
    links?: {
      billing_request?: string;
    };
  };
};

type GoCardlessBillingRequestResponse = {
  billing_requests?: {
    id: string;
    status: string;
    resources?: {
      payment?: {
        id: string;
        status: string;
      };
      mandate?: {
        id: string;
        status?: string;
      };
    };
  };
};

function getApiBase(environment: "sandbox" | "live") {
  return environment === "live"
    ? "https://api.gocardless.com"
    : "https://api-sandbox.gocardless.com";
}

async function gcFetch<T>(
  environment: "sandbox" | "live",
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${getApiBase(environment)}${path}`;

  console.log("[GoCardless] Fetch:", {
    url,
    method: init?.method ?? "GET",
  });

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[GoCardless] Error response:", {
      status: res.status,
      body: text,
    });
    throw new Error(`GoCardless request failed (${res.status})`);
  }

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.error("[GoCardless] Failed to parse JSON:", {
      body: text,
      error: String(e),
    });
    throw new Error("GoCardless returned an invalid response");
  }
}

export const gocardlessRouter = createTRPCRouter({
  createInvoicePaymentFlow: publicProcedure
    .input(createInvoicePaymentFlowSchema)
    .mutation(async ({ input }) => {
      const {
        accessToken,
        environment,
        amountPence,
        currency,
        description,
        redirectUri,
        exitUri,
        customer,
        invoiceId,
        invoiceNumber,
      } = input;

      console.log("[GoCardless] Creating payment flow for invoice", {
        invoiceId,
        invoiceNumber,
        amountPence,
        currency,
        environment,
      });

      const billingRequestBody = {
        billing_requests: {
          payment_request: {
            amount: String(amountPence),
            currency,
            description,
            metadata: {
              invoiceId,
              invoiceNumber,
              source: "rork-app",
            },
          },
        },
      };

      const billingRequest = await gcFetch<GoCardlessBillingRequestCreateResponse>(
        environment,
        accessToken,
        "/billing_requests",
        {
          method: "POST",
          body: JSON.stringify(billingRequestBody),
        },
      );

      const billingRequestId = billingRequest.billing_requests?.id;
      if (!billingRequestId) {
        throw new Error("Failed to create GoCardless billing request");
      }

      const flowBody = {
        billing_request_flows: {
          redirect_uri: redirectUri,
          exit_uri: exitUri,
          prefilled_customer: {
            given_name: customer.givenName,
            family_name: customer.familyName,
            email: customer.email,
          },
          links: {
            billing_request: billingRequestId,
          },
        },
      };

      const flow = await gcFetch<GoCardlessBillingRequestFlowCreateResponse>(
        environment,
        accessToken,
        "/billing_request_flows",
        {
          method: "POST",
          body: JSON.stringify(flowBody),
        },
      );

      const flowId = flow.billing_request_flows?.id;
      const authorisationUrl = flow.billing_request_flows?.authorisation_url;

      if (!flowId || !authorisationUrl) {
        throw new Error("Failed to create GoCardless billing request flow");
      }

      return {
        flowId,
        billingRequestId,
        authorisationUrl,
      };
    }),

  completeBillingRequestFlow: publicProcedure
    .input(completeBillingRequestFlowSchema)
    .mutation(async ({ input }) => {
      const { accessToken, environment, billingRequestFlowId } = input;

      const completeBody = {
        data: {
          id: billingRequestFlowId,
          type: "billing_request_flows",
        },
      };

      const completed = await gcFetch<GoCardlessBillingRequestFlowCompleteResponse>(
        environment,
        accessToken,
        `/billing_request_flows/${billingRequestFlowId}/actions/complete`,
        {
          method: "POST",
          body: JSON.stringify(completeBody),
        },
      );

      const billingRequestId = completed.billing_request_flows?.links?.billing_request;
      if (!billingRequestId) {
        throw new Error("GoCardless completion did not return billing_request link");
      }

      const billingRequest = await gcFetch<GoCardlessBillingRequestResponse>(
        environment,
        accessToken,
        `/billing_requests/${billingRequestId}`,
        {
          method: "GET",
        },
      );

      const payment = billingRequest.billing_requests?.resources?.payment;
      const mandate = billingRequest.billing_requests?.resources?.mandate;

      return {
        billingRequestId,
        billingRequestStatus: billingRequest.billing_requests?.status ?? "unknown",
        payment: payment
          ? {
              id: payment.id,
              status: payment.status,
            }
          : null,
        mandate: mandate
          ? {
              id: mandate.id,
              status: mandate.status ?? "unknown",
            }
          : null,
      };
    }),
});
