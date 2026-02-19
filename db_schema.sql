

-- 1. Enable UUID extension (Opsional, tapi praktik bagus)
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
  is_favorite boolean default false, -- Kolom Baru
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. TABEL BAHAN BAKU (Material)
create table if not exists materials (
  id text primary key,
  name text not null,
  unit text not null, -- kg, meter, roll, pcs
  price numeric default 0,
  stock numeric default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. TABEL TRANSAKSI (Riwayat Stok)
create table if not exists transactions (
  id text primary key,
  item_id text not null,
  item_type text not null, -- 'PRODUK' atau 'BAHAN_BAKU'
  type text not null, -- 'IN', 'OUT', 'OPNAME'
  qty numeric not null,
  date timestamp with time zone not null,
  notes text,
  balance_after numeric not null
);

-- 6. KEAMANAN (RLS - Row Level Security)
alter table categories enable row level security;
alter table products enable row level security;
alter table materials enable row level security;
alter table transactions enable row level security;

-- Kebijakan Akses Authenticated (Admin/Staff)
create policy "Enable access for authenticated users" on categories for all using (auth.role() = 'authenticated');
create policy "Enable access for authenticated users" on products for all using (auth.role() = 'authenticated');
create policy "Enable access for authenticated users" on materials for all using (auth.role() = 'authenticated');
create policy "Enable access for authenticated users" on transactions for all using (auth.role() = 'authenticated');

-- Kebijakan Akses Publik (View Only)
-- PENTING: Jalankan query ini agar fitur Stok Publik berfungsi
create policy "Public read access for products" on products for select to anon using (true);
create policy "Public read access for categories" on categories for select to anon using (true);

-- 7. FUNGSI LOGIKA STOK (RPC)
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
  -- A. Ambil stok saat ini
  if p_item_type = 'PRODUK' then
    select stock into v_current_stock from products where id = p_item_id;
  else
    select stock into v_current_stock from materials where id = p_item_id;
  end if;

  if v_current_stock is null then
    raise exception 'Item tidak ditemukan (ID: %)', p_item_id;
  end if;

  -- B. Hitung stok baru
  if p_type = 'OPNAME' and p_manual_stock is not null then
    v_new_stock := p_manual_stock;
  elsif p_type = 'IN' then
    v_new_stock := v_current_stock + p_qty;
  elsif p_type = 'OUT' then
    v_new_stock := v_current_stock - p_qty;
  else
    v_new_stock := v_current_stock + p_qty;
  end if;

  -- C. Update Tabel Master (Produk/Material)
  if p_item_type = 'PRODUK' then
    update products set stock = v_new_stock, updated_at = now() where id = p_item_id;
  else
    update materials set stock = v_new_stock, updated_at = now() where id = p_item_id;
  end if;

  -- D. Catat Riwayat Transaksi
  insert into transactions (id, item_id, item_type, type, qty, date, notes, balance_after)
  values (p_id, p_item_id, p_item_type, p_type, p_qty, p_date, p_notes, v_new_stock);

  -- E. Return stok baru ke aplikasi
  return v_new_stock;
end;
$$ language plpgsql;

-- 8. INDEXING (PERFORMANCE TUNING)
create index if not exists idx_transactions_item_id on transactions(item_id);
create index if not exists idx_transactions_date on transactions(date);
create index if not exists idx_products_name on products(name);
create index if not exists idx_materials_name on materials(name);
create index if not exists idx_products_favorite on products(is_favorite);