# Literacy Verse — deployable web app starter

A responsive Literacy Verse web app built from the uploaded **Literacy Verse App Plan**. The project is structured for GitHub + Vercel deployment and can run in preview/demo mode before backend keys are added.

## What is included

- **AI Tutor:** chat interface and a server-side API route. Add an OpenAI API key to turn on live responses; without it, the route returns a clearly marked demo response.
- **E-Library:** public read access to approved books/resources, search, resource submission, teacher-only story/poem/note creation, and PDF download with signed URLs.
- **Admin studio:** review pending resources and publish or reject them; publish podcast video links. Admin privileges are stored and enforced through Supabase Row Level Security, not just hidden UI buttons.
- **Podcasts:** embeds published YouTube URLs with a privacy-enhanced YouTube embed domain.
- **Fundraising prototype:** active campaigns, signed-in pledge records, and access gating. **This does not take real payments.** A real payment provider, settlement flow, campaign verification, and legal/compliance review are needed before real fundraising.
- **Accounts and roles:** Supabase email/password authentication; public visitors can explore the site, while account-dependent actions require sign-in. Signup roles are Student, Teacher, or Volunteer; admin role must be granted manually by the project owner.
- **Language selection:** first-visit language selector, saved language preference, and browser-language suggestion (does not collect device IP). Interface translations are supplied for English, Sinhala, and Tamil; other language choices are currently partial UI fallbacks. The AI Tutor uses the selected language when live AI is configured.
- **Responsive UI:** desktop/tablet/mobile layouts.

## 1. Run locally

You need Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

Without configuration, the app runs in preview mode with example learning content and local demo sign-in. Demo sessions are **not real, secure accounts** and do not sync to other devices.

## 2. Set up Supabase (shared accounts and data)

1. Create a project at <https://supabase.com>.
2. In Supabase, open **SQL Editor → New query**.
3. Copy the entire contents of `supabase/schema.sql` into the editor and run it.
4. Open **Project Settings → API** (or the project's Connect page) and copy the project URL and publishable/anon key.
5. Copy `.env.example` to `.env.local` and set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

6. In Supabase **Authentication → URL Configuration**, set the local Site URL to `http://localhost:3000`. When deployed, add your Vercel URL to the allowed redirect/site URLs.
7. Create a test account from the app. Supabase email confirmation may need to be completed, depending on your Auth settings.
8. To grant your own account admin rights, run this in the SQL Editor after signing up (replace the email):

```sql
update public.profiles
set role = 'admin'
where lower(email) = lower('your-admin-email@example.com');
```

Then sign out and sign in again so the app reloads your profile. Never expose the Supabase `service_role` key in browser code or commit it to GitHub.

### Storage and content notes

The SQL creates a private `book-files` bucket with PDF size/type restrictions and storage policies. Uploaded PDFs are stored in a contributor-specific folder. A book submission remains pending until an administrator approves it; only published book rows are shown publicly. The SQL does not seed campaigns with fictional money totals. Create and verify real campaigns in the Supabase dashboard before enabling the page publicly.

## 3. Enable live AI tutoring

Create an API key with your chosen model provider and add these environment variables to `.env.local`:

```env
OPENAI_API_KEY=YOUR_SECRET_API_KEY
OPENAI_MODEL=gpt-4o-mini
```

`OPENAI_API_KEY` is used only by `app/api/ai/route.ts` on the server; do **not** rename it to `NEXT_PUBLIC_OPENAI_API_KEY`. Usage may incur API charges, so configure provider billing/limits before launch. The tutor is an educational aid, can make mistakes, and does not have guaranteed live web access.

## 4. Push to GitHub

Create an empty repository on GitHub, then from this project folder run:

```bash
git init
git add .
git commit -m "Build Literacy Verse web app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Make sure `.env.local` is not committed. `.gitignore` excludes `.env` files and build output.

## 5. Deploy on Vercel

1. Visit <https://vercel.com> and import the GitHub repository.
2. Keep the detected framework as **Next.js**; the default build command is `npm run build`.
3. In Vercel **Project → Settings → Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, and optionally `OPENAI_MODEL`.
4. Redeploy after adding environment variables.
5. Add the deployed domain to Supabase Auth URL configuration.
6. Test signup/login, a PDF upload, admin approval, a podcast embed, the AI tutor, and the fundraising prototype on the deployed URL.

Official references:
- Next.js environment variables: <https://nextjs.org/docs/app/guides/environment-variables>
- Next.js route handlers: <https://nextjs.org/docs/app/getting-started/route-handlers>
- Supabase Next.js quickstart: <https://supabase.com/docs/guides/getting-started/quickstarts/nextjs>

## Important launch checklist

- Replace preview copy/examples with verified project information and authorised content.
- Obtain permission/rights for every uploaded or embedded book/video; reject unauthorised copyrighted works.
- Add rate limits, abuse prevention, monitoring, privacy notice, terms, moderation, backups, and age-appropriate safety controls before serving children at scale.
- Make sure the AI provider's privacy, data-retention, and child-safety terms suit your intended audience.
- Real donations/payments are **not implemented**. Do not advertise a pledge as money received. Integrate and audit a payment provider before accepting funds.
- The current interface language dictionaries cover English, Sinhala, and Tamil. More options are shown, but their full interface translations require completion or a vetted translation integration.

## Project layout

```text
app/
  api/ai/route.ts     # Server-side AI tutor endpoint
  globals.css         # Responsive design system
  layout.tsx          # App shell and metadata
  page.tsx             # Main interactive app
lib/
  content.ts          # Demo resources, language strings, helpers
  supabase.ts         # Browser Supabase client configuration
supabase/
  schema.sql          # Tables, roles, RLS policies, private PDF storage
.env.example
README.md
```
