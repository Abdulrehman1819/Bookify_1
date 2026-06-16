# Bookify — Technical PRD (Supabase Edition)

> **Document type:** Technical Product Requirements Document  
> **Version:** 2.0  
> **Platform:** Web (Next.js + Supabase)  
> **Last updated:** June 2026

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Roles](#2-user-roles)
3. [Registration & Role Assignment](#3-registration--role-assignment)
4. [Tech Stack](#4-tech-stack)
5. [Supabase Project Setup](#5-supabase-project-setup)
6. [Database Schema (SQL)](#6-database-schema-sql)
7. [Supabase Auth Trigger](#7-supabase-auth-trigger)
8. [Row Level Security Policies](#8-row-level-security-policies)
9. [Supabase Storage](#9-supabase-storage)
10. [Supabase Client Helpers](#10-supabase-client-helpers)
11. [Backend — API Routes](#11-backend--api-routes)
12. [Key Business Logic](#12-key-business-logic)
13. [Frontend Pages & Flows](#13-frontend-pages--flows)
14. [Folder Structure](#14-folder-structure)
15. [Route Guards](#15-route-guards)
16. [Seed Data](#16-seed-data)
17. [Design Guidelines](#17-design-guidelines)
18. [Implementation Order](#18-implementation-order)

---

## 1. Product Overview

**Bookify** is a multi-tenant booking platform where businesses (saloons, clinics, gyms, etc.) can register, add staff/workers, set availability, and accept slot bookings from customers online.

Customers can search businesses by city, area, business type, or name, browse staff availability, and book appointments with multiple services in one go. A single user account handles everything — users start as customers and can upgrade to a shop owner by listing their business.

---

## 2. User Roles

| Role | How assigned | Access |
|---|---|---|
| `CUSTOMER` | Default for all new signups | Search, book, review, manage own bookings |
| `SHOP_OWNER` | Automatically when user lists a business | Full business dashboard, staff, services, schedule, all bookings |
| `WORKER` | Created by owner from dashboard | Personal calendar view, mark booking status |
| `SUPER_ADMIN` | Manual Supabase dashboard assignment | Platform-wide admin panel |

> **Key rule:** Every user starts as `CUSTOMER`. There is no role selector anywhere in the signup form. Role upgrades happen through actions, not form fields.

---

## 3. Registration & Role Assignment

### Single signup flow — `/register`

There is only **one signup page** for all users. No role selector, no "I am a business owner" checkbox.

**Form fields:** first name, last name, email, phone, password

**What happens on submit:**
```
supabase.auth.signUp() called with metadata:
  { firstName, lastName, phone, role: 'CUSTOMER' }

DB trigger fires → profiles row created with role = CUSTOMER

Redirect → / (homepage)
```

All users land as customers. This keeps signup friction minimal.

---

### Upgrading to shop owner — "List your business"

A customer who wants to register their business clicks **"List your business"** — available in the navbar (when logged in) and on the landing page.

**If not logged in:** clicking "List your business" → redirects to `/register` first, then continues to `/list-business` after signup.

**If logged in as CUSTOMER:** redirects directly to `/list-business`.

**`/list-business` page:**

- User fills in basic business details (name, type, city, area, description, logo)
- On submit, the API does two things atomically:
  1. Inserts a row into the `businesses` table linked to this user
  2. Updates `profiles.role` from `CUSTOMER` → `SHOP_OWNER`

```ts
// app/api/list-business/route.ts
const supabase = createClient()         // server client
const admin = supabaseAdmin             // service role client

// 1. Insert business
await supabase.from('businesses').insert({
  owner_id: user.id,
  name: body.name,
  slug: body.slug,
  business_type: body.businessType,
  city: body.city,
  area: body.area,
  description: body.description,
})

// 2. Upgrade role in profiles table
await supabase.from('profiles').update({ role: 'SHOP_OWNER' }).eq('id', user.id)

// 3. Sync role into Supabase Auth metadata
await admin.auth.admin.updateUserById(user.id, {
  user_metadata: { role: 'SHOP_OWNER' }
})
```

- After role upgrade → redirect to `/owner/onboarding`
- On next login, `profiles.role` is `SHOP_OWNER` → redirected to `/owner/dashboard`

---

### Role persistence across sessions

After role upgrade, every login reads `profiles.role` from the database and redirects:

```
CUSTOMER   →  / (homepage, or back to booking page if mid-flow)
SHOP_OWNER →  /owner/dashboard
WORKER     →  /worker/calendar
```

A shop owner can still book appointments — they just use the public-facing pages. Their role only changes what dashboard they see after login.

---

### Worker creation — no self-registration

Workers never sign up themselves. The shop owner creates them from `/owner/staff`:

- Owner fills in: name, title, bio, branch assignment
- Toggle: "Give login access" (optional)
- If toggled on: `supabaseAdmin.auth.admin.createUser()` called with `role: WORKER`
- Worker receives login credentials from the owner (via WhatsApp/email outside the app)
- Worker logs in at `/login` → redirected to `/worker/calendar`

Workers cannot self-register, cannot list a business, and cannot upgrade their own role.

---

### Doctor / clinic note

Doctors register like any normal customer at `/register`, then click "List your business" and select `business_type = CLINIC`. They add themselves as the only staff member. Role becomes `SHOP_OWNER`. No special flow needed.

---

### Login — `/login`

Single login page for all roles.

```ts
const { data, error } = await supabase.auth.signInWithPassword({ email, password })

// After login, fetch profile to get role
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', data.user.id)
  .single()

// Redirect based on role:
//   CUSTOMER   → /
//   SHOP_OWNER → /owner/dashboard
//   WORKER     → /worker/calendar
```

---

### Landing page CTAs

```
Hero section:
  Primary CTA:   [Book a service]       → /register (if not logged in) or /search
  Secondary CTA: [List your business]   → /list-business (if logged in) or /register → /list-business

Navbar (logged in):
  [List your business]  →  /list-business

Navbar (not logged in):
  [Log in]    → /login
  [Sign up]   → /register
```

---

## 4. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Forms | React Hook Form + Zod |
| Data fetching | TanStack Query |
| Calendar | FullCalendar.io |
| Date utils | date-fns |
| Backend | Next.js API Routes (`app/api/`) |
| Database | Supabase PostgreSQL — queried directly via `@supabase/supabase-js` |
| Auth | Supabase Auth (JWT, email/password, `@supabase/ssr`) |
| Storage | Supabase Storage (CDN-backed public buckets) |
| Validation | Zod (API layer) |

> **No Prisma. No ORM.** All database operations use the Supabase JS client directly (`supabase.from('table').select/insert/update/delete`). Schema is created by running SQL directly in the Supabase SQL editor.

---

## 5. Supabase Project Setup

### Environment variables — `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> Only these three variables are needed. No database connection strings. No direct URLs. The Supabase JS client handles all connections internally using the project URL and keys.

---

## 6. Database Schema (SQL)

Run all of the following SQL in the **Supabase SQL editor** (Dashboard → SQL Editor → New query). No migration tool needed.

---

### Enums

```sql
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'SHOP_OWNER', 'WORKER', 'CUSTOMER');
CREATE TYPE business_type AS ENUM ('SALOON', 'CLINIC', 'GYM', 'SPA', 'OTHER');
CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');
```

---

### profiles

```sql
CREATE TABLE profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT UNIQUE NOT NULL,
  role                 user_role NOT NULL DEFAULT 'CUSTOMER',
  first_name           TEXT NOT NULL,
  last_name            TEXT NOT NULL,
  phone                TEXT,
  avatar_url           TEXT,
  onboarding_complete  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### businesses

```sql
CREATE TABLE businesses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  description    TEXT,
  business_type  business_type NOT NULL,
  city           TEXT NOT NULL,
  area           TEXT,
  address        TEXT,
  country        TEXT NOT NULL DEFAULT 'PK',
  logo_url       TEXT,
  cover_image_url TEXT,
  is_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### business_branches

```sql
CREATE TABLE business_branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  city        TEXT NOT NULL,
  area        TEXT,
  address     TEXT,
  phone       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### staff

```sql
CREATE TABLE staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id   UUID NOT NULL REFERENCES business_branches(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  title       TEXT,
  bio         TEXT,
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### services

```sql
CREATE TABLE services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  duration_minutes INT NOT NULL,
  price            NUMERIC(10,2) NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'PKR',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### staff_services

```sql
CREATE TABLE staff_services (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id   UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE(staff_id, service_id)
);
```

---

### working_hours

```sql
CREATE TABLE working_hours (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time  TEXT NOT NULL, -- HH:mm
  end_time    TEXT NOT NULL, -- HH:mm
  is_off      BOOLEAN NOT NULL DEFAULT FALSE
);
```

---

### staff_breaks

```sql
CREATE TABLE staff_breaks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL,
  label       TEXT
);
```

---

### staff_leaves

```sql
CREATE TABLE staff_leaves (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id   UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### bookings

```sql
CREATE TABLE bookings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  staff_id     UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  branch_id    UUID NOT NULL REFERENCES business_branches(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time   TEXT NOT NULL, -- HH:mm
  end_time     TEXT NOT NULL, -- HH:mm (auto-calculated from total service durations)
  status       booking_status NOT NULL DEFAULT 'PENDING',
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### booking_services

```sql
CREATE TABLE booking_services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id       UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  duration_minutes INT NOT NULL,
  price            NUMERIC(10,2) NOT NULL
);
```

---

### reviews

```sql
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### updated_at trigger (apply to all tables that need it)

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON business_branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 7. Supabase Auth Trigger

Run in Supabase SQL editor. Auto-creates a `profiles` row every time a new user signs up via Supabase Auth.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
    COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'CUSTOMER')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

> All signups default to `role = CUSTOMER`. If metadata explicitly passes `role: 'WORKER'` (owner-created workers via admin API), that role is respected.

---

## 8. Row Level Security Policies

Enable RLS on all tables and define policies. Run in Supabase SQL editor.

```sql
-- ── profiles ──────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- ── businesses ────────────────────────────────────────────────
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active businesses"
  ON businesses FOR SELECT USING (is_active = true);

CREATE POLICY "Owner can insert business"
  ON businesses FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can update own business"
  ON businesses FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owner can delete own business"
  ON businesses FOR DELETE USING (auth.uid() = owner_id);

-- ── business_branches ─────────────────────────────────────────
ALTER TABLE business_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active branches"
  ON business_branches FOR SELECT USING (is_active = true);

CREATE POLICY "Owner can manage branches"
  ON business_branches FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = business_branches.business_id
      AND b.owner_id = auth.uid()
    )
  );

-- ── staff ─────────────────────────────────────────────────────
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active staff"
  ON staff FOR SELECT USING (is_active = true);

CREATE POLICY "Owner can manage staff"
  ON staff FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = staff.business_id
      AND b.owner_id = auth.uid()
    )
  );

-- ── services ──────────────────────────────────────────────────
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active services"
  ON services FOR SELECT USING (is_active = true);

CREATE POLICY "Owner can manage services"
  ON services FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = services.business_id
      AND b.owner_id = auth.uid()
    )
  );

-- ── staff_services ────────────────────────────────────────────
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view staff services"
  ON staff_services FOR SELECT USING (true);

CREATE POLICY "Owner can manage staff services"
  ON staff_services FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff s
      JOIN businesses b ON b.id = s.business_id
      WHERE s.id = staff_services.staff_id
      AND b.owner_id = auth.uid()
    )
  );

-- ── working_hours ─────────────────────────────────────────────
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view working hours"
  ON working_hours FOR SELECT USING (true);

CREATE POLICY "Owner can manage working hours"
  ON working_hours FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff s
      JOIN businesses b ON b.id = s.business_id
      WHERE s.id = working_hours.staff_id
      AND b.owner_id = auth.uid()
    )
  );

-- ── staff_breaks ──────────────────────────────────────────────
ALTER TABLE staff_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view staff breaks"
  ON staff_breaks FOR SELECT USING (true);

CREATE POLICY "Owner can manage staff breaks"
  ON staff_breaks FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff s
      JOIN businesses b ON b.id = s.business_id
      WHERE s.id = staff_breaks.staff_id
      AND b.owner_id = auth.uid()
    )
  );

-- ── staff_leaves ──────────────────────────────────────────────
ALTER TABLE staff_leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view staff leaves"
  ON staff_leaves FOR SELECT USING (true);

CREATE POLICY "Owner can manage staff leaves"
  ON staff_leaves FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff s
      JOIN businesses b ON b.id = s.business_id
      WHERE s.id = staff_leaves.staff_id
      AND b.owner_id = auth.uid()
    )
  );

-- ── bookings ──────────────────────────────────────────────────
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer sees own bookings"
  ON bookings FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Owner sees bookings for their branches"
  ON bookings FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM business_branches bb
      JOIN businesses b ON b.id = bb.business_id
      WHERE bb.id = bookings.branch_id
      AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Worker sees own bookings"
  ON bookings FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = bookings.staff_id
      AND s.id IN (
        SELECT id FROM staff WHERE business_id IN (
          SELECT business_id FROM staff WHERE id = bookings.staff_id
        )
      )
    )
  );

CREATE POLICY "Authenticated customer can create booking"
  ON bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Owner can update booking status"
  ON bookings FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM business_branches bb
      JOIN businesses b ON b.id = bb.business_id
      WHERE bb.id = bookings.branch_id
      AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Customer can cancel own booking"
  ON bookings FOR UPDATE USING (auth.uid() = customer_id);

-- ── booking_services ──────────────────────────────────────────
ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view booking services for own bookings"
  ON booking_services FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings bk
      WHERE bk.id = booking_services.booking_id
      AND (
        bk.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM business_branches bb
          JOIN businesses b ON b.id = bb.business_id
          WHERE bb.id = bk.branch_id AND b.owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Customer can insert booking services"
  ON booking_services FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings bk
      WHERE bk.id = booking_services.booking_id
      AND bk.customer_id = auth.uid()
    )
  );

-- ── reviews ───────────────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "Customer can insert review for own completed booking"
  ON reviews FOR INSERT WITH CHECK (
    auth.uid() = customer_id AND
    EXISTS (
      SELECT 1 FROM bookings bk
      WHERE bk.id = reviews.booking_id
      AND bk.customer_id = auth.uid()
      AND bk.status = 'COMPLETED'
    )
  );
```

---

## 9. Supabase Storage

Create these buckets in the Supabase dashboard (Storage → New bucket):

| Bucket name | Public | Used for |
|---|---|---|
| `business-assets` | Yes | Business logos, cover images |
| `staff-avatars` | Yes | Staff profile photos |

Both buckets are public — uploaded files return a permanent CDN URL stored back in the database.

### Upload helper — `lib/storage.ts`

```ts
import { createClient } from '@/lib/supabase/client'

export async function uploadImage(
  bucket: string,
  path: string,
  file: File
): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)
  return urlData.publicUrl
}

// Usage examples:
// const logoUrl = await uploadImage('business-assets', `logos/${businessId}.jpg`, file)
// const avatarUrl = await uploadImage('staff-avatars', `avatars/${staffId}.jpg`, file)
```

---

## 10. Supabase Client Helpers

### Browser client — `lib/supabase/client.ts`

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Server client — `lib/supabase/server.ts`

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}
```

### Admin client — `lib/supabase/admin.ts`

```ts
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

> Use `supabaseAdmin` only in server-side API routes. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

### Middleware — `middleware.ts`

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )
  await supabase.auth.getUser()
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### Auth role helper — `lib/auth.ts`

```ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function getAuthUser() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function requireRole(allowedRoles: string[]) {
  const user = await getAuthUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !allowedRoles.includes(profile.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user, profile }
}
```

---

## 11. Backend — API Routes

All routes live under `app/api/`. All database queries use `supabase.from('table_name')` directly — no ORM, no query builder abstraction beyond the Supabase JS client.

### Query patterns used throughout

```ts
// SELECT
const { data, error } = await supabase
  .from('businesses')
  .select('*, business_branches(*), staff(*)')
  .eq('slug', slug)
  .single()

// INSERT
const { data, error } = await supabase
  .from('businesses')
  .insert({ owner_id: user.id, name, slug, ... })
  .select()
  .single()

// UPDATE
const { error } = await supabase
  .from('profiles')
  .update({ role: 'SHOP_OWNER' })
  .eq('id', user.id)

// DELETE (soft — set is_active = false)
const { error } = await supabase
  .from('businesses')
  .update({ is_active: false })
  .eq('id', id)
  .eq('owner_id', user.id)

// Filter + search
const { data, error } = await supabase
  .from('businesses')
  .select('*')
  .eq('is_active', true)
  .ilike('name', `%${searchTerm}%`)
  .eq('city', city)
  .eq('business_type', type)
  .range(offset, offset + limit - 1)
```

---

### Route list

#### Auth — `app/api/auth/`

| Method | Route | Description |
|---|---|---|
| POST | `/register` | `supabase.auth.signUp()` with `role: 'CUSTOMER'` in metadata. Trigger creates `profiles` row. |
| POST | `/login` | `supabase.auth.signInWithPassword()`. Fetches `profiles.role`, returns it in response for redirect logic. |
| POST | `/logout` | `supabase.auth.signOut()` |
| GET | `/me` | Returns current user + profile row |

#### List Business — `app/api/list-business/`

| Method | Route | Description |
|---|---|---|
| POST | `/` | Requires auth (any role). Inserts into `businesses`. Updates `profiles.role` to `SHOP_OWNER`. Syncs Supabase Auth metadata via `supabaseAdmin`. Redirects to `/owner/onboarding`. |

#### Owner Onboarding — `app/api/onboarding/`

| Method | Route | Description |
|---|---|---|
| POST | `/complete` | Sets `profiles.onboarding_complete = true`. Prevents re-showing onboarding wizard on next login. |

#### Businesses — `app/api/businesses/`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/?city=&area=&type=&name=&page=&limit=` | Public | Search businesses. Uses `.ilike()`, `.eq()`, `.range()` on Supabase client. |
| GET | `/:slug` | Public | Fetch business + branches + active staff + avg rating. |
| PATCH | `/:id` | SHOP_OWNER | Update business fields. Verify `owner_id = auth.uid()`. |
| DELETE | `/:id` | SHOP_OWNER | Soft delete: `update({ is_active: false })`. |

#### Branches — `app/api/businesses/:businessId/branches/`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/` | SHOP_OWNER | Insert into `business_branches`. |
| GET | `/` | Public | `select('*').eq('business_id', id).eq('is_active', true)` |
| PATCH | `/:branchId` | SHOP_OWNER | Update branch. |
| DELETE | `/:branchId` | SHOP_OWNER | Soft delete. |

#### Staff — `app/api/businesses/:businessId/staff/`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/` | SHOP_OWNER | Insert into `staff`. If owner toggles "Give login access", also calls `supabaseAdmin.auth.admin.createUser()` with `role: 'WORKER'`. |
| GET | `/` | Public | `select('*, staff_services(*, services(*))').eq('business_id', id)` |
| GET | `/:staffId` | Public | Staff + services + working_hours. |
| PATCH | `/:staffId` | SHOP_OWNER | Update staff. |
| DELETE | `/:staffId` | SHOP_OWNER | Soft delete. |

#### Services — `app/api/businesses/:businessId/services/`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/` | SHOP_OWNER | Insert into `services`. |
| GET | `/` | Public | `select('*').eq('business_id', id).eq('is_active', true)` |
| PATCH | `/:serviceId` | SHOP_OWNER | Update service. |
| DELETE | `/:serviceId` | SHOP_OWNER | Soft delete. |

#### Staff–Service Assignment — `app/api/businesses/:businessId/staff/:staffId/services/`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/` | SHOP_OWNER | `insert([{ staff_id, service_id }, ...])` — pass array of serviceIds. |
| DELETE | `/:serviceId` | SHOP_OWNER | `delete().eq('staff_id', staffId).eq('service_id', serviceId)` |

#### Availability — `app/api/staff/:staffId/availability/`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/working-hours` | SHOP_OWNER | Upsert into `working_hours`. |
| GET | `/working-hours` | Public | `select('*').eq('staff_id', staffId)` |
| POST | `/breaks` | SHOP_OWNER | Insert into `staff_breaks`. |
| DELETE | `/breaks/:breakId` | SHOP_OWNER | `delete().eq('id', breakId)` |
| POST | `/leaves` | SHOP_OWNER | Insert into `staff_leaves`. |
| DELETE | `/leaves/:leaveId` | SHOP_OWNER | `delete().eq('id', leaveId)` |
| GET | `/slots?date=YYYY-MM-DD&serviceIds[]=uuid` | Public | Fetches working hours, existing bookings, breaks, leaves for the date. Runs `slotCalculator`. Returns array of available HH:mm strings. |

#### Bookings — `app/api/bookings/`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/` | CUSTOMER | Runs conflict check SQL first. Inserts into `bookings` + `booking_services`. |
| GET | `/my` | CUSTOMER | `select('*, staff(*), business_branches(*), booking_services(*, services(*)))').eq('customer_id', user.id)` |
| GET | `/staff/:staffId` | SHOP_OWNER, WORKER | All bookings for a staff member. Optional `?date=` filter. |
| GET | `/branch/:branchId` | SHOP_OWNER | All bookings for a branch with optional filters. |
| PATCH | `/:bookingId/status` | SHOP_OWNER, WORKER | `update({ status }).eq('id', bookingId)` |
| DELETE | `/:bookingId` | CUSTOMER | Cancel own booking if >2h before start time. `update({ status: 'CANCELLED' })` |

#### Reviews — `app/api/reviews/`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/` | CUSTOMER | Insert into `reviews`. One per completed booking — enforced by UNIQUE constraint + RLS. |
| GET | `/business/:businessId` | Public | `select('*').eq('business_id', id)` + calculate avg rating. |

#### Dashboard — `app/api/dashboard/`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/overview` | SHOP_OWNER | Count bookings by date range per branch using Supabase `.count()` and `.gte/.lte` filters. |
| GET | `/bookings` | SHOP_OWNER | Full booking list with filters: `?branchId=&staffId=&date=&status=` |
| GET | `/staff-utilization` | SHOP_OWNER | Per-staff booking count grouped by `staff_id` in a date range. |

---

## 12. Key Business Logic

### Slot calculation engine — `lib/slotCalculator.ts`

```ts
export function calculateAvailableSlots({
  workingHours,       // { start_time: '10:00', end_time: '20:00', is_off: false }
  isLeaveDay,         // boolean — true if staff has a leave on this date
  existingBookings,   // [{ start_time: '10:00', end_time: '10:50' }]
  breaks,             // [{ start_time: '13:00', end_time: '14:00' }]
  totalDuration,      // number — sum of all selected service duration_minutes
  slotInterval = 15,  // number — generate a candidate slot every N minutes
}): string[] {
  if (isLeaveDay || workingHours.is_off) return []

  // 1. Parse workingHours.start_time and end_time into minutes-since-midnight
  // 2. Generate candidate start times: start, start+interval, start+2*interval, ...
  //    up to the last possible start where start + totalDuration <= end_time
  // 3. For each candidate time T:
  //    a. Check [T, T+totalDuration] does NOT overlap any existing booking
  //    b. Check [T, T+totalDuration] does NOT overlap any break slot
  //    c. If both pass → include T in results
  // 4. Return results as HH:mm strings e.g. ['10:00', '10:15', '10:30', ...]
}

// Helper: convert HH:mm to total minutes
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Helper: convert total minutes to HH:mm
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

// Helper: check if two time ranges overlap
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart
}
```

### Multi-service end time

```ts
const totalMinutes = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0)
// endTime = startTime + totalMinutes (using date-fns addMinutes)
```

### Booking conflict check

Run this query before every booking insert. If any row is returned, reject with `409 Conflict`.

```ts
const { data: conflict } = await supabase
  .from('bookings')
  .select('id')
  .eq('staff_id', staffId)
  .eq('booking_date', date)
  .in('status', ['PENDING', 'CONFIRMED'])
  .lt('start_time', endTime)    // existing booking starts before new one ends
  .gt('end_time', startTime)    // existing booking ends after new one starts
  .limit(1)

if (conflict && conflict.length > 0) {
  return NextResponse.json({ error: 'Slot no longer available' }, { status: 409 })
}
```

---

## 13. Frontend Pages & Flows

### Public pages

| Route | Description |
|---|---|
| `/` | Landing page. Hero with "Book a service" + "List your business" CTAs. Featured business type categories. How it works section (3 steps). |
| `/search` | Business cards grid. Filter sidebar: type, city, area, min rating. Pagination. |
| `/b/:slug` | Business public profile: cover image, branch selector tabs, staff grid with avatar + title + services, reviews section. |
| `/b/:slug/staff/:staffId` | 4-step booking wizard. |

### Booking wizard — `/b/:slug/staff/:staffId`

| Step | What happens |
|---|---|
| 1 — Services | Checkboxes. Each shows service name, duration, price. Running total shown at bottom. |
| 2 — Date | Calendar (FullCalendar or react-day-picker). Selecting a date calls `GET /api/staff/:id/availability/slots?date=&serviceIds=` |
| 3 — Time slot | Grid of returned HH:mm strings. Customer picks one. |
| 4 — Confirm | Summary card: staff name, branch, services, date, time, total price. Submit button. |

Auth gate at step 4: if customer is not logged in → redirect to `/register?redirect=/b/:slug/staff/:staffId` → after auth, return to wizard with state preserved.

### Auth pages

| Route | Description |
|---|---|
| `/register` | Single signup for all users. Fields: first name, last name, email, phone, password. No role selector. Role hardcoded as `CUSTOMER`. |
| `/login` | Single login for all roles. Post-login reads `profiles.role` → redirects accordingly. |

### List business page

| Route | Description |
|---|---|
| `/list-business` | Requires login. Fields: business name, type (dropdown), city, area, address, description, logo upload. On submit: creates business + upgrades role to `SHOP_OWNER`. Redirect to `/owner/onboarding`. |

### Owner onboarding — `/owner/onboarding`

Shown only on first login after role upgrade (`onboarding_complete = false`). Each step is skippable.

| Step | Fields |
|---|---|
| 1 — Business details | Name pre-filled. Add city, area, description. Upload logo + cover image. |
| 2 — First branch | Branch name, city, area, address, phone. |
| 3 — First service | Name, duration (minutes), price. |
| 4 — First staff member | Name, title, bio, branch assignment. Upload photo. Set working hours. |

After finish or skip all → `POST /api/onboarding/complete` → redirect to `/owner/dashboard`.

### Customer pages (role = CUSTOMER or SHOP_OWNER)

| Route | Description |
|---|---|
| `/customer/bookings` | Tabs: Upcoming / Past / Cancelled. Cancel button (>2h rule). Leave review button (status = COMPLETED only). |
| `/customer/profile` | Edit first name, last name, phone. Change password via `supabase.auth.updateUser({ password })`. |

### Owner pages (role = SHOP_OWNER)

| Route | Description |
|---|---|
| `/owner/dashboard` | Stats cards: bookings today, this week, this month. Filter by branch. Recent bookings table. |
| `/owner/branches` | List all branches. Add/edit/delete branch modal. |
| `/owner/staff` | Staff list with branch badge. Add staff modal. Toggle login access. Assign services inline. |
| `/owner/staff/:staffId/schedule` | Weekly grid (Mon–Sun). Per day: set start/end time or mark as day off. Add break slots. Mark leave dates on calendar. |
| `/owner/services` | Add/edit/delete services: name, duration, price. |
| `/owner/bookings` | Full bookings table. Filters: branch, staff, date range, status. Update status via dropdown. |
| `/owner/settings` | Edit business name, description, type. Re-upload logo and cover image. |

### Worker pages (role = WORKER)

| Route | Description |
|---|---|
| `/worker/calendar` | FullCalendar week view (default). Each booking = calendar event (customer name + services in title). Click event → side modal: full booking detail. Two action buttons: "Mark completed" / "Mark no-show". |

---

## 14. Folder Structure

```
bookify/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                          # Landing
│   │   ├── search/page.tsx
│   │   └── b/[slug]/
│   │       ├── page.tsx                      # Business profile
│   │       └── staff/[staffId]/page.tsx      # Booking wizard
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx                 # All users — role = CUSTOMER
│   ├── list-business/page.tsx                # Role upgrade trigger
│   ├── owner/
│   │   ├── onboarding/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── branches/page.tsx
│   │   ├── staff/
│   │   │   ├── page.tsx
│   │   │   └── [staffId]/schedule/page.tsx
│   │   ├── services/page.tsx
│   │   ├── bookings/page.tsx
│   │   └── settings/page.tsx
│   ├── customer/
│   │   ├── bookings/page.tsx
│   │   └── profile/page.tsx
│   ├── worker/
│   │   └── calendar/page.tsx
│   └── api/
│       ├── auth/
│       │   ├── register/route.ts
│       │   ├── login/route.ts
│       │   ├── logout/route.ts
│       │   └── me/route.ts
│       ├── list-business/route.ts
│       ├── onboarding/route.ts
│       ├── businesses/
│       │   ├── route.ts                      # GET (search)
│       │   └── [id]/
│       │       ├── route.ts                  # PATCH, DELETE
│       │       ├── branches/route.ts
│       │       ├── services/route.ts
│       │       └── staff/
│       │           ├── route.ts
│       │           └── [staffId]/
│       │               ├── route.ts
│       │               └── services/route.ts
│       ├── staff/
│       │   └── [staffId]/
│       │       └── availability/
│       │           ├── working-hours/route.ts
│       │           ├── breaks/route.ts
│       │           ├── leaves/route.ts
│       │           └── slots/route.ts        # Core slot engine
│       ├── bookings/
│       │   ├── route.ts
│       │   ├── my/route.ts
│       │   ├── [bookingId]/
│       │   │   └── status/route.ts
│       │   ├── staff/[staffId]/route.ts
│       │   └── branch/[branchId]/route.ts
│       ├── reviews/
│       │   ├── route.ts
│       │   └── business/[businessId]/route.ts
│       └── dashboard/
│           ├── overview/route.ts
│           ├── bookings/route.ts
│           └── staff-utilization/route.ts
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── auth/                   # RegisterForm, LoginForm
│   ├── list-business/          # ListBusinessForm
│   ├── onboarding/             # OnboardingWizard, Step1–Step4
│   ├── booking/                # BookingWizard, SlotPicker, ServiceSelector, BookingConfirm
│   ├── calendar/               # WorkerCalendar, ScheduleGrid, LeaveCalendar
│   ├── business/               # BusinessCard, StaffCard, BranchTabs, ReviewCard
│   └── layout/                 # Navbar, Sidebar, Footer, RoleGuard
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server client
│   │   └── admin.ts            # Service role client
│   ├── slotCalculator.ts       # Core availability logic
│   ├── auth.ts                 # getAuthUser, requireRole helpers
│   └── storage.ts              # uploadImage helper
├── hooks/
│   ├── useAvailability.ts      # Fetches slots, working hours
│   ├── useBooking.ts           # Booking creation flow state
│   └── useAuth.ts              # Current user + role
├── types/
│   └── index.ts                # All TypeScript types matching DB column names
├── middleware.ts
└── .env.local
```

---

## 15. Route Guards

Protect all dashboard pages using server component checks at the top of each page.

```ts
// Any /owner/* page
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')

const { data: profile } = await supabase
  .from('profiles')
  .select('role, onboarding_complete')
  .eq('id', user.id)
  .single()

if (profile?.role !== 'SHOP_OWNER') redirect('/')
if (!profile?.onboarding_complete) redirect('/owner/onboarding')
```

```ts
// /worker/calendar
if (!user) redirect('/login')
if (profile?.role !== 'WORKER') redirect('/')
```

```ts
// /customer/bookings — both CUSTOMER and SHOP_OWNER allowed
if (!user) redirect('/login')
```

```ts
// /list-business — any logged-in user
if (!user) redirect('/register?redirect=/list-business')
```

---

## 16. Seed Data

No seed script file needed. Run these directly in the Supabase SQL editor after all tables and triggers are created.

```sql
-- Step 1: Create users via Supabase Auth (do this in Supabase Dashboard → Auth → Users → Add user)
-- Or use the Admin API in a one-time script:

-- seed.ts (run once with: npx ts-node seed.ts)
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Create owner (starts as CUSTOMER — trigger sets role)
const { data: ownerAuth } = await supabaseAdmin.auth.admin.createUser({
  email: 'owner@scissors.com', password: 'password123',
  user_metadata: { firstName: 'Ali', lastName: 'Khan', role: 'CUSTOMER' },
  email_confirm: true
})

// Create customer
const { data: customerAuth } = await supabaseAdmin.auth.admin.createUser({
  email: 'customer@test.com', password: 'password123',
  user_metadata: { firstName: 'Sara', lastName: 'Ahmed', role: 'CUSTOMER' },
  email_confirm: true
})

// Create worker
const { data: workerAuth } = await supabaseAdmin.auth.admin.createUser({
  email: 'worker@scissors.com', password: 'password123',
  user_metadata: { firstName: 'Hassan', lastName: 'Raza', role: 'WORKER' },
  email_confirm: true
})

// Step 2: Insert seed data using Supabase client
const { data: business } = await supabaseAdmin
  .from('businesses')
  .insert({
    owner_id: ownerAuth.user.id,
    name: 'Scissors & Co.',
    slug: 'scissors-and-co',
    business_type: 'SALOON',
    city: 'Lahore',
    area: 'DHA',
    description: 'Premium hair and grooming salon in Lahore.'
  })
  .select().single()

// Upgrade owner role to SHOP_OWNER
await supabaseAdmin.from('profiles')
  .update({ role: 'SHOP_OWNER', onboarding_complete: true })
  .eq('id', ownerAuth.user.id)

// Insert branches
const { data: branchDHA } = await supabaseAdmin
  .from('business_branches')
  .insert({ business_id: business.id, name: 'DHA Branch', city: 'Lahore', area: 'DHA', address: 'Phase 5, DHA Lahore' })
  .select().single()

const { data: branchGulberg } = await supabaseAdmin
  .from('business_branches')
  .insert({ business_id: business.id, name: 'Gulberg Branch', city: 'Lahore', area: 'Gulberg', address: 'Main Blvd Gulberg' })
  .select().single()

// Insert services
const services = await supabaseAdmin.from('services').insert([
  { business_id: business.id, name: 'Haircut', duration_minutes: 30, price: 500 },
  { business_id: business.id, name: 'Beard Trim', duration_minutes: 20, price: 300 },
  { business_id: business.id, name: 'Hair Color', duration_minutes: 90, price: 2000 },
  { business_id: business.id, name: 'Facial', duration_minutes: 45, price: 1200 },
  { business_id: business.id, name: 'Threading', duration_minutes: 15, price: 150 },
]).select()

// Insert staff + working hours
const { data: staffMember } = await supabaseAdmin.from('staff').insert({
  business_id: business.id,
  branch_id: branchDHA.id,
  name: 'Hassan Raza',
  title: 'Senior Stylist',
}).select().single()

// Working hours Mon–Sat (1=Mon, 6=Sat), 10:00–20:00
for (let day = 1; day <= 6; day++) {
  await supabaseAdmin.from('working_hours').insert({
    staff_id: staffMember.id,
    day_of_week: day,
    start_time: '10:00',
    end_time: '20:00',
    is_off: false
  })
}
// Sunday off
await supabaseAdmin.from('working_hours').insert({
  staff_id: staffMember.id, day_of_week: 0, start_time: '00:00', end_time: '00:00', is_off: true
})

// Lunch break
await supabaseAdmin.from('staff_breaks').insert([
  { staff_id: staffMember.id, day_of_week: 1, start_time: '13:00', end_time: '14:00', label: 'Lunch' },
  { staff_id: staffMember.id, day_of_week: 2, start_time: '13:00', end_time: '14:00', label: 'Lunch' },
  { staff_id: staffMember.id, day_of_week: 3, start_time: '13:00', end_time: '14:00', label: 'Lunch' },
  { staff_id: staffMember.id, day_of_week: 4, start_time: '13:00', end_time: '14:00', label: 'Lunch' },
  { staff_id: staffMember.id, day_of_week: 5, start_time: '13:00', end_time: '14:00', label: 'Lunch' },
  { staff_id: staffMember.id, day_of_week: 6, start_time: '13:00', end_time: '14:00', label: 'Lunch' },
])

// Clinic seed
const { data: clinic } = await supabaseAdmin.from('businesses').insert({
  owner_id: ownerAuth.user.id,
  name: 'HealthFirst Clinic',
  slug: 'healthfirst-clinic',
  business_type: 'CLINIC',
  city: 'Lahore',
  area: 'Gulberg',
}).select().single()
```

---

## 17. Design Guidelines

| Token | Value |
|---|---|
| Primary background | `#0F172A` (deep navy) |
| Accent / CTA | `#6366F1` (electric indigo) |
| Surface | `#F8FAFC` (soft slate) |
| Body text | `#1E293B` |
| Muted text | `#94A3B8` |
| Success / confirmed | `#10B981` (emerald) |
| Error / cancel | `#F43F5E` (rose) |
| Font | Inter — 700 headings, 400 body |
| Card radius | `rounded-2xl` |
| Shadows | Subtle only — `shadow-sm` |

- Booking wizard: sticky 4-step progress bar at the top of the page
- FullCalendar: week view default for workers, month view for customer date picking
- Mobile first — booking flow must be fully functional on mobile screens
- All forms use React Hook Form + Zod client-side validation
- Error states shown inline under each field, not as toast alerts

---

## 18. Implementation Order

Build in this exact sequence to avoid blockers:

1. Supabase project setup — create project, note the 3 env vars (URL, anon key, service role key)
2. Run all SQL in Supabase SQL editor — enums → tables → `update_updated_at` trigger → `handle_new_user` trigger → RLS policies
3. Create storage buckets — `business-assets`, `staff-avatars` (both public)
4. Set up Next.js project — install deps: `@supabase/supabase-js @supabase/ssr tailwindcss shadcn/ui react-hook-form zod @tanstack/react-query date-fns @fullcalendar/react`
5. Create Supabase client files — `lib/supabase/client.ts`, `server.ts`, `admin.ts`
6. Create `middleware.ts` for session refresh
7. Create `lib/auth.ts` (getAuthUser, requireRole) and `lib/storage.ts` (uploadImage)
8. Auth API routes — `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
9. `/register` page + `/login` page with role-based redirect
10. Landing page — hero with both CTAs
11. `/list-business` page + `/api/list-business` route (creates business + upgrades role)
12. Business + Branch API routes
13. Staff + Service + StaffService API routes
14. Working hours + breaks + leaves API routes
15. `lib/slotCalculator.ts` — implement and unit test with sample data
16. `/api/staff/:staffId/availability/slots` route — wires slot calculator to live DB data
17. Booking create + conflict check + status update API routes
18. Reviews + Dashboard API routes
19. Owner onboarding wizard — `/owner/onboarding` (4 steps)
20. Route guards on all protected pages
21. Search page + Business public profile page
22. Staff booking wizard — 4-step flow at `/b/:slug/staff/:staffId`
23. Customer dashboard — bookings page + profile page
24. Owner dashboard — all pages (staff, services, schedule, bookings, settings)
25. Worker calendar page
26. Wire all file upload forms to Supabase Storage via `uploadImage`
27. Run seed script once to populate test data

---

*End of document — Version 2.0. No Prisma. No ORM. No database connection strings. Three env vars only. All queries via Supabase JS client. Feed this directly to Cursor, Claude Code, or Windsurf to build the complete product end-to-end.*
