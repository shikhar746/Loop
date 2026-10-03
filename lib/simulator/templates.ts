// Pure data + helpers (no DB, no secrets) so both the simulate endpoint and prisma/seed.ts can use it.

export type SimChannel = "SUPPORT_TICKET" | "APP_REVIEW" | "NPS_SURVEY" | "SALES_NOTE" | "COMMUNITY" | "OTHER";
export type SimTopic =
  | "Onboarding"
  | "Billing"
  | "Performance"
  | "Mobile Experience"
  | "Integrations & SSO"
  | "Reporting & Export"
  | "Praise";
type Tone = "neg" | "neu" | "pos";

type Template = { topic: SimTopic; tone: Tone; channels: SimChannel[]; text: string };

const T = (topic: SimTopic, tone: Tone, channels: SimChannel[], text: string): Template => ({ topic, tone, channels, text });

const ST: SimChannel = "SUPPORT_TICKET";
const AR: SimChannel = "APP_REVIEW";
const NPS: SimChannel = "NPS_SURVEY";
const SN: SimChannel = "SALES_NOTE";
const CM: SimChannel = "COMMUNITY";

export const TEMPLATES: Template[] = [
  // Onboarding
  T("Onboarding", "neg", [ST, NPS], "Spent most of the afternoon trying to get our first {dataSource} connected. The setup wizard just says 'something went wrong' at step 3 with no detail."),
  T("Onboarding", "neg", [ST, CM], "The invite emails for my team never arrive. I've re-sent them {n} times. Checked spam too. We can't start the trial without them."),
  T("Onboarding", "neg", [NPS, SN], "Onboarding felt like it assumed we already knew the product. There's no sample data, so the empty dashboards told us nothing on day one."),
  T("Onboarding", "neu", [CM, ST], "Is there a recommended order for setup? The checklist says connect data first but the docs say create a workspace and roles first."),
  T("Onboarding", "neg", [SN, NPS], "Champion at {company} said the trial nearly stalled because nobody could figure out how to map their custom fields during import."),
  T("Onboarding", "pos", [NPS, CM], "The new guided setup is a big improvement. Had our first dashboard running in about {n} minutes."),
  T("Onboarding", "neg", [ST], "The 'Verify your domain' step keeps failing with a DNS error even though our TXT record has been live for {n} hours."),
  T("Onboarding", "neu", [SN], "Prospect asked whether we offer a white-glove onboarding call for teams over {seats} seats. Would help close {company}."),
  T("Onboarding", "neg", [CM, NPS], "Product tour popups kept covering the exact button the tour was telling me to click. Had to refresh three times."),
  T("Onboarding", "neg", [ST, AR], "Signed up, got to the 'choose your template' screen and it just spins forever. Tried Chrome and Safari."),

  // Billing
  T("Billing", "neg", [ST], "We were charged {amount} twice this month for the {plan} plan. Both charges show on our card statement. Need one refunded please."),
  T("Billing", "neg", [ST, NPS], "Our invoice jumped from {amount} to {amount2} with no warning. Nobody on our team added seats. What happened?"),
  T("Billing", "neg", [ST, CM], "The billing page says our card was declined but the bank shows the payment went through. Now the workspace is showing a lock warning."),
  T("Billing", "neg", [SN], "{company} is threatening to churn over the surprise proration charge after they downgraded from {plan}. Finance contact is upset."),
  T("Billing", "neg", [ST], "Invoices don't include our VAT number, so our finance team can't process them. This is the third month in a row."),
  T("Billing", "neg", [NPS, CM], "Pricing changes were announced in a footer link. Found out when the renewal hit at {amount2}. Really not okay."),
  T("Billing", "neg", [ST], "Tried to update the card on file and the form throws 'payment method invalid' for every card we try, including corporate Amex."),
  T("Billing", "neu", [SN, ST], "Customer asked if annual billing can be split into quarterly invoices. Their procurement can't approve {amount2} in one go."),
  T("Billing", "neg", [ST, NPS], "We cancelled the extra seats on the 3rd and were still billed for them on the renewal. Please fix and credit the difference."),
  T("Billing", "neg", [CM, ST], "Anyone else get double-charged after the billing system migration? Support says 3-5 days for a refund, which is a long time for {amount}."),
  T("Billing", "neg", [ST], "Receipt emails are going to an admin who left the company months ago. There's no way to change the billing contact in settings."),
  T("Billing", "pos", [NPS], "Appreciated the quick refund when we overpaid last quarter. Billing support was fast and friendly."),

  // Performance
  T("Performance", "neg", [ST, NPS], "Dashboards with more than {n} widgets take 20+ seconds to load. It's gotten noticeably worse over the past couple of weeks."),
  T("Performance", "neg", [CM, ST], "The feedback explorer freezes the whole tab when I filter by date range over 90 days."),
  T("Performance", "neg", [SN], "During the demo for {company} the search took ages to return. Prospect openly commented on how slow it was."),
  T("Performance", "neg", [NPS, AR], "It's a good tool but it's slow. Every click feels like it waits on the server."),
  T("Performance", "neg", [ST], "Getting timeouts (504) on the {report} every Monday morning when the whole team logs in."),
  T("Performance", "neu", [CM], "Is there a status page? Things felt sluggish around 9am EST today and I wasn't sure if it was us or you."),
  T("Performance", "pos", [NPS, CM], "Whatever you did to speed up search last release worked. Results are basically instant now."),
  T("Performance", "neg", [ST, CM], "Bulk tagging {n} items hangs at 'processing' and never completes. We had to do it in small batches."),
  T("Performance", "neg", [AR, NPS], "Charts take forever to render on my older laptop and the fan spins up like crazy."),
  T("Performance", "neg", [ST], "API responses for the /items endpoint went from ~200ms to over 3s this week. Our sync job is now timing out."),

  // Mobile Experience
  T("Mobile Experience", "neg", [AR], "App crashes every time I open a notification on my {device}. Have to reopen it and find the item manually."),
  T("Mobile Experience", "neg", [AR, NPS], "The mobile app logs me out constantly. Face ID worked for a day then stopped."),
  T("Mobile Experience", "neg", [AR], "Charts are unreadable on mobile. Labels overlap and you can't pinch to zoom."),
  T("Mobile Experience", "neg", [AR, ST], "Can't attach screenshots from the mobile app. The upload button does nothing on {device}."),
  T("Mobile Experience", "pos", [AR], "Love being able to check the dashboard on my commute. Dark mode on the app looks great."),
  T("Mobile Experience", "neu", [AR, CM], "Decent app but it's missing half of what the web version does. Would love editing filters on mobile."),
  T("Mobile Experience", "neg", [AR], "Latest update broke landscape mode on my {device}. The screen just goes blank."),
  T("Mobile Experience", "neg", [NPS, AR], "Push notifications arrive hours late, so by the time I see an alert it's no longer useful."),
  T("Mobile Experience", "pos", [AR, NPS], "The new offline mode saved me on a flight. Synced perfectly when I landed."),
  T("Mobile Experience", "neg", [AR], "The app takes up {n}00MB of storage and is sluggish. Feels like a wrapped website."),

  // Integrations & SSO
  T("Integrations & SSO", "neg", [ST, SN], "SSO with {idp} fails for users whose email has a plus sign. They get 'user not provisioned' every time."),
  T("Integrations & SSO", "neg", [ST, CM], "The {integration} sync stopped importing new records yesterday. No error in the integration log, it just says 'last synced 26h ago'."),
  T("Integrations & SSO", "neg", [SN], "{company} security review flagged that we don't support SCIM provisioning with {idp}. Deal is blocked until we have a timeline."),
  T("Integrations & SSO", "neu", [CM, SN], "Any plans for a native {integration} integration? We're using Zapier today and it's fragile."),
  T("Integrations & SSO", "neg", [ST], "After enabling SAML with {idp}, our admins were locked out with no fallback login. Had to email support to get back in."),
  T("Integrations & SSO", "pos", [NPS, CM], "The {integration} integration is the reason we chose you. Setup took five minutes and it just works."),
  T("Integrations & SSO", "neg", [ST, NPS], "Webhooks are firing twice for every event, which creates duplicate tickets in {integration}."),
  T("Integrations & SSO", "neg", [CM, ST], "The {integration} connector maps all custom fields to text, so our numeric fields are useless for filtering."),
  T("Integrations & SSO", "neu", [SN], "Prospect at {company} uses {idp} and asked whether JIT provisioning assigns roles from group claims."),
  T("Integrations & SSO", "neg", [ST], "OAuth token for {integration} expires every 24 hours and the reconnect flow loses our field mappings each time."),

  // Reporting & Export
  T("Reporting & Export", "neg", [ST, CM], "CSV export cuts off at 10,000 rows with no warning. We only noticed when totals didn't match."),
  T("Reporting & Export", "neg", [ST, NPS], "PDF exports of the {report} come out with charts missing. Just blank boxes where the graphs should be."),
  T("Reporting & Export", "neu", [SN, CM], "Customer wants scheduled exports to an S3 bucket instead of email. Mentioned it twice on the call with {company}."),
  T("Reporting & Export", "neg", [ST], "Exported dates are in UTC with no timezone label, and our exec team keeps misreading the {report}."),
  T("Reporting & Export", "pos", [NPS, CM], "The new {report} is exactly what our leadership wanted. Saved me hours of spreadsheet work this month."),
  T("Reporting & Export", "neg", [CM, NPS], "Can't share a report with someone outside the workspace without giving them a full seat. Need read-only links."),
  T("Reporting & Export", "neg", [ST], "The weekly digest email shows last week's numbers, not this week's. Been like this since the last release."),
  T("Reporting & Export", "neu", [SN], "{company} asked if custom report branding (logo, colors) is on the roadmap for the {plan} plan."),
  T("Reporting & Export", "neg", [ST, CM], "Excel export breaks non-English characters. All our German customer names come out garbled."),
  T("Reporting & Export", "neg", [NPS], "Reporting is too rigid. I can't group by the custom fields we actually care about."),

  // Praise / general
  T("Praise", "pos", [NPS], "Honestly the best feedback tool we've used. The theme grouping saves our PMs a ton of time every week."),
  T("Praise", "pos", [NPS, CM], "Support team is fantastic. {name} walked us through everything and followed up the next day."),
  T("Praise", "pos", [SN], "{company} renewal call went great. They called out the AI summaries as the feature their execs read every Monday."),
  T("Praise", "pos", [AR], "Clean, fast and easy to use. Five stars from our whole team."),
  T("Praise", "pos", [NPS], "Rolled this out to {seats} people and adoption has been great. The UI just makes sense."),
  T("Praise", "neu", [NPS], "It does the job. Nothing amazing, nothing terrible. Price feels about right."),
  T("Praise", "pos", [CM], "Shout-out to whoever built the keyboard shortcuts. Triage is so much faster now."),
  T("Praise", "pos", [SN], "Prospect at {company} said our trial was the most polished of the three tools they evaluated."),
  T("Praise", "neu", [NPS, CM], "Solid product overall. Would like more control over notification frequency but otherwise happy."),
  T("Praise", "pos", [NPS], "The Ask feature answered a question in seconds that used to take our research team a full day."),
];

const COMPANIES = [
  "Northwind Traders", "Contoso Health", "Brightline Logistics", "Fabrikam Retail", "Tailspin Toys", "Vandelay Industries",
  "Initech", "Hooli", "Pied Piper", "Stark Analytics", "Wonka Foods", "Umbrella Labs", "Blue Yonder Air", "Lakeside Bank",
  "Adventure Works", "Litware", "Proseware", "Coho Winery", "Margie's Travel", "Woodgrove Financial", "Alpine Ski House",
  "Fourth Coffee", "Trey Research", "Wide World Importers",
];
const PLANS = ["Starter", "Growth", "Business", "Enterprise"];
const ROLES = ["Admin", "Ops lead", "PM", "Finance", "CX manager", "Engineer", "Founder"];
const DEVICES = ["iPhone 15", "iPhone 13 mini", "Pixel 8", "Galaxy S23", "iPad Air", "OnePlus 12"];
const IDPS = ["Okta", "Azure AD", "Google Workspace", "OneLogin", "JumpCloud"];
const INTEGRATIONS = ["Salesforce", "HubSpot", "Slack", "Jira", "Zendesk", "Intercom", "Snowflake"];
const REPORTS = ["weekly digest", "executive summary report", "churn-risk report", "NPS trend report", "monthly theme report"];
const DATA_SOURCES = ["Zendesk account", "Intercom workspace", "HubSpot portal", "CSV upload", "Slack channel"];
const AGENTS = ["Priya", "Marcus", "Elena", "Tom", "Aisha", "Diego"];
const AMOUNTS = ["$49", "$129", "$249", "$480", "$1,200"];
const AMOUNTS_HIGH = ["$1,940", "$2,400", "$3,150", "$5,800"];

export type Rng = () => number;

/** Small deterministic PRNG so the seed produces the same data every run. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function intBetween(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function fill(text: string, rng: Rng, company: string, plan: string): string {
  return text
    .replace(/\{company\}/g, company)
    .replace(/\{plan\}/g, plan)
    .replace(/\{device\}/g, () => pick(rng, DEVICES))
    .replace(/\{idp\}/g, () => pick(rng, IDPS))
    .replace(/\{integration\}/g, () => pick(rng, INTEGRATIONS))
    .replace(/\{report\}/g, () => pick(rng, REPORTS))
    .replace(/\{dataSource\}/g, () => pick(rng, DATA_SOURCES))
    .replace(/\{name\}/g, () => pick(rng, AGENTS))
    .replace(/\{amount2\}/g, () => pick(rng, AMOUNTS_HIGH))
    .replace(/\{amount\}/g, () => pick(rng, AMOUNTS))
    .replace(/\{seats\}/g, () => String(pick(rng, [25, 40, 75, 120, 300])))
    .replace(/\{n\}/g, () => String(intBetween(rng, 3, 12)));
}

function starsFor(tone: Tone, rng: Rng): number {
  if (tone === "neg") return intBetween(rng, 1, 2);
  if (tone === "neu") return 3;
  return intBetween(rng, 4, 5);
}

function sourceRefFor(channel: SimChannel, rng: Rng, tone: Tone): string {
  switch (channel) {
    case "SUPPORT_TICKET":
      return `ZD-${intBetween(rng, 41000, 49999)}`;
    case "APP_REVIEW":
      return `${pick(rng, ["IOS", "GP"])}-${intBetween(rng, 100000, 999999)}`;
    case "NPS_SURVEY": {
      const score = tone === "neg" ? intBetween(rng, 0, 6) : tone === "neu" ? intBetween(rng, 7, 8) : intBetween(rng, 9, 10);
      return `NPS-${intBetween(rng, 10000, 99999)}-S${score}`;
    }
    case "SALES_NOTE":
      return `SF-OPP-${intBetween(rng, 100000, 999999)}`;
    case "COMMUNITY":
      return `forum/t/${intBetween(rng, 1000, 9999)}`;
    default:
      return `MISC-${intBetween(rng, 1000, 9999)}`;
  }
}

function labelFor(channel: SimChannel, rng: Rng, tone: Tone, company: string, plan: string): string {
  if (channel === "APP_REVIEW") {
    return `${pick(rng, ["App Store", "Google Play"])} reviewer · ${starsFor(tone, rng)}★`;
  }
  if (channel === "COMMUNITY") return `${pick(rng, ROLES)} at ${company}`;
  return `${company} · ${plan}`;
}

export type GeneratedFeedback = {
  content: string;
  channel: SimChannel;
  customerLabel: string;
  sourceRef: string;
  topic: SimTopic;
};

/** One realistic feedback item. Filter by channel (simulator) and/or topic (seed). */
export function generateFeedback(rng: Rng, opts: { channel?: SimChannel; topic?: SimTopic } = {}): GeneratedFeedback {
  // OTHER has no dedicated templates; it borrows from the whole bank.
  const byChannel = opts.channel && opts.channel !== "OTHER" ? TEMPLATES.filter((t) => t.channels.includes(opts.channel as SimChannel)) : TEMPLATES;
  const pool = opts.topic ? byChannel.filter((t) => t.topic === opts.topic) : byChannel;
  const template = pick(rng, pool.length ? pool : byChannel);
  const channel = opts.channel ?? pick(rng, template.channels);
  const company = pick(rng, COMPANIES);
  const plan = pick(rng, PLANS);
  return {
    content: fill(template.text, rng, company, plan),
    channel,
    customerLabel: labelFor(channel, rng, template.tone, company, plan),
    sourceRef: sourceRefFor(channel, rng, template.tone),
    topic: template.topic,
  };
}
