-- Tabla para el historial diario (Palantír Analytics)
create table daily_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  log_date date not null,
  tasks_total int default 0,
  tasks_completed int default 0,
  tasks_failed int default 0,
  shadow_level text default 'neutral', -- 'neutral', 'low', 'medium', 'high'
  completed_by_category jsonb default '{}'::jsonb,
  total_by_category jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Aseguramos que solo haya un log por usuario y día
  unique(user_id, log_date)
);

-- Habilitar RLS (Row Level Security)
alter table daily_logs enable row level security;

-- Política: El usuario solo puede ver sus propios logs
create policy "Users can view their own daily logs"
  on daily_logs for select
  using ( auth.uid() = user_id );

-- Política: El usuario puede insertar/actualizar sus propios logs (o el backend con service_role)
create policy "Users can insert their own daily logs"
  on daily_logs for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own daily logs"
  on daily_logs for update
  using ( auth.uid() = user_id );
