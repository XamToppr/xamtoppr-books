# XamToppr Books

The XamToppr Books web portal provides competitive-exam books, study notes, PDF previews, interactive flipbooks, exam notifications, and a Sanity-powered admin studio.

## Architecture

- **Frontend:** React 19, Vite, Tailwind CSS, and Lucide icons.
- **Authentication:** Firebase Authentication with Google sign-in and browser-local persistence.
- **User profiles:** Firestore `users/{uid}` documents store the account profile and phone number.
- **Shopping cart:** A global React `CartContext` persists selected catalog books in browser `localStorage`.
- **Coupons:** Sanity-managed coupon documents are validated in the UI and authoritatively revalidated by the order API before checkout.
- **Payments:** Razorpay Checkout handles single-book and cart purchases. Server endpoints create catalog-priced orders and verify Razorpay signatures and captured-payment status before recording purchases.
- **CMS:** Sanity manages books, notifications, site content, book requests, and student profile records.
- **Server endpoints:** Vercel Functions under `api/` write to Sanity with a server-side token. Vite middleware in `vite.config.js` supplies the matching endpoints during local development.
- **Interactive reading:** `react-pageflip` powers the sample flipbook; paid books open Razorpay Checkout.

### Main source locations

| Path | Responsibility |
| --- | --- |
| `src/App.jsx` | Store UI, book viewer and flipbook, book-request form, routing, checkout, and Sanity content reads |
| `src/pages/BookDetailPage.jsx` | `/book/:slug` book details, share metadata and links, coupons, and single-book checkout |
| `src/pages/VideoCoursesPage.jsx` | Sanity-backed video course storefront, standalone class filtering, lesson navigation, and player |
| `src/sanityQueries.js` | GROQ queries for books, video packs, standalone online classes, notifications, and site settings |
| `src/context/AuthContext.jsx` | Firebase auth state, Firestore user profile, duplicate-phone check, and student sync request |
| `src/context/CartContext.jsx` | Persistent cart state and cart actions |
| `src/components/profile/MyLibrary.jsx` | `/my-library` page backed by the signed-in user's Firestore purchase fields and Sanity catalog |
| `src/components/cart/CartDrawer.jsx` | Cart item list, removal, total, and checkout action |
| `src/services/firebase.js` | Firebase app, Auth, Firestore, and local persistence initialization |
| `src/sanityClient.js` | Public, read-only Sanity client |
| `sanity/schemaTypes.js`, `sanity/masterSchemas.js`, `sanity/schemas/coupon.js`, `sanity/schemas/videoCoursePack.js`, `sanity/schemas/onlineClass.js` | Sanity document and object schemas, including taxonomy, coupons, video packs, and standalone classes |
| `sanity.config.js` | Embedded Studio configuration and taxonomy-filtered Online Course Classes desk at `/admin` |
| `api/sync-student.js` | Authenticated server-side student profile upsert |
| `api/create-razorpay-order.js` | Creates authenticated Razorpay orders from current Sanity catalog prices |
| `api/verify-razorpay-payment.js` | Verifies Razorpay payment signature/capture and records the purchase |
| `api/log-user-activity.js` | Authenticated student activity sync to Sanity |
| `api/request-book.js` | Server-side book request creation |
| `server/studentProfileSync.js` | Firebase ID-token verification and student document mapping |
| `vite.config.js` | Vite development server and local API middleware |

## Authentication and profile flow

1. Firebase Auth is configured with `browserLocalPersistence`, so a signed-in session survives a page refresh.
2. After Auth restores or establishes a user, `AuthContext` reads `users/{uid}` from Firestore before publishing the loaded profile to the app.
3. Google sign-in checks that same Firestore document. A returning account with a saved phone bypasses phone onboarding; a missing/empty phone requires onboarding.
4. Phone submission validates the number and queries Firestore for matching `phone` values. A match owned by another UID is rejected before the current user's profile is updated.
5. Student profile sync is sent to `/api/sync-student` after a user is restored/signed in and after a phone is saved. Login and phone onboarding do not wait for Sanity to respond.
6. The endpoint verifies the Firebase ID token, checks that the requested UID matches the authenticated account, and upserts `student_<uid>` into Sanity.

The Auth provider catches and reports synchronization errors without creating unhandled promise rejections. The Sanity write token stays on the server; do not write directly from the browser with a privileged token.

## Sanity schemas and sync

Sanity Studio is available at `/admin`. Schemas in `sanity/schemaTypes.js` include:

- `book`
- `bookRequest`
- `studentUser`
- `coupon`
- `siteSettings`
- `examNotification`
- Supporting objects for dates, salary entries, selection stages, exam patterns, syllabus, document specifications, tables, rich notes, and guide blocks.

The `studentUser` document uses a stable ID (`student_<Firebase UID>`) and fields `fullName`, `email`, `phone`, `firebaseUid`, `createdAt`, and `purchasedBooks`. Each login/profile sync updates profile fields without replacing existing orders. `purchasedBooks` contains a book reference, title snapshot, original amount, final amount paid, applied coupon code, order/payment ID, and purchase timestamp. `bookRequest` documents are also written through a server endpoint.

The **File Upload** tool in the Studio navigation uploads PDFs and images as Sanity assets. Choose an upload type, optionally add a remark, and use **Add More** to upload several assets in one operation. The selected upload type is saved as the asset label and the remark as its description; each successful upload displays a public CDN URL that can be copied. Uploads use the authenticated Sanity Studio client, so no privileged API token is exposed in the browser. Sanity asset URLs are public; do not upload files that must remain private.

### Book master taxonomy

The **Master** section in Sanity Studio (`/admin`) manages Tracks, Platforms, Subjects, Modules, and Topics. Each document has a name, generated slug, and Active/Inactive status. Platforms reference Tracks, Subjects reference Platforms, Modules reference Subjects, and Topics reference Modules. Create parents first; a child’s parent is required.

Books use optional `trackRef`, `platformRef`, `subjectRef`, `moduleRef`, and `topicRef` references. The available child references are filtered by the selected parent and inactive master documents are excluded, while leaving every book taxonomy reference optional so general books can remain uncategorized. The old free-text `exam`, `examCategory`, and `subject` fields are retained but hidden for compatibility with existing records. The storefront exposes filters for Track, Platform, Subject, and Topic, and book-detail breadcrumbs display the assigned hierarchy, falling back to legacy exam/subject metadata for older books.

The header's **Video Courses** tab opens a responsive storefront backed by Sanity `videoCoursePack` documents. Each pack maps Tracks, Platforms, Subjects, and an explicit `classes` array of references to centralized `onlineClass` documents. Each class maps through the Master Taxonomy hierarchy (Track → Platform → Subject → Module → Topic). Manage classes from the dedicated **Online Course Classes** section in Sanity Studio. Its **Browse by Master Taxonomy** list drills through Track, Platform, Subject, Module, and Topic to show matching classes; each reference field in a class document is filtered by its selected parent. New class videos are no longer edited inside course packs; the old embedded lesson field is hidden and retained only as a storefront compatibility fallback for existing content. Course packs can also define multiple `pricingPlans`, `courseFeatures`, `mentors`, a `courseTypeTag`, language, video hours, mock-test count, and e-book count. These power the catalog cards and responsive course detail page with subject navigation and a sticky purchase card.

**Explore** opens `/video-courses/:slug`, with Description, Time Table, Syllabus / Planner, Demo Videos, and a content tab titled by the admin-selected Live Class or Recorded Video mode. The content tab drills from subject through module and topic to the pack's explicitly referenced classes. Long-format videos play in a responsive 16:9 modal; short reels use a vertical 9:16 player. YouTube watch, share, Shorts, and embed links are normalized to privacy-enhanced embed URLs; Vimeo links and hosted MP4/WebM/OGG files are also supported. The player modal can show class PDF notes and a related book card.

`VIDEO_COURSE_PACKS_QUERY` returns Instant packs and Scheduled packs whose publishing date has passed; Draft and future-scheduled packs stay out of the storefront. The query expands only the classes explicitly referenced by each pack and the storefront hides Inactive classes. Paid courses use the shared cart, coupon, and Razorpay checkout flow, with server-side catalog pricing and course purchase records; the course-access endpoint checks the student's enrollment before returning paid class links to the storefront. Free-course enrollments are recorded on the signed-in student's Sanity and Firebase profiles. Sanity documents must also be published for public queries to return them; the pack's Scheduled status controls storefront visibility but does not automatically publish the Sanity document. Sanity's public dataset and query endpoint are not an access-control boundary: a published Sanity media URL is still publicly retrievable, so use private storage/signed URLs for media that must remain confidential.

Create coupon documents in Sanity Studio under **Coupon**. Coupon codes must be uppercase and may contain letters, numbers, hyphens, and underscores. Choose `percentage` or `flat`, set a positive discount value, and optionally set a minimum order amount and expiry. Toggle **Active** off to disable a coupon without deleting it. Percentage discounts are limited to 100%; a coupon must leave at least ₹0.01 payable.

Each paid Sanity `book` can have a **Sample PDF** (`samplePdfFile`) and a separate **Original Full Book PDF (Paid Only)** (`fullPdfFile`). Upload the sample separately from the full book. Store the original in `fullPdfFile`; do not put a full book in the sample field.

Every book has a required title-derived URL slug. Book detail pages are available at `/book/:slug`; catalog cards link to the page and include a one-click copy-link action. The detail page sets a canonical URL and book-specific Open Graph and Twitter metadata, and provides WhatsApp and Telegram share links. The Vercel SPA rewrite also serves direct requests and page refreshes for these URLs.

### Purchase tracking

Buy Now and Proceed to Checkout use Razorpay Checkout for one or multiple books. The browser sends only Sanity book IDs, an optional coupon code, and its expected payable amount; `/api/create-razorpay-order` authenticates the Firebase user, resolves authoritative `offerPrice` values from Sanity, fetches the current coupon directly from Sanity, and validates its active status, expiry, minimum order, discount type, and value. The server recalculates the discount and payable amount in paise (`Math.round(finalDiscountedAmount * 100)`), rejecting stale or modified browser totals before creating the Razorpay order. The same discounted amount is displayed in Checkout. On Razorpay's callback, `/api/verify-razorpay-payment` validates the Razorpay HMAC signature and checks the payment against Razorpay's API, including that its status is `captured`, amount and currency match the order, and the order belongs to the signed-in Firebase UID. Only after those checks does the server append order entries (including original amount, final amount, and coupon code) to `student_<uid>.purchasedBooks` and create a `purchase_complete` Sanity activity. The client then awaits the verified purchase write to `users/{uid}` and Firestore `userActivities`, refreshes AuthContext's in-memory `userProfile`, and only then clears the cart and navigates to `/my-library`. Payment IDs are deduplicated. Guests are prompted to sign in before checkout.

### Full-book unlocking

My Library reads the signed-in user's purchase IDs/details from Firestore, then queries Sanity only for those book IDs. It displays **Read Full Book** and **Download PDF** actions only when the matching book has a `fullPdfFile` asset URL; the sample PDF remains a separate **Preview Sample PDF** action. Keep the full original PDF in `fullPdfFile` and the preview in `samplePdfFile` to maintain the distinct unlocked and sample resources. This is an application-level entitlement gate; Sanity file asset URLs are not intrinsically private, so use authenticated private storage and a server-side entitlement-checked delivery endpoint if the original PDFs must not be accessible to anyone who obtains an asset URL.

The single-book detail view and cart drawer accept coupons before checkout. Applying a coupon shows the savings and recalculates the payable total; removing it restores the original price. The UI performs a read-only Sanity lookup for a responsive preview, but the authenticated order endpoint revalidates the coupon and signs the validated coupon/pricing into the order metadata. Coupon code and final amount are stored alongside each verified Sanity and Firestore purchase record.

The Razorpay key secret is server-only. A captured payment whose browser callback is interrupted may require reconciliation; configure a Razorpay webhook for operational recovery before relying on browser callbacks as the only fulfillment notification.

### My Library and cart

The `/my-library` route reads `users/{uid}.purchasedBooks` and `users/{uid}.purchasedBookIds` from Firestore through the shared `fetchUserLibrary` service, then resolves matching book documents from the public Sanity catalog for titles, covers, and PDF links. The **My Purchases** modal uses the same service and records, so both views show matching purchase dates, amounts, and full-book actions. Only a verified purchase integration should populate those purchase fields.

`CartProvider` wraps the app and persists its `cartItems` in `localStorage` under `xamtoppr-books-cart`. Its `addToCart`, `removeFromCart`, and `clearCart` actions maintain a derived `cartTotal`. Paid book cards and detail views expose Add to Cart/Go to Cart actions, and the header cart drawer shows selected books, removes items, and calculates the total. Proceed to Checkout creates one Razorpay order for all selected books and clears the cart only after verified payment and successful Firestore library updates.

## Student Activity & Leads

`src/services/activityTracker.js` logs signed-in activity to Firestore `userActivities`, increments `users/{uid}.totalCoins` in a transaction, and updates `lastActiveAt`. Daily website visits are deduplicated per local calendar day. Logging is background work; offline or Sanity failures do not block the UI. Signed-out users do not earn coins.

| Event | Firestore/Sanity action | Coins |
| --- | --- | ---: |
| Daily Website Visit | `daily_login_visit` | 10 |
| Book Detail Modal Open | `view_book_detail` | 5 |
| Sample PDF / Flipbook Open | `read_sample_pdf` | 15 |
| Add to Cart | `add_to_cart` | 20 |
| Book Purchase Successful | `purchase_complete` | 50 |
| Payment Failed / Checkout Dismissed | `payment_dropped` | 0 |

The first four engagement events and payment-drop events are logged by the app. A Razorpay checkout dismissal or failed payment writes a `payment_dropped` Sanity event with student contact details, book, timestamp, and drop-off reason, and marks the student `ULTRA_HOT` unless they are already converted. `purchase_complete` is recorded only after the server verifies Razorpay's payment signature and confirms the payment is captured; the generic client activity endpoint rejects purchase events. Sanity purchase activity includes the paid amount and 50 coins, and sets the student status to `CONVERTED`. Sanity `userActivity` documents contain student contact details, interested book, action, coins earned, cumulative coins, lead status, and timestamp.

The Sanity Studio tool **Student Activity & Leads** groups activity events into one row per unique student, using Firebase UID (or the Sanity student reference, email, or phone as a fallback identity). The summary row shows contact details, highest lead status, total coins, activity count, latest interested book, and last-active time. Expand a student row to view every event in chronological order. Search applies to student name/phone; lead filters use the student's highest status, and activity filters include students who performed that event at least once.

The CSV export uses the same filtered, deduplicated student rows and is named `xamtoppr-leads-YYYY-MM-DD.csv`. Its columns are Name, Phone, Email, Lead Status, Total Coins, Total Actions, Latest Interested Book, and Last Active Time. Lead status is Hot if the student has added a book to cart or has at least 100 total coins; otherwise it is Warm if the student has read a sample; all others are Cold. The `studentUser` schema includes the `purchasedBooks` array and `totalCoins`.

### Sanity document action roles

`sanity.config.js` resolves document actions using the logged-in user's Sanity roles. Users with the `administrator` role retain the default actions, including Delete. All other users (including editors and users without an administrator role) have Delete, Discard Changes, and Unpublish removed from the document action menu. Other actions such as Publish and Duplicate remain available, and editors can create and edit documents and upload assets according to their assigned Sanity permissions. Manage role membership and underlying dataset permissions in Sanity Manage; this Studio action-menu restriction is a UX safeguard and does not replace server-side/API access controls.

The public Sanity client is read-only. Book requests, profile records, and activity events are written by server endpoints using a Sanity token with dataset write permission. **Configure write tokens only as the server-side `SANITY_API_WRITE_TOKEN`; never prefix them with `VITE_`, reference them in browser code, or commit real credentials.**

## Environment variables

Set these values in a local `.env` file for development and as Vercel environment variables for the Production deployment. Do not include quotes around values unless required by the value itself.

### Firebase web configuration

These Firebase web app values are public client configuration (not service-account credentials):

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Yes | Firebase Auth ID-token verification and web app initialization |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Google authentication |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project and Firestore |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase app configuration |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase app configuration |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app configuration |
| `VITE_RAZORPAY_KEY_ID` | Yes for checkout | Public Razorpay Checkout key ID used by the browser |

### Sanity configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `SANITY_API_WRITE_TOKEN` | Yes for writes | **Server-only** token with write access for student sync, activity, and purchase records |
| `VITE_SANITY_API_WRITE_TOKEN` | Fallback | Accepted by server routes for existing Vercel configurations; never reference it from frontend code |
| `SANITY_WRITE_TOKEN` | Fallback | Legacy server-only alias for the Sanity write token |
| `SANITY_PROJECT_ID` | No | Server project ID; defaults to `rkev3aui` |
| `SANITY_DATASET` | No | Server dataset; defaults to `production` |
| `VITE_SANITY_PROJECT_ID` | No | Public Sanity project ID override; also accepted as a server-side compatibility fallback |
| `VITE_SANITY_DATASET` | No | Public Sanity dataset override; also accepted as a server-side compatibility fallback |

### Razorpay configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_RAZORPAY_KEY_ID` | Yes | Public Checkout key ID bundled for Razorpay.js |
| `RAZORPAY_KEY_ID` | Yes for server order creation | Server-side Razorpay key ID; should match the browser key ID (`VITE_RAZORPAY_KEY_ID` is also accepted server-side) |
| `RAZORPAY_KEY_SECRET` | Yes | **Server-only** secret for Razorpay REST API authentication and payment signature verification (`RAZORPAY_SECRET` and `VITE_RAZORPAY_KEY_SECRET` are also accepted server-side) |

For a typical local `.env`, provide all six Firebase variables, the Razorpay test key ID, `RAZORPAY_KEY_SECRET`, and `SANITY_API_WRITE_TOKEN`. Project ID and dataset can be omitted to use the defaults. Prefer non-`VITE_` names for secrets: the prefix is not a security control, and variables referenced by browser code may be included in the client bundle. Never reference Sanity write tokens or Razorpay secrets from frontend code. Do not paste real values into this README or commit the `.env` file.

### Local `.env` template

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_RAZORPAY_KEY_ID=rzp_test_replace_with_test_key_id

SANITY_API_WRITE_TOKEN=
RAZORPAY_KEY_ID=rzp_test_replace_with_test_key_id
RAZORPAY_KEY_SECRET=replace_with_test_key_secret
# Optional overrides:
# SANITY_PROJECT_ID=rkev3aui
# SANITY_DATASET=production
# VITE_SANITY_PROJECT_ID=rkev3aui
# VITE_SANITY_DATASET=production
```

`/api/sync-student` accepts the Firebase API key in the authenticated request body because it is public Firebase web configuration. The Firebase ID token is independently verified before a Sanity write. A valid Sanity write token is still required server-side; the service cannot safely write if this credential is absent.

## Local development

Requirements: Node.js supported by the installed Vite version and npm.

```sh
npm install
npm run dev
```

The Vite middleware implements `/api/request-book`, `/api/sync-student`, `/api/log-user-activity`, `/api/create-razorpay-order`, and `/api/verify-razorpay-payment` for local use. Configure the environment variables above, then visit the URL printed by Vite. Sanity Studio is served by the application at `/admin`.

### Razorpay test mode

1. Create or open a Razorpay account and use its **Test Mode** API key pair for local development.
2. Set `VITE_RAZORPAY_KEY_ID` in the Vite environment and set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` for server endpoints. The API also supports `VITE_RAZORPAY_KEY_ID` and `VITE_RAZORPAY_KEY_SECRET` as server-side fallbacks; keep secrets out of frontend code.
3. Set the Sanity write token and Firebase web configuration as described above; the server must be able to verify Firebase ID tokens and write purchase records to Sanity.
4. Restart Vite after changing environment values, sign in, and test a single-book purchase and a multi-book cart checkout using Razorpay's official test payment methods.
5. Confirm that declined/cancelled payments create no purchase records, while a captured test payment appears in the user's My Library, the `studentUser.purchasedBooks` array, and the `purchase_complete` activity in Sanity.

Useful checks:

```sh
npm run lint
npm run build
npm run preview
```

## Vercel deployment

1. Import the Git repository into Vercel and set the project root to the repository root.
2. Use `npm install` for install and `npm run build` for the build command. Vite outputs to `dist`.
3. Add the six `VITE_FIREBASE_*` values, `VITE_RAZORPAY_KEY_ID`, and the server credentials in **Project Settings → Environment Variables** for Production (and Preview/Development as appropriate). API routes accept `SANITY_API_WRITE_TOKEN`, `SANITY_WRITE_TOKEN`, or `VITE_SANITY_API_WRITE_TOKEN` for the Sanity write token; Razorpay accepts `RAZORPAY_KEY_ID` or `VITE_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, `RAZORPAY_SECRET`, or `VITE_RAZORPAY_KEY_SECRET`. Start with Razorpay test credentials.
4. Optionally configure `SANITY_PROJECT_ID` and `SANITY_DATASET` if not using the defaults.
5. Redeploy after adding or changing environment variables. Vercel serves `api/*.js` as serverless functions; `vercel.json` rewrites frontend paths to the SPA while `/api/*` routes are handled by their functions and applies security headers, including a CSP for the storefront's Sanity, Firebase, Razorpay, Google Fonts, YouTube, and Vimeo integrations. HTTPS-hosted course media is allowed for admin-managed video URLs.
6. Test Google login, refresh persistence, phone onboarding, student and activity records in Sanity Studio, leads filters/CSV export, book requests, single-book checkout, multi-book checkout, and cancelled/declined payments.

If `/api/sync-student` returns an error, inspect the response JSON and Vercel Function logs. `VITE_` is not a security prefix: any such value referenced by browser code can be included in the client bundle. The Sanity write token and Razorpay secret are only read by server routes through `process.env`; do not reference or expose them in frontend code. Prefer the non-`VITE_` names for secrets where possible.
