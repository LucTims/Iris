-- Create api_keys table for MCP connections
create table public.api_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  key text not null unique,
  name text not null default 'Default MCP Key',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_used_at timestamp with time zone,
  is_active boolean default true not null
);

-- RLS
alter table public.api_keys enable row level security;

create policy "Users can view their own api keys"
  on public.api_keys for select
  using (auth.uid() = user_id);

create policy "Users can create their own api keys"
  on public.api_keys for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own api keys"
  on public.api_keys for delete
  using (auth.uid() = user_id);

create policy "Users can update their own api keys"
  on public.api_keys for update
  using (auth.uid() = user_id);

-- Create index on key for faster lookups
create index idx_api_keys_key on public.api_keys(key);
