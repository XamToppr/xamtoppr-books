# XamToppr Books

The XamToppr Books web portal provides competitive-exam books, study notes, PDF previews, interactive flipbooks, exam notifications, and a Sanity-powered admin studio.

## Architecture

- **Frontend:** React 19, Vite, Tailwind CSS, and Lucide icons.
- **Authentication:** Firebase Authentication with Google sign-in and browser-local persistence.
- **User profiles:** Firestore `users/{uid}` documents store the account profile and phone number.
- **Shopping cart:** A global React `CartContext` persists selected catalog books in browser `localStorage`.
- **CMS:** Sanity manages books, notifications, site content, book requests, and student profile records.
- **Server endpoints:** Vercel Functions under `api/` write to Sanity with a server-side token. Vite middleware in `vite.config.js` supplies the matching endpoints during local development.
- **Interactive reading:** `react-pageflip` powers the sample flipbook. Paid checkout links and existing book-viewer behavior remain in the frontend.

### Main source locations

| Path | Responsibility |
| --- | --- |
| `src/App.jsx` | Store UI, book viewer and flipbook, book-request form, checkout links, and Sanity content reads |
| `src/context/AuthContext.jsx` | Firebase auth state, Firestore user profile, duplicate-phone check, and student sync request |
| `src/context/CartContext.jsx` | Persistent cart state and cart actions |
| `src/components/profile/MyLibrary.jsx` | `/my-library` page backed by the signed-in user's Firestore purchase fields and Sanity catalog |
| `src/components/cart/CartDrawer.jsx` | Cart item list, removal, total, and checkout action |
| `src/services/firebase.js` | Firebase app, Auth, Firestore, and local persistence initialization |
| `src/sanityClient.js` | Public, read-only Sanity client |
| `sanity/schemaTypes.js` | Sanity document and object schemas |
| `sanity.config.js` | Embedded Studio configuration at `/admin` |
| `api/sync-student.js` | Authenticated server-side student profile upsert |
| `api/track-purchase.js` | Authenticated checkout/purchase event tracking |
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
- `siteSettings`
- `examNotification`
- Supporting objects for dates, salary entries, selection stages, exam patterns, syllabus, document specifications, tables, rich notes, and guide blocks.

The `studentUser` document uses a stable ID (`student_<Firebase UID>`) and fields `fullName`, `email`, `phone`, `firebaseUid`, `createdAt`, and `purchasedBooks`. Each login/profile sync updates profile fields without replacing existing orders. `purchasedBooks` contains a book reference, title snapshot, amount, order/payment ID, and purchase timestamp. `bookRequest` documents are also written through a server endpoint.

### Purchase tracking

When a signed-in user with a saved phone clicks a paid book's **Buy Now** action, the app adds the Sanity book ID to `users/{uid}.purchasedBookIds` in Firestore and sends an authenticated request to `/api/track-purchase`. The server verifies the Firebase ID token, looks up the book in Sanity (using the catalog title and current offer price rather than trusting client-supplied values), then appends a purchase entry to `student_<uid>.purchasedBooks`. The entry is visible under the student's document in Sanity Studio.

The current application opens the configured book link and does not receive a payment-provider confirmation or webhook. Therefore, this entry represents a **checkout/test-purchase trigger**, and its generated `checkout_<UUID>` value is a tracking ID rather than a confirmed gateway payment ID. The amount is the catalog offer price at click time. To record only settled payments, connect the provider's verified payment webhook before treating these entries as completed purchases.

### My Library and cart

The `/my-library` route reads `users/{uid}.purchasedBooks` and `users/{uid}.purchasedBookIds` from Firestore, then resolves matching book documents from the public Sanity catalog for titles, covers, and sample reading links. Checkout tracking appends an ID and purchase summary to the profile arrays. The page provides a Read Now action when the book has a sample PDF; unavailable reading links are shown as disabled rather than redirecting to a payment link.

`CartProvider` wraps the app and persists its `cartItems` in `localStorage` under `xamtoppr-books-cart`. Its `addToCart`, `removeFromCart`, and `clearCart` actions maintain a derived `cartTotal`. Paid book cards and detail views expose Add to Cart/Go to Cart actions, and the header cart drawer shows selected books, removes items, and calculates the total. Since there is no cart-level payment integration, Proceed to Checkout opens the first item's existing payment link and leaves the remaining items in the cart.

The public Sanity client is read-only. Book requests and student records are written by the server endpoints using a Sanity token with dataset write permission. **Do not configure a write token in browser code or commit real credentials.** Although compatibility fallbacks accept `VITE_SANITY_WRITE_TOKEN` and `VITE_SANITY_API_WRITE_TOKEN` on the server, prefer the non-prefixed, server-only `SANITY_API_WRITE_TOKEN`.

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

### Sanity configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `SANITY_API_WRITE_TOKEN` | Yes for writes | **Server-only** token with write access for student sync and book requests |
| `SANITY_PROJECT_ID` | No | Server project ID; defaults to `rkev3aui` |
| `SANITY_DATASET` | No | Server dataset; defaults to `production` |
| `VITE_SANITY_PROJECT_ID` | No | Public Sanity project ID override; also accepted as a server-side compatibility fallback |
| `VITE_SANITY_DATASET` | No | Public Sanity dataset override; also accepted as a server-side compatibility fallback |
| `VITE_SANITY_WRITE_TOKEN` | Compatibility only | Accepted by server endpoints if the preferred token name is unavailable; **never reference it in frontend code** |
| `VITE_SANITY_API_WRITE_TOKEN` | Compatibility only | Legacy server-side token fallback; **never reference it in frontend code** |

For a typical local `.env`, provide all six Firebase variables and `SANITY_API_WRITE_TOKEN`. Project ID and dataset can be omitted to use the defaults. Do not paste real values into this README or commit the `.env` file.

### Local `.env` template

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

SANITY_API_WRITE_TOKEN=
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

The Vite middleware implements `/api/request-book` and `/api/sync-student` for local use. Configure the environment variables above, then visit the URL printed by Vite. Sanity Studio is served by the application at `/admin`.

Useful checks:

```sh
npm run lint
npm run build
npm run preview
```

## Vercel deployment

1. Import the Git repository into Vercel and set the project root to the repository root.
2. Use `npm install` for install and `npm run build` for the build command. Vite outputs to `dist`.
3. Add the six `VITE_FIREBASE_*` values and the server-only `SANITY_API_WRITE_TOKEN` in **Project Settings → Environment Variables** for Production (and Preview/Development as appropriate).
4. Optionally configure `SANITY_PROJECT_ID` and `SANITY_DATASET` if not using the defaults.
5. Redeploy after adding or changing environment variables. Vercel serves `api/*.js` as serverless functions; `vercel.json` rewrites frontend paths to the SPA while `/api/*` routes are handled by their functions.
6. Test Google login, refresh persistence, phone onboarding, student record creation in Sanity Studio, and book requests after deployment.

If `/api/sync-student` returns an error, inspect the response JSON and Vercel Function logs. A missing write token cannot be repaired by a browser fallback; configure the token as a server-side Vercel environment variable. Never solve this by exposing a Sanity write token through `VITE_` client code.
