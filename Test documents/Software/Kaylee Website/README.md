# Kaylee Daniel — Athlete Personal Website

A personal brand hub for University of Kentucky Track & Field pole vaulter Kaylee Daniel. Built with **Next.js 14**, **Sanity.io**, and **Tailwind CSS**.

---

## Quick Start

### Prerequisites

- Node.js 18+
- A [Sanity.io](https://sanity.io) account (free)
- A [Vercel](https://vercel.com) account (free) for deployment
- Optional: A [Resend](https://resend.com) account (free tier) for the contact form

---

## 1. Get Your Sanity Project ID

1. Go to [sanity.io/manage](https://sanity.io/manage)
2. Click **"Create project"** → give it a name like "Kaylee Daniel Site"
3. Choose **"Production"** as your dataset name
4. Copy your **Project ID** (looks like `abc123de`)

---

## 2. Set Up Environment Variables

Copy the example file:
```bash
cp .env.local.example .env.local
```

Then fill in `.env.local`:
```env
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_SANITY_DATASET=production
RESEND_API_KEY=re_your_key_here
CONTACT_EMAIL=kaylee@youremail.com
CONTACT_FROM_EMAIL=noreply@yourdomain.com
```

---

## 3. Install Dependencies

```bash
npm install
```

---

## 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the site.

The site will display **placeholder/demo data** until you add real content in Sanity.

---

## 5. Access Your CMS Dashboard

The Sanity Studio is embedded directly in the site at:

```
http://localhost:3000/studio
```

You'll be prompted to **log in with your Sanity account**. Once logged in, you'll see the full dashboard.

### Studio sections:
| Section | What it controls |
|---|---|
| 🏠 Site Settings | Title, SEO description, social media links |
| 🎬 Hero Section | Big name display, tagline, background image, CTA button |
| 👩‍🏫 Bio / About | Profile photo, bio text, quick facts, pull quote |
| 🏆 Personal Records | Your PRs — vault height, venue, date |
| 📋 Meet Results | Add a new result after every competition |
| 📸 Gallery | Upload photos, add TikTok/YouTube links |
| 📰 Press & NIL | Media features, brand partnerships, awards |

---

## 6. Add Your First Content

Start with these in order:

1. **Site Settings** — Add your social media links
2. **Hero Section** — Upload a great action photo, customize your tagline
3. **Bio / About** — Add your profile photo and write your bio
4. **Personal Records** — Add your PRs (vault height, indoor/outdoor, venue)
5. **Gallery** — Upload some competition photos
6. **Meet Results** — Add your recent meet results

> **Tip:** Every field has a helpful description explaining exactly what to add. You'll never need to touch the code!

---

## 7. Deploy to Vercel

### One-click deploy

1. Push this project to GitHub
2. Go to [vercel.com](https://vercel.com) → Import your repository
3. Add your environment variables (same as `.env.local`) in the Vercel dashboard
4. Click **Deploy**

### Add your custom domain

In Vercel: **Settings → Domains → Add Domain**

### Enable Sanity CORS for production

After deploying, go to [sanity.io/manage](https://sanity.io/manage) → your project → **API → CORS Origins** → Add:
- `https://yourdomain.com`
- `https://yourdomain.com/studio`

---

## 8. Updating Content After Each Meet

1. Go to `yoursite.com/studio` on your phone or laptop
2. Log in with your Sanity account
3. Tap **📋 Meet Results → + Create**
4. Fill in: Meet name, date, mark, place
5. Hit **Publish** — the site updates automatically within ~60 seconds

---

## Setting Up the Contact Form (Optional)

The contact form sends NIL inquiry emails via [Resend](https://resend.com).

1. Sign up at [resend.com](https://resend.com) (free tier: 3,000 emails/month)
2. Create an API key
3. [Verify your sending domain](https://resend.com/domains) or use `onboarding@resend.dev` for testing
4. Add `RESEND_API_KEY` and `CONTACT_EMAIL` to your Vercel environment variables

If `RESEND_API_KEY` is not set, the form will still show a success message — you just won't receive emails. You can also use [Formspree](https://formspree.io) as an alternative by replacing the `/api/contact` route logic.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| **Next.js 14** (App Router) | Site framework, server rendering |
| **Sanity.io v3** | CMS — all your content lives here |
| **Tailwind CSS v3** | Styling |
| **Framer Motion** | Animations and scroll reveals |
| **next-sanity** | Sanity + Next.js integration |
| **yet-another-react-lightbox** | Photo gallery lightbox |
| **Resend** | Contact form email delivery |

---

## Project Structure

```
├── app/
│   ├── page.tsx              ← Main page (fetches all Sanity data)
│   ├── layout.tsx            ← SEO meta tags, fonts
│   ├── globals.css           ← Global styles, custom utilities
│   ├── studio/[[...tool]]/   ← Embedded Sanity Studio
│   └── api/contact/          ← Contact form API route
├── components/
│   ├── Nav.tsx               ← Sticky navigation
│   ├── Hero.tsx              ← Full-screen hero section
│   ├── Bio.tsx               ← About / bio section
│   ├── Stats.tsx             ← PRs + meet results table
│   ├── Gallery.tsx           ← Masonry photo/video gallery
│   ├── Press.tsx             ← Press & NIL cards
│   ├── Contact.tsx           ← NIL inquiry form
│   └── Footer.tsx            ← Footer with socials
├── schemas/
│   ├── siteSettings.ts       ← Global settings schema
│   ├── hero.ts               ← Hero section schema
│   ├── bio.ts                ← Bio/about schema
│   ├── stat.ts               ← PR schema
│   ├── meetResult.ts         ← Meet result schema
│   ├── galleryItem.ts        ← Gallery photo/video schema
│   └── pressEntry.ts         ← Press/NIL schema
├── lib/
│   ├── sanity.ts             ← Sanity client + helpers
│   ├── queries.ts            ← GROQ queries + fetch functions
│   ├── types.ts              ← TypeScript types
│   └── placeholderData.ts    ← Fallback demo data
└── sanity.config.ts          ← Sanity Studio config
```

---

## Customization

### Colors
Edit `tailwind.config.ts` to change the accent colors:
```ts
'electric': '#00D4FF',   // neon blue — change to any color you want
'yellow': '#FFE500',     // electric yellow
'uk-blue': '#0033A0',    // UK Blue
```

### Fonts
The site uses **Bebas Neue** (headlines) and **Space Grotesk** (body). To change them, edit the Google Fonts import in `app/layout.tsx` and `app/globals.css`.

### Adding New Sections
Each section is a self-contained component in `/components`. To add a new section:
1. Create a new component file
2. Add a schema in `/schemas` if it needs CMS content
3. Import and render it in `app/page.tsx`

---

## Go Live Checklist

- [ ] Added real hero background image in Sanity
- [ ] Wrote bio and added profile photo
- [ ] Added all current PRs
- [ ] Added recent meet results
- [ ] Uploaded gallery photos
- [ ] Added social media links in Site Settings
- [ ] Set up Resend and verified contact form works
- [ ] Added custom domain in Vercel
- [ ] Added Vercel domain to Sanity CORS allowlist
- [ ] Updated OG image in Site Settings (for social sharing)

---

*Built for Kaylee Daniel · University of Kentucky Track & Field*
