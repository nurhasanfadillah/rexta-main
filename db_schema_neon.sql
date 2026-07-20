-- NeonDB Schema untuk Rexta
-- Diadaptasi dari db_schema.sql — semua Supabase-specific RLS dihapus.
-- Jalankan file ini di NeonDB SQL Editor (console.neon.tech) satu kali.

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. TABEL KATEGORI (Master Data)
create table if not exists categories (
  id text primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TABEL PRODUK
create table if not exists products (
  id text primary key,
  name text not null,
  category_id text references categories(id) on delete set null,
  price_cmt numeric default 0,
  hpp numeric default 0,
  stock numeric default 0,
  is_favorite boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. TABEL BAHAN BAKU (Material)
create table if not exists materials (
  id text primary key,
  name text not null,
  unit text not null,
  price numeric default 0,
  stock numeric default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. TABEL TRANSAKSI (Riwayat Stok)
create table if not exists transactions (
  id text primary key,
  item_id text not null,
  item_type text not null,
  type text not null,
  qty numeric not null,
  date timestamp with time zone not null,
  notes text,
  balance_after numeric not null
);

-- 6. FUNGSI LOGIKA STOK (RPC)
create or replace function process_inventory_transaction(
  p_id text,
  p_item_id text,
  p_item_type text,
  p_type text,
  p_qty numeric,
  p_date timestamp with time zone,
  p_notes text,
  p_manual_stock numeric default null
) returns numeric as $$
declare
  v_current_stock numeric;
  v_new_stock numeric;
begin
  if p_item_type = 'PRODUK' then
    select stock into v_current_stock from products where id = p_item_id;
  else
    select stock into v_current_stock from materials where id = p_item_id;
  end if;

  if v_current_stock is null then
    raise exception 'Item tidak ditemukan (ID: %)', p_item_id;
  end if;

  if p_type = 'OPNAME' and p_manual_stock is not null then
    v_new_stock := p_manual_stock;
  elsif p_type = 'IN' then
    v_new_stock := v_current_stock + p_qty;
  elsif p_type = 'OUT' then
    v_new_stock := v_current_stock - p_qty;
  else
    v_new_stock := v_current_stock + p_qty;
  end if;

  if p_item_type = 'PRODUK' then
    update products set stock = v_new_stock, updated_at = now() where id = p_item_id;
  else
    update materials set stock = v_new_stock, updated_at = now() where id = p_item_id;
  end if;

  insert into transactions (id, item_id, item_type, type, qty, date, notes, balance_after)
  values (p_id, p_item_id, p_item_type, p_type, p_qty, p_date, p_notes, v_new_stock);

  return v_new_stock;
end;
$$ language plpgsql;

-- 7. INDEXING
create index if not exists idx_transactions_item_id on transactions(item_id);
create index if not exists idx_transactions_date on transactions(date);
create index if not exists idx_products_name on products(name);
create index if not exists idx_materials_name on materials(name);
create index if not exists idx_products_favorite on products(is_favorite);

-- 8. BETTER AUTH TABLES
-- Schema sesuai Better Auth v1 standar untuk email/password auth.
-- Jika versi berubah, validasi dengan: npx @better-auth/cli generate --dialect postgresql
CREATE TABLE IF NOT EXISTS "user" (
    "id" text NOT NULL PRIMARY KEY,
    "name" text NOT NULL,
    "email" text NOT NULL UNIQUE,
    "emailVerified" boolean NOT NULL DEFAULT false,
    "image" text,
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "session" (
    "id" text NOT NULL PRIMARY KEY,
    "expiresAt" timestamp NOT NULL,
    "token" text NOT NULL UNIQUE,
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now(),
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
    "id" text NOT NULL PRIMARY KEY,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp,
    "refreshTokenExpiresAt" timestamp,
    "scope" text,
    "password" text,
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "verification" (
    "id" text NOT NULL PRIMARY KEY,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expiresAt" timestamp NOT NULL,
    "createdAt" timestamp DEFAULT now(),
    "updatedAt" timestamp DEFAULT now()
);
