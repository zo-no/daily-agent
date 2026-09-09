-- Incremental, account-scoped record and plan synchronization.
-- The legacy log_note_documents snapshot remains the compatibility boundary for
-- structure/settings and older clients. These tables own only record/plan text.

create table if not exists public.log_note_record_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id text not null check (char_length(entity_id) between 1 and 180),
  payload jsonb,
  item_version bigint not null check (item_version > 0),
  last_server_seq bigint not null default 0 check (last_server_seq >= 0),
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, entity_id),
  constraint log_note_record_payload_object check (payload is null or jsonb_typeof(payload) = 'object')
);

create table if not exists public.log_note_plan_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id text not null check (char_length(entity_id) between 1 and 180),
  payload jsonb,
  item_version bigint not null check (item_version > 0),
  last_server_seq bigint not null default 0 check (last_server_seq >= 0),
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, entity_id),
  constraint log_note_plan_payload_object check (payload is null or jsonb_typeof(payload) = 'object')
);

create table if not exists public.log_note_sync_changes (
  server_seq bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('record', 'plan')),
  entity_id text not null check (char_length(entity_id) between 1 and 180),
  operation text not null check (operation in ('upsert', 'delete')),
  payload jsonb,
  item_version bigint not null check (item_version > 0),
  operation_id uuid not null,
  device_id uuid,
  created_at timestamptz not null default now(),
  unique (user_id, operation_id),
  constraint log_note_sync_change_payload_object check (payload is null or jsonb_typeof(payload) = 'object')
);

create index if not exists log_note_sync_changes_cursor_idx
  on public.log_note_sync_changes (user_id, entity_type, server_seq);

do $$
begin
  alter publication supabase_realtime add table public.log_note_sync_changes;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

alter table public.log_note_record_items enable row level security;
alter table public.log_note_record_items force row level security;
alter table public.log_note_plan_items enable row level security;
alter table public.log_note_plan_items force row level security;
alter table public.log_note_sync_changes enable row level security;
alter table public.log_note_sync_changes force row level security;

revoke all on public.log_note_record_items from anon, authenticated;
revoke all on public.log_note_plan_items from anon, authenticated;
revoke all on public.log_note_sync_changes from anon, authenticated;
grant select on public.log_note_record_items to authenticated;
grant select on public.log_note_plan_items to authenticated;
grant select on public.log_note_sync_changes to authenticated;

drop policy if exists "read own log note record items" on public.log_note_record_items;
create policy "read own log note record items"
on public.log_note_record_items for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "read own log note plan items" on public.log_note_plan_items;
create policy "read own log note plan items"
on public.log_note_plan_items for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "read own log note sync changes" on public.log_note_sync_changes;
create policy "read own log note sync changes"
on public.log_note_sync_changes for select to authenticated
using ((select auth.uid()) = user_id);

-- Existing complete documents become the initial item baseline. Attachments stay
-- local and are deliberately removed from record payloads during backfill.
do $$
declare
  document record;
begin
  for document in select user_id, payload, updated_at from public.log_note_documents loop
    insert into public.log_note_record_items (user_id, entity_id, payload, item_version, updated_at)
    select document.user_id,
      item->>'id',
      item - 'attachments' || jsonb_build_object('attachments', '[]'::jsonb),
      1,
      document.updated_at
    from jsonb_array_elements(coalesce(document.payload->'entries', '[]'::jsonb)) as entry(item)
    where jsonb_typeof(document.payload->'entries') = 'array'
      and item->>'id' is not null
    on conflict (user_id, entity_id) do nothing;

    insert into public.log_note_plan_items (user_id, entity_id, payload, item_version, updated_at)
    select document.user_id,
      item->>'id',
      item,
      1,
      document.updated_at
    from jsonb_array_elements(coalesce(document.payload->'planBlocks', '[]'::jsonb)) as plan(item)
    where jsonb_typeof(document.payload->'planBlocks') = 'array'
      and item->>'id' is not null
    on conflict (user_id, entity_id) do nothing;
  end loop;
end;
$$;

create or replace function public.pull_log_note_changes(
  p_entity_type text,
  p_after_server_seq bigint default 0,
  p_limit integer default 200
)
returns table (
  server_seq bigint,
  entity_type text,
  entity_id text,
  operation text,
  payload jsonb,
  item_version bigint,
  operation_id uuid,
  device_id uuid,
  created_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select c.server_seq, c.entity_type, c.entity_id, c.operation, c.payload,
    c.item_version, c.operation_id, c.device_id, c.created_at
  from public.log_note_sync_changes c
  where c.user_id = (select auth.uid())
    and c.entity_type = p_entity_type
    and c.server_seq > greatest(coalesce(p_after_server_seq, 0), 0)
  order by c.server_seq
  limit least(greatest(coalesce(p_limit, 200), 1), 200);
$$;

revoke all on function public.pull_log_note_changes(text, bigint, integer) from public, anon;
grant execute on function public.pull_log_note_changes(text, bigint, integer) to authenticated;

create or replace function public.push_log_note_changes(
  p_entity_type text,
  p_mutations jsonb,
  p_device_id uuid
)
returns table (
  outcome text,
  entity_id text,
  operation text,
  operation_id uuid,
  item_version bigint,
  server_seq bigint,
  payload jsonb,
  conflict_version bigint,
  conflict_payload jsonb,
  conflict_deleted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  mutation jsonb;
  v_entity_id text;
  v_operation text;
  v_operation_id uuid;
  v_base_version bigint;
  v_payload jsonb;
  v_current_version bigint;
  v_current_payload jsonb;
  v_current_deleted_at timestamptz;
  v_current_server_seq bigint;
  v_server_seq bigint;
  v_next_version bigint;
  v_found boolean;
  v_existing_change public.log_note_sync_changes;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_entity_type not in ('record', 'plan') then
    raise exception using errcode = '22023', message = 'Entity type is invalid';
  end if;
  if jsonb_typeof(p_mutations) <> 'array' or jsonb_array_length(p_mutations) > 50 then
    raise exception using errcode = '22023', message = 'Mutation batch is invalid';
  end if;

  for mutation in select value from jsonb_array_elements(p_mutations) loop
    v_entity_id := trim(coalesce(mutation->>'entityId', ''));
    v_operation := mutation->>'operation';
    v_payload := mutation->'payload';
    v_base_version := coalesce((mutation->>'baseVersion')::bigint, 0);
    v_operation_id := (mutation->>'operationId')::uuid;
    if v_entity_id = '' or char_length(v_entity_id) > 180
      or v_operation not in ('upsert', 'delete')
      or v_base_version < 0
      or v_operation_id is null
      or (v_operation = 'upsert' and (jsonb_typeof(v_payload) <> 'object' or v_payload->>'id' <> v_entity_id)) then
      raise exception using errcode = '22023', message = 'Mutation is invalid';
    end if;
    if v_operation = 'upsert' and p_entity_type = 'record' then
      v_payload := v_payload - 'attachments' || jsonb_build_object('attachments', '[]'::jsonb);
    end if;

    select * into v_existing_change
    from public.log_note_sync_changes
    where user_id = current_user_id and operation_id = v_operation_id;
    if found then
      outcome := 'already_applied';
      entity_id := v_existing_change.entity_id;
      operation := v_existing_change.operation;
      operation_id := v_existing_change.operation_id;
      item_version := v_existing_change.item_version;
      server_seq := v_existing_change.server_seq;
      payload := v_existing_change.payload;
      conflict_version := null;
      conflict_payload := null;
      conflict_deleted_at := null;
      return next;
      continue;
    end if;

    v_current_version := null;
    v_current_payload := null;
    v_current_deleted_at := null;
    v_current_server_seq := 0;
    if p_entity_type = 'record' then
      select item_version, payload, deleted_at, last_server_seq
        into v_current_version, v_current_payload, v_current_deleted_at, v_current_server_seq
      from public.log_note_record_items
      where user_id = current_user_id and entity_id = v_entity_id
      for update;
    else
      select item_version, payload, deleted_at, last_server_seq
        into v_current_version, v_current_payload, v_current_deleted_at, v_current_server_seq
      from public.log_note_plan_items
      where user_id = current_user_id and entity_id = v_entity_id
      for update;
    end if;
    v_found := found;

    if (not v_found and v_base_version <> 0) or (v_found and v_current_version <> v_base_version) then
      outcome := 'conflict';
      entity_id := v_entity_id;
      operation := v_operation;
      operation_id := v_operation_id;
      item_version := coalesce(v_current_version, 0);
      server_seq := coalesce(v_current_server_seq, 0);
      payload := null;
      conflict_version := v_current_version;
      conflict_payload := v_current_payload;
      conflict_deleted_at := v_current_deleted_at;
      return next;
      continue;
    end if;

    v_next_version := case when v_found then v_current_version + 1 else 1 end;
    insert into public.log_note_sync_changes (
      user_id, entity_type, entity_id, operation, payload, item_version, operation_id, device_id
    ) values (
      current_user_id, p_entity_type, v_entity_id, v_operation,
      case when v_operation = 'upsert' then v_payload else null end,
      v_next_version, v_operation_id, p_device_id
    ) returning public.log_note_sync_changes.server_seq into v_server_seq;

    if p_entity_type = 'record' then
      insert into public.log_note_record_items (
        user_id, entity_id, payload, item_version, last_server_seq, deleted_at, updated_at
      ) values (
        current_user_id, v_entity_id,
        case when v_operation = 'upsert' then v_payload else null end,
        v_next_version, v_server_seq,
        case when v_operation = 'delete' then now() else null end, now()
      )
      on conflict (user_id, entity_id) do update set
        payload = excluded.payload,
        item_version = excluded.item_version,
        last_server_seq = excluded.last_server_seq,
        deleted_at = excluded.deleted_at,
        updated_at = excluded.updated_at;
    else
      insert into public.log_note_plan_items (
        user_id, entity_id, payload, item_version, last_server_seq, deleted_at, updated_at
      ) values (
        current_user_id, v_entity_id,
        case when v_operation = 'upsert' then v_payload else null end,
        v_next_version, v_server_seq,
        case when v_operation = 'delete' then now() else null end, now()
      )
      on conflict (user_id, entity_id) do update set
        payload = excluded.payload,
        item_version = excluded.item_version,
        last_server_seq = excluded.last_server_seq,
        deleted_at = excluded.deleted_at,
        updated_at = excluded.updated_at;
    end if;

    outcome := 'applied';
    entity_id := v_entity_id;
    operation := v_operation;
    operation_id := v_operation_id;
    item_version := v_next_version;
    server_seq := v_server_seq;
    payload := case when v_operation = 'upsert' then v_payload else null end;
    conflict_version := null;
    conflict_payload := null;
    conflict_deleted_at := null;
    return next;
  end loop;
end;
$$;

revoke all on function public.push_log_note_changes(text, jsonb, uuid) from public, anon;
grant execute on function public.push_log_note_changes(text, jsonb, uuid) to authenticated;
