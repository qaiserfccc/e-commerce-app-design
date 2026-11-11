# CRO analytics and marketing integrations

The Admin **Growth** workspace contains the conversion overview, a directional funnel, a persistent CRO action board, and browser-tag configuration. It is an operations surface, not an experiment platform: it does not split traffic, run A/B tests, or establish causal attribution.

## Privacy and consent

- Optional marketing tags and first-party CRO events are disabled until a visitor chooses **Allow analytics** in the storefront consent banner. **Reject optional analytics** keeps them disabled. The choice is stored in that browser's local storage and can be changed from the banner/preferences control.
- Meta Pixel, Google tags, and TikTok Pixel are loaded only after acceptance. Consent changes are also sent to the loaded Meta and Google APIs; configure GTM tags to require the appropriate consent types.
- The first-party funnel stores only a random browser-session UUID, event name, local page path, optional product UUID, optional value/currency, and timestamp. It does not collect contact details, full URLs, query strings, IP addresses, or order identifiers. Events older than 90 days are removed in batches during event ingestion.
- `consentGranted: true` is a client signal, not proof of legal consent. Keep the consent UI and privacy notice appropriate for the jurisdictions where the storefront operates.
- Funnel session counts are directional and are not verified unique people or sequentially attributed users. First-party order counts come from the order table and remain authoritative. Consent opt-out, browser blocking, and script failures can make analytics conversions lower than actual orders.

## Configure browser providers

Open **Admin → Growth → Marketing integrations** with an admin account. Save public IDs only. Values are stored in the `marketing_integrations` setting and returned by `GET /api/storefront/tracking-config`; never paste an access token, password, or secret into these fields.

| Provider | Required value | Where to get it |
|---|---|---|
| Meta Pixel | Numeric Pixel ID | Meta Business Suite → Events Manager → select/create the website data source → Pixel settings |
| Google Analytics 4 | Measurement ID beginning `G-` | Google Analytics → Admin → Data streams → select the `isklenses.com` web stream |
| Google Tag Manager | Container ID beginning `GTM-` | tagmanager.google.com → choose the web container; its ID is shown in the container UI and installation instructions |
| Google Ads | Conversion ID beginning `AW-` and its conversion label | Google Ads → Goals → Conversions → select the purchase action → Tag setup; both values are required |
| TikTok Pixel | Pixel ID | TikTok Ads Manager → Tools → Events → select the web data source → Pixel settings |

Use **either** a GTM container or direct GA4/Google Ads IDs. When GTM is configured, leave the direct GA4 and Google Ads fields blank to prevent duplicate Google tags. Configure GTM to listen for these `dataLayer` event names: `isk_page_view`, `isk_view_item`, `isk_add_to_cart`, `isk_begin_checkout`, and `isk_purchase`. The payload may include a product UUID, page path, value, and currency. GTM tags must respect consent.

The browser integrations use provider IDs, not access tokens. Meta Conversions API and Google Analytics Measurement Protocol event delivery are not implemented. Do not treat this configuration page as supporting either server-side API.

## Meta Lead Ads CRM webhook

Meta Lead Ads is a separate existing server-to-server integration, not the browser Pixel. Its status panel reports which environment-variable **names** are missing; it never returns values. The webhook callback URL is:

```text
https://isklenses.com/api/webhooks/meta-leads
```

In the Meta developer app, configure the Page `leadgen` webhook subscription and use an unpredictable verification token that you also store as `META_WEBHOOK_VERIFY_TOKEN`. Set these variables as **server-only Production environment variables** in the `e-commerce-app-design` Vercel project:

| Variable | Source |
|---|---|
| `META_APP_SECRET` | Meta developer app → App settings → Basic → App secret |
| `META_PAGE_ACCESS_TOKEN` | A Page access token for the connected Page with the access needed to retrieve its lead details |
| `META_PAGE_ID` | Numeric ID of the Page subscribed to lead events |
| `META_WEBHOOK_VERIFY_TOKEN` | A strong random value you choose and enter both in the app environment and Meta webhook verification |
| `META_GRAPH_API_VERSION` | A currently supported Meta Graph API version in the `vNN.N` format; do not use a placeholder |

For the Page token, use Meta's Graph API Explorer with the correct developer app and Page, authorize the access needed to retrieve lead details, then query `/me/accounts` and copy the token for the connected Page. Treat Explorer tokens as temporary: for ongoing Production use, issue and maintain a suitably scoped Page token through the business's Meta app/System User setup, ensure the Page has granted the app lead access, and follow Meta's current app-review and token-expiration requirements. Subscribe the actual Page to the app's `leadgen` webhook field. Do not put the token in source control, the admin Pixel form, a `NEXT_PUBLIC_` variable, or a browser/mobile bundle.

Select the Production environment, keep every value server-side (never use a `NEXT_PUBLIC_` prefix), save, and redeploy so the webhook runtime receives the configuration. Restrict Page and app permissions to what lead retrieval requires, rotate credentials if exposed, and verify webhook delivery with Meta's test tools. The CRM only receives submissions Meta sends for the configured Page; follow Meta's and applicable privacy/consent requirements.

## Events and reporting

| Event | When it is recorded |
|---|---|
| `page_view` | A non-admin storefront route is viewed |
| `view_item` | A product route is viewed |
| `add_to_cart` | A product is successfully added to the bag |
| `begin_checkout` | Checkout is viewed |
| `purchase` | The server accepts a new order (not a replayed/idempotent response) |

The Admin funnel supports 7-, 30-, and 90-day views, daily page views, top pages, event/session counts, and order counts. Page and product routes exclude query strings. The first-party endpoint is same-origin only, requires the consent flag, rejects extra data fields, applies request limits, and uses `store_growth_events` after migration `0028_growth_analytics.sql` is applied.

## Mobile/API boundary

This consent UI and browser-tag loader are web-only. `GET /api/storefront/tracking-config` exposes public IDs, and `POST /api/storefront/growth-events` accepts only same-origin browser requests. They are not a mobile analytics SDK or authenticated native event API. Flutter clients should use their own platform SDKs and consent flow; do not copy server secrets or database credentials into a mobile application. The dashboard's first-party funnel and CRO action board are not synchronized to Flutter.

The API discovery endpoint, `openapi.json`, and [`API_MOBILE_INTEGRATION.md`](API_MOBILE_INTEGRATION.md) describe this web-only boundary.
