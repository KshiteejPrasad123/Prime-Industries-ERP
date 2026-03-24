# Prime Industries ERP

## Setup

### 1. Add your Supabase credentials

Copy `.env.local.example` to `.env.local` and fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

You can find both values in your Supabase dashboard:
- Go to Project Settings → API
- Copy the Project URL and the `anon` `public` key

### 2. Deploy to Vercel

1. Push this folder to a GitHub repository
2. Go to vercel.com → New Project → Import from GitHub
3. Add the two environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)
4. Click Deploy

That's it. Your team can now access the app at the Vercel URL.

---

## Modules

- **Vendors** — Add and manage raw material suppliers with custom fields
- **Raw Materials** — Add materials, link multiple vendors with per-vendor pricing
- **SKUs** — Manage finished product catalogue
- **Bill of Materials** — Build BOMs with vendor-level pricing per line item

Coming soon: Orders, Customers
