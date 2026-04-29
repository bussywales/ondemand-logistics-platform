export type HelpArticleSlug =
  | "getting-started"
  | "orders"
  | "deliveries"
  | "driver"
  | "payments"
  | "troubleshooting";

export type HelpStatusRow = {
  status: string;
  meaning: string;
  nextAction?: string;
};

export type HelpCallout = {
  body: string;
  title: string;
  tone: "info" | "success" | "warning" | "danger";
};

export type HelpArticle = {
  callouts?: HelpCallout[];
  commonProblems: string[];
  description: string;
  operatorActions: string[];
  slug: HelpArticleSlug;
  statusMeanings?: HelpStatusRow[];
  title: string;
  whatThisScreenDoes: string[];
  whatToDoNext: string[];
};

export const helpNavigation: Array<{ description: string; href: string; slug: HelpArticleSlug; title: string }> = [
  {
    description: "Sign in, create the business workspace, and prepare the pilot restaurant.",
    href: "/help/getting-started",
    slug: "getting-started",
    title: "Getting started"
  },
  {
    description: "Read customer orders from the public restaurant checkout and linked delivery state.",
    href: "/help/orders",
    slug: "orders",
    title: "Orders"
  },
  {
    description: "Use Operations, Jobs, Needs Review, and job detail decision surfaces.",
    href: "/help/deliveries",
    slug: "deliveries",
    title: "Deliveries"
  },
  {
    description: "Operate the staged driver flow: availability, offers, delivery progression, and POD.",
    href: "/help/driver",
    slug: "driver",
    title: "Driver"
  },
  {
    description: "Understand Stripe test payment states, authorization, capture, and common blockers.",
    href: "/help/payments",
    slug: "payments",
    title: "Payments"
  },
  {
    description: "Resolve common staging, auth, dispatch, payment, and setup issues.",
    href: "/help/troubleshooting",
    slug: "troubleshooting",
    title: "Troubleshooting"
  }
];

export const helpArticles: Record<HelpArticleSlug, HelpArticle> = {
  "getting-started": {
    callouts: [
      {
        body: "If Supabase rate limits account creation, wait before retrying or use an existing test account. Repeated signup attempts can extend the cooldown.",
        title: "Account creation can rate limit",
        tone: "warning"
      }
    ],
    commonProblems: [
      "Session restore timeout: refresh once, then sign in again if the app redirects out of /app.",
      "No business context: finish business setup from /get-started before opening product pages.",
      "Restaurant slug required or taken: edit the generated slug until it is unique.",
      "No public menu: create a restaurant, at least one category, and at least one active item."
    ],
    description: "The first setup path creates a real business workspace, operator membership, and pilot restaurant menu foundation.",
    operatorActions: [
      "Authenticate with Supabase email and password.",
      "Complete business setup so the API creates the org and BUSINESS_OPERATOR membership.",
      "Open Merchant setup to create the pilot restaurant profile.",
      "Add the first menu section and item, then preview the customer route."
    ],
    slug: "getting-started",
    statusMeanings: [
      { status: "Profile ready", meaning: "A restaurant profile exists for the workspace.", nextAction: "Add the first menu section." },
      { status: "Needs section", meaning: "The restaurant exists but the menu has no category.", nextAction: "Create a section such as Mains or Drinks." },
      { status: "Ready for preview", meaning: "The restaurant has an orderable menu item.", nextAction: "Open the public restaurant route." }
    ],
    title: "Getting started",
    whatThisScreenDoes: [
      "Identifies the operator through Supabase auth.",
      "Creates or restores the business org context used by app pages.",
      "Provides the internal pilot merchant setup path for restaurant and menu data."
    ],
    whatToDoNext: [
      "Use /get-started if the operator does not have business access yet.",
      "Use /app/restaurant to create the restaurant and menu.",
      "Use the preview route only after at least one item exists."
    ]
  },
  orders: {
    callouts: [
      {
        body: "A paid order is not complete just because checkout succeeded. The linked delivery job and payment state still matter.",
        title: "Order state depends on fulfilment",
        tone: "info"
      }
    ],
    commonProblems: [
      "No orders yet: the public checkout has not produced a paid customer order for this workspace.",
      "Dispatch failed: the order was paid but no eligible driver accepted or received the offer.",
      "Payment failed: the order cannot progress until payment is resolved.",
      "Order unavailable: the current operator does not have access to that restaurant/org."
    ],
    description: "Business operators can view paid customer orders created from public restaurant checkout and inspect the linked job and payment state.",
    operatorActions: [
      "Open the order detail to review customer, items, delivery address, payment, and linked job.",
      "Open the linked delivery job when dispatch or delivery state needs action.",
      "Treat dispatch failures as operational blockers even if payment is authorized."
    ],
    slug: "orders",
    statusMeanings: [
      { status: "PAYMENT_AUTHORIZED", meaning: "Stripe authorization succeeded and the delivery can proceed.", nextAction: "Monitor the linked job." },
      { status: "COMPLETED", meaning: "The linked delivery is delivered and payment is captured.", nextAction: "No operator action required." },
      { status: "PAYMENT_FAILED", meaning: "Checkout or authorization failed.", nextAction: "Ask the customer to retry payment if this is a live pilot." },
      { status: "DISPATCH_FAILED", meaning: "The linked delivery job did not secure a driver.", nextAction: "Open the job and retry dispatch or assign manually." }
    ],
    title: "Customer orders",
    whatThisScreenDoes: [
      "Lists customer orders created by the branded restaurant route.",
      "Shows order, payment, and linked delivery status in one business view.",
      "Lets operators jump from an order to its delivery job."
    ],
    whatToDoNext: [
      "Review new paid orders from /app/orders.",
      "Open blocked orders and resolve the linked job from /app/jobs/[jobId].",
      "Use the public restaurant route to run controlled checkout tests."
    ]
  },
  deliveries: {
    callouts: [
      {
        body: "Needs Review is the operator control centre. A blocker there should be cleared before creating more test deliveries.",
        title: "Review blockers first",
        tone: "danger"
      }
    ],
    commonProblems: [
      "No eligible drivers: create or bring online a staged driver with the right vehicle and nearby location.",
      "Payment method required: collect or authorize payment before expecting the job to continue.",
      "No live coordinates: tracking remains empty until a driver is assigned and sends location updates.",
      "Repeated dispatch failure: inspect dispatch attempts on the job detail page."
    ],
    description: "The Operations console and Jobs surfaces show delivery jobs, review queues, dispatch state, and operator actions.",
    operatorActions: [
      "Use /app for the workspace command summary and Needs Review queue.",
      "Use /app/jobs to create controlled pilot deliveries and inspect all jobs.",
      "Use the job detail decision banner for retry dispatch, payment, cancellation, or manual assignment decisions."
    ],
    slug: "deliveries",
    statusMeanings: [
      { status: "REQUESTED", meaning: "A job exists and is waiting for dispatch or assignment.", nextAction: "Watch dispatch attempts." },
      { status: "DISPATCH_FAILED", meaning: "No driver accepted or no eligible driver was available.", nextAction: "Retry dispatch or assign manually." },
      { status: "ASSIGNED", meaning: "A driver has accepted or been assigned.", nextAction: "Track progress to pickup." },
      { status: "EN_ROUTE_PICKUP", meaning: "Driver is travelling to pickup.", nextAction: "Monitor tracking and timeline." },
      { status: "PICKED_UP", meaning: "Driver has collected the order.", nextAction: "Monitor route to drop-off." },
      { status: "EN_ROUTE_DROP", meaning: "Driver is travelling to the customer.", nextAction: "Prepare for POD and delivery completion." },
      { status: "DELIVERED", meaning: "The driver completed delivery.", nextAction: "Confirm payment capture/order completion." }
    ],
    title: "Deliveries and Needs Review",
    whatThisScreenDoes: [
      "Summarizes active deliveries, completed work, and jobs requiring attention.",
      "Turns raw job state into diagnosis, impact, and recommended action.",
      "Shows route, driver, attempts, timeline, payment, and operator controls for each job."
    ],
    whatToDoNext: [
      "Start with Needs Review before creating new work.",
      "Open the job detail for every BLOCKER item.",
      "Retry dispatch only when the driver fixture or dispatch condition has been corrected."
    ]
  },
  driver: {
    callouts: [
      {
        body: "The driver app is a staged pilot execution surface. Image upload for POD may remain optional if the configured upload path is not available.",
        title: "POD image upload is staged",
        tone: "warning"
      }
    ],
    commonProblems: [
      "Driver profile not ready: the Supabase user does not have an approved driver row.",
      "No offers: the driver may be offline, too far from pickup, wrong vehicle type, or dispatch has not run.",
      "Offer disappeared: it may have expired, been rejected, or been accepted elsewhere.",
      "Cannot complete delivery: submit proof of delivery details before pressing Delivered."
    ],
    description: "The driver surface lets a staged driver go online, accept or reject offers, progress an active job, and submit POD.",
    operatorActions: [
      "Sign in as a staged driver account with an approved driver profile.",
      "Go online before creating or retrying dispatch for a nearby job.",
      "Accept an offer, progress through pickup and drop-off, submit POD, then complete delivery."
    ],
    slug: "driver",
    statusMeanings: [
      { status: "ONLINE", meaning: "Driver is available for staged dispatch offers.", nextAction: "Wait for offers or trigger dispatch." },
      { status: "OFFLINE", meaning: "Driver will not receive offers.", nextAction: "Go online." },
      { status: "ACCEPTED", meaning: "Offer accepted and job should be assigned.", nextAction: "Open active job progression." },
      { status: "DELIVERED", meaning: "Driver completed the final step.", nextAction: "Verify POD, payment capture, and order completion." }
    ],
    title: "Driver execution",
    whatThisScreenDoes: [
      "Shows availability and lets the driver toggle online/offline.",
      "Shows dispatch offers with pickup, drop, vehicle, and payout context.",
      "Guides the active job through pickup, drop-off, proof of delivery, and delivered state."
    ],
    whatToDoNext: [
      "Use /driver on a staged driver account.",
      "Keep the driver online and close to the pilot restaurant pickup coordinates.",
      "Use the stepper actions in order; do not skip POD before delivery completion."
    ]
  },
  payments: {
    callouts: [
      {
        body: "In staging, use Stripe test mode. A missing API secret or publishable key prevents checkout from proving the paid order path.",
        title: "Stripe test configuration is required",
        tone: "warning"
      }
    ],
    commonProblems: [
      "stripe_not_configured: Render or Vercel Stripe environment variables are missing or stale.",
      "secret_key_required: the API is not receiving a valid sk_test secret key.",
      "Payment authorized but not completed: the delivery has not been delivered and captured yet.",
      "Webhook pending: inspect outbox and webhook handling before assuming final payment state."
    ],
    description: "ShipWright uses Stripe test payment rails for the paid pilot order path and tracks authorization, capture, and order completion.",
    operatorActions: [
      "Confirm web has NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and API has STRIPE_SECRET_KEY.",
      "Use test card 4242 4242 4242 4242 in staging.",
      "Verify PAYMENT_AUTHORIZED after checkout and CAPTURED after delivered/capture flow.",
      "Check linked order, job, payment, job events, audit log, and outbox records when proving a flow."
    ],
    slug: "payments",
    statusMeanings: [
      { status: "REQUIRES_PAYMENT_METHOD", meaning: "No valid card has been collected.", nextAction: "Collect card details in checkout or the payment panel." },
      { status: "AUTHORIZED", meaning: "Stripe has authorized funds but not captured them.", nextAction: "Complete delivery before capture." },
      { status: "CAPTURED", meaning: "Payment capture succeeded.", nextAction: "Confirm the order is COMPLETED if the job is delivered." },
      { status: "FAILED", meaning: "Payment failed or Stripe rejected the request.", nextAction: "Inspect Stripe and API error details." }
    ],
    title: "Payments",
    whatThisScreenDoes: [
      "Explains payment state shown on orders and job detail.",
      "Separates authorization from final capture.",
      "Documents the staging test payment setup used by the paid pilot proof."
    ],
    whatToDoNext: [
      "Authorize payment during customer checkout.",
      "Progress the linked delivery to delivered.",
      "Verify capture and final customer order completion."
    ]
  },
  troubleshooting: {
    callouts: [
      {
        body: "Do not treat browser Stripe third-party cookie warnings as root cause unless the payment request itself fails. They are usually browser noise in this app.",
        title: "Ignore unrelated Stripe cookie warnings",
        tone: "info"
      }
    ],
    commonProblems: [
      "API timeout on /v1/business/context: check Render health, readiness, and auth token freshness.",
      "500 after deployment: confirm migrations are applied to staging Supabase and /readyz passes.",
      "No offers after paid order: verify staged driver fixture, online availability, vehicle type, and proximity.",
      "RSC payload fetch fallback: refresh the route and check whether the deployed web build changed while the browser tab was open.",
      "Duplicate order concern: retry with the same idempotency key and verify the same downstream records are reused."
    ],
    description: "Common staging and pilot-test issues for auth, migrations, dispatch, payments, and route proof.",
    operatorActions: [
      "Check /healthz first for process liveness.",
      "Check /readyz next for critical schema compatibility.",
      "Run the staging smoke/proof commands when credentials are available.",
      "Use Render logs for API exceptions and Supabase for record integrity proof."
    ],
    slug: "troubleshooting",
    statusMeanings: [
      { status: "healthz 200", meaning: "The API process is alive.", nextAction: "Check readiness next." },
      { status: "readyz 200", meaning: "Critical schema checks pass.", nextAction: "Run authenticated smoke or proof." },
      { status: "no_eligible_drivers", meaning: "Dispatch could not find a suitable staged driver.", nextAction: "Fix driver fixture then retry dispatch." },
      { status: "stripe_not_configured", meaning: "Stripe env is missing or not deployed.", nextAction: "Set env vars and redeploy API/web." }
    ],
    title: "Troubleshooting",
    whatThisScreenDoes: [
      "Gives operators a short checklist for the most common staging failures.",
      "Keeps proof-of-flow debugging grounded in API, database, and browser evidence.",
      "Separates real blockers from browser noise."
    ],
    whatToDoNext: [
      "Start with health and readiness.",
      "Confirm migrations and environment variables before debugging UI state.",
      "Verify downstream records after every paid-delivery proof."
    ]
  }
};

export function getHelpArticle(slug: string): HelpArticle | null {
  if (slug in helpArticles) {
    return helpArticles[slug as HelpArticleSlug];
  }

  return null;
}
