-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Companies Table
create table if not exists "companies" (
  "id" uuid primary key default uuid_generate_v4(),
  "name" text not null,
  "cnpj" text not null unique,
  "group" text,
  "createdAt" timestamptz default now(),
  "data" jsonb
);

-- Credits Table
create table if not exists "credits" (
  "id" uuid primary key default uuid_generate_v4(),
  "empresa" text not null,
  "tipoCredito" text,
  "codigoReceita" text,
  "periodoApuracao" text,
  "valorPrincipal" numeric,
  "dataArrecadacao" date,
  "integrityHash" text,
  "compensations" jsonb default '[]'::jsonb,
  "selicHistory" jsonb default '[]'::jsonb,
  "createdAt" timestamptz default now()
);

-- Loans Table
create table if not exists "loans" (
  "id" uuid primary key default uuid_generate_v4(),
  "empresaId" uuid references "companies"("id"),
  "instituicao" text,
  "categoria" text,
  "moeda" text,
  "taxaCambio" numeric,
  "tipoJuros" text,
  "dataInicio" date,
  "valorOriginal" numeric,
  "taxa" numeric,
  "periodoTaxa" text,
  "baseCalculo" text,
  "periodicidadeCapitalizacao" text,
  "prazo" integer,
  "payments" jsonb default '[]'::jsonb,
  "modified_by" text,
  "modified_at" timestamptz,
  "createdAt" timestamptz default now()
);

-- Perdcomps Table
create table if not exists "perdcomps" (
  "id" uuid primary key default uuid_generate_v4(),
  "numero" text not null,
  "dataCriacao" date,
  "creditId" uuid references "credits"("id"),
  "codigoImposto" text,
  "periodoApuracao" text,
  "vencimento" date,
  "valorPrincipal" numeric,
  "multa" numeric,
  "juros" numeric,
  "valorTotal" numeric,
  "valorCompensado" numeric, -- Appears in logic
  "status" text,
  "modified_by" text,
  "modified_at" timestamptz,
  "createdAt" timestamptz default now()
);

-- Row Level Security (RLS) - Optional for now but good practice
alter table "companies" enable row level security;
alter table "credits" enable row level security;
alter table "loans" enable row level security;
alter table "perdcomps" enable row level security;

-- Policies (Allow all for anon for now since we are using anon key and simple auth)
create policy "Enable all access" on "companies" for all using (true) with check (true);
create policy "Enable all access" on "credits" for all using (true) with check (true);
create policy "Enable all access" on "loans" for all using (true) with check (true);
create policy "Enable all access" on "perdcomps" for all using (true) with check (true);

-- Exchange Configuration Table
create table if not exists "exchange_config" (
  "symbol" text primary key,
  "buySeriesId" integer,
  "sellSeriesId" integer,
  "updatedAt" timestamptz default now()
);

-- Exchange Rate Overrides/Cache Table
create table if not exists "exchange_overrides" (
  "id" uuid primary key default uuid_generate_v4(),
  "currency" text not null,
  "date" text not null, -- Storing as text to avoid timezone issues (YYYY-MM-DD)
  "buyValue" numeric,
  "sellValue" numeric,
  "source" text default 'MANUAL', -- 'MANUAL' or 'BCB'
  "createdAt" timestamptz default now(),
  unique("currency", "date")
);

-- Selic Overrides/Cache Table
create table if not exists "selic_overrides" (
  "id" uuid primary key default uuid_generate_v4(),
  "date" text not null unique, -- Storing as text (DD/MM/YYYY) or (YYYY-MM-DD) - APP uses DD/MM/YYYY for Selic currently
  "value" numeric,
  "source" text default 'MANUAL',
  "createdAt" timestamptz default now()
);

-- RLS for new tables
alter table "exchange_config" enable row level security;
alter table "exchange_overrides" enable row level security;
alter table "selic_overrides" enable row level security;

create policy "Enable all access" on "exchange_config" for all using (true) with check (true);
create policy "Enable all access" on "exchange_overrides" for all using (true) with check (true);
create policy "Enable all access" on "selic_overrides" for all using (true) with check (true);
