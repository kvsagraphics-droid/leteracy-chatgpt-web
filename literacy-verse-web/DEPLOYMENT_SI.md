# Literacy Verse — GitHub සහ Vercel හරහා Online කිරීමේ මාර්ගෝපදේශය

මෙම ZIP එකේ source code එක සම්පූර්ණ project folder එකක් ලෙස ඇතුළත් කර ඇත. Website එක Vercel වෙත deploy කළ හැකි Next.js project එකකි. **පළමු deploy එකට පසුව සැබෑ ගිණුම්/පොත් upload/AI ක්‍රියාත්මක වීමට Supabase සහ AI API key සකස් කළ යුතුය.**

## 1. ZIP එක extract කරන්න

1. `Literacy-Verse-Web.zip` file එක download කර Windows වල **Extract All** කරන්න.
2. Extract කළ `literacy-verse-web` folder එකට යන්න.
3. Computer එකේ Node.js 20+ සහ Git ස්ථාපනය කර තිබිය යුතුය.
4. Command Prompt/Terminal එක එම folder එකේ open කර පහත commands ක්‍රියාත්මක කරන්න.

```bash
npm install
npm run dev
```

`http://localhost:3000` වෙත යාමෙන් local preview එක බලන්න. Package download කිරීම සඳහා internet connection අවශ්‍යයි.

## 2. GitHub වෙත upload කිරීම

1. <https://github.com> වෙත ගොස් **New repository** තෝරන්න.
2. Repository එකට `literacy-verse-web` වැනි නමක් දී Create කරන්න.
3. Project folder එකේ terminal එක open කර පහත commands භාවිත කරන්න. `YOUR-USERNAME` සහ `YOUR-REPOSITORY` ඔබේ GitHub දත්ත වලින් ප්‍රතිස්ථාපනය කරන්න.

```bash
git init
git add .
git commit -m "Build Literacy Verse web app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

**වැදගත්:** `.env.local`, API keys, passwords හෝ Supabase `service_role` key එක GitHub වෙත upload කරන්න එපා. `.gitignore` එක `.env` files ignore කරන ලෙස සකසා ඇත.

## 3. Supabase database සහ login සකස් කිරීම

1. <https://supabase.com> වෙතින් project එකක් සාදන්න.
2. Supabase Dashboard → **SQL Editor → New query** වෙත යන්න.
3. මෙම folder එකේ `supabase/schema.sql` file එකේ සියලු SQL code copy කර SQL Editor එකට paste කර **Run** කරන්න.
4. Supabase Project Settings / Connect page වෙතින් Project URL සහ publishable/anon key ලබාගන්න.
5. Project root එකේ `.env.example` file එක copy කර `.env.local` නමින් save කරන්න. එහි අගයන් ඔබගේ Supabase values වලින් ප්‍රතිස්ථාපනය කරන්න:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
OPENAI_API_KEY=YOUR_SECRET_API_KEY
OPENAI_MODEL=gpt-4o-mini
```

`OPENAI_API_KEY` එක AI සක්‍රිය කිරීමට පමණි; AI key එකක් නොමැතිව අනෙකුත් demo screens preview කළ හැක. AI provider usage එකට ගාස්තු අය විය හැක.

6. ඔබගේ Literacy Verse account එක app එකේ Create Account හරහා සාදන්න.
7. ඔබගේ email එක admin කරන්න Supabase SQL Editor එකේ පහත SQL run කරන්න. Email එක ඔබේ admin account එකේ email එකෙන් වෙනස් කරන්න:

```sql
update public.profiles
set role = 'admin'
where lower(email) = lower('your-admin-email@example.com');
```

ඉන්පසු app එකෙන් sign out කර නැවත sign in වන්න. Admin studio එකෙන් submitted books approve/reject කිරීමටත් Podcast YouTube links publish කිරීමටත් හැක.

## 4. Vercel වෙත deploy කිරීම

1. <https://vercel.com> වෙත ගොස් ඔබේ GitHub account එක connect කරන්න.
2. **Add New → Project** තෝරා `literacy-verse-web` repository එක Import කරන්න.
3. Framework එක **Next.js** ලෙස පවතින්න. Build command එක සාමාන්‍යයෙන් `npm run build` වේ.
4. Vercel → Project → **Settings → Environment Variables** වෙත ගොස් `.env.local` හි ඇති values add කරන්න:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optional)
5. Deploy කරන්න. Environment variables වෙනස් කළොත් නැවත redeploy කරන්න.
6. Vercel ලබාදුන් website URL එක Supabase → Authentication → URL Configuration තුළ Site URL / allowed URLs වලට එක් කරන්න.
7. Live site එකේ signup/login, PDF upload, admin approval, podcast embed, AI Tutor test කරන්න.

## දැනට prototype පමණක් වන කොටස්

- Fundraising page එකේ pledge record කිරීම prototype එකකි. **සැබෑ card payment/මුදල් එකතු කිරීම මෙහි සකසා නැත.** Payment gateway එකක් integrate, test සහ compliance review කළ යුතුය.
- English/Sinhala/Tamil interface translations දැනට සකසා ඇත. වෙනත් භාෂා තෝරාගත හැකි නමුත් ඒවායේ සම්පූර්ණ interface translation තව සම්පූර්ණ කළ යුතුය.
- Demo mode එකේ login එක local browser session එකක් පමණි; secure account එකක් හෝ database sync එකක් නොවේ.
- Public launch කිරීමට පෙර privacy policy, terms, child safety, reporting/moderation, copyright checks, backups සහ abuse prevention සකස් කරන්න.
