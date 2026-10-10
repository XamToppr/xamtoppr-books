# XamToppr Books Store — Web Portal Documentation

Production-grade educational web portal for competitive examination preparation notes, solved papers, and handwritten visual materials (SSC, Railways, etc.).

* **Live URL:** [https://xamtoppr-books.vercel.app](https://xamtoppr-books.vercel.app)
* **Frontend:** React 19 + Vite + Tailwind CSS + Lucide React Icons
* **Deployment:** Vercel (CI/CD via GitHub `main` branch)
* **Backend / CMS:** Google Sheets (Published CSV endpoint parsed client-side with PapaParse)

---

## 1. Project Architecture & Directory Layout

```text
xamtoppr-books/
├── src/
│   ├── App.jsx          # Main application containing all components, state & modals
│   ├── App.css          # Core animations & styling overrides
│   ├── main.jsx         # Application root mount
│   └── index.css        # Tailwind base, components, and utilities
├── public/
│   ├── page-flip.mp3    # Audio asset for realistic 3D page flip effect
│   └── ...
├── package.json
└── README.md
```

---

## 2. Core Functional Logic & Features

### A. Dynamic Google Sheets Backend
Data is fetched live from a published Google Sheets CSV URL via PapaParse.

* **Delimiters in Table of Contents:**
  * Uses regex `b.tableOfContents.split(/[,|\n]/)` to parse chapters whether entered using commas (`,`), pipes (`|`), or new lines (`\n`).
  * Rendered as numbered chapter chips (1, 2, 3...) in the details modal.
* **Separation of Free vs. Paid Notes:**
  * `isFree`: When a note is free, `samplePdfUrl` is left empty. The UI suppresses "Sample PDF" buttons and shows a single **"Download Full Free PDF"** action.
  * `isPaid`: Shows a **"Read Sample PDF"** button (pointing to `samplePdfUrl`) and a direct **"Buy Now"** button (pointing to `pdfUrl` with the Razorpay link).

---

### B. Dedicated Markdown Parsers (Dual Themes)
To prevent styling conflicts between light-mode modals and dark-mode 3D flipbook pages, two independent markdown-to-bold renderers are maintained:

1. **`renderPdfModalDescription(text)`:**
   * Used in the standard PDF Information Modal (Light slate background).
   * Parses `**bold text**` into high-contrast dark text (`text-slate-950 font-extrabold`).

2. **`renderFlipbookDescription(text)`:**
   * Used on Page 1 of the 3D Flipbook (Dark gradient background).
   * Parses `**bold text**` into bright glowing amber (`text-amber-300 font-black drop-shadow-sm`) to ensure readability against dark blue/indigo backgrounds.

---

### C. 3D Interactive Flipbook (`react-pageflip`)
Handwritten notes feature an interactive 3D reading experience:

* **Audio Feedback:** Plays `page-flip.mp3` on page turns with proper user-gesture audio handling.
* **Page 1 (Interactive Overview Sheet):**
  * Serves as the first page of the flipbook.
  * Features subtle animated glow effects (`from-slate-950 via-indigo-950 to-purple-950`).
  * Displays book title, exam category, badge, and rating.
  * Scrollable inner container (`style={{ height: 'calc(100% - 135px)' }}` with `overflow-y-auto`) ensuring overflowing descriptions never breach container boundaries.
  * Fixed bottom indicators pinned neatly above the margin.
* **Sample Content Pages:**
  * Renders high-resolution handwritten image pages fetched via `pagesList`.
* **Final Action Page:**
  * Sample Preview Ended card with full note download/unlock CTA.
  * Social sharing buttons for **WhatsApp**, **Telegram**, and a 1-click **Copy Link** clipboard trigger with toast alerts.

---

## 3. Google Sheets Schema Guide

| Column Name | Type | Example / Format | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | String | `xt-bk-102` | Unique document ID |
| `title` | String | `Biology Complete Notes (SSC / Railway)` | Title of study notes |
| `author` | String | `Dhiraj Kumar` | Author attribution |
| `publisher` | String | `XamToppr` | Publishing brand |
| `exam` | String | `SSC, Railway` | Target examinations |
| `examCategory`| String | `SSC / Railway` | Filter category badge |
| `subject` | String | `Science` | Primary subject classification |
| `language` | String | `Hindi` / `English` | Content language |
| `pages` | Number | `217` | Total page count |
| `fileSize` | String | `42.8 MB` | Storage footprint |
| `rating` | Number | `4.9` | User satisfaction score |
| `badge` | String | `FREE PDF` / `₹49` | Pricing / category tag |
| `pdfUrl` | String | Direct Google Drive `/preview` link or Razorpay checkout | Full PDF or payment link |
| `samplePdfUrl`| String | Direct Google Drive preview link | Sample preview link (Blank for free books) |
| `samplePages` | String | Image URLs separated by comma/pipe | Sample page images for 3D flipbook |
| `tableOfContents` | String | Chapter 1, Chapter 2 \| Chapter 3 | Multi-delimiter chapter list |
| `description` | String | Markdown text (use `**text**` for bold) | Detailed book description |

---

## 4. Local Development

```bash
# Clone the repository
git clone https://github.com/xamtoppr/xamtoppr-books.git

# Install dependencies
npm install

# Run development server
npm run dev

# Verify production build before committing
npm run build
```