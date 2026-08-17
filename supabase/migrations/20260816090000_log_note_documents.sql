create table if not exists public.log_note_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  data_version integer not null check (data_version > 0),
  structure_schema_version integer not null check (structure_schema_version > 0),
  revision bigint not null check (revision > 0),
  device_id uuid,
  last_operation_id uuid not null,
  updated_at timestamptz not null default now(),
  constraint log_note_document_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint log_note_document_payload_limit check (octet_length(payload::text) <= 10485760)
);

create table if not exists public.log_note_document_revisions (
  user_id uuid not null references auth.users(id) on delete cascade,
  revision bigint not null check (revision > 0),
  payload jsonb not null,
  data_version integer not null check (data_version > 0),
  structure_schema_version integer not null check (structure_schema_version > 0),
  device_id uuid,
  operation_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, revision),
  unique (user_id, operation_id),
  constraint log_note_revision_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint log_note_revision_payload_limit check (octet_length(payload::text) <= 10485760)
);

alter table public.log_note_documents enable row level security;
alter table public.log_note_documents force row level security;
alter table public.log_note_document_revisions enable row level security;
alter table public.log_note_document_revisions force row level security;

revoke all on public.log_note_documents from anon, authenticated;
revoke all on public.log_note_document_revisions from anon, authenticated;
grant select on public.log_note_documents to authenticated;
grant select on public.log_note_document_revisions to authenticated;

drop policy if exists "read own log note document" on public.log_note_documents;
create policy "read own log note document"
on public.log_note_documents for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "write own log note document" on public.log_note_documents;
create policy "write own log note document"
on public.log_note_documents for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "read own log note revisions" on public.log_note_document_revisions;
create policy "read own log note revisions"
on public.log_note_document_revisions for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "write own log note revisions" on public.log_note_document_revisions;
create policy "write own log note revisions"
on public.log_note_document_revisions for insert to authenticated
with check ((select auth.uid()) = user_id);

create or replace function public.save_log_note_document(
  p_payload jsonb,
  p_data_version integer,
  p_structure_schema_version integer,
  p_expected_revision bigint,
  p_device_id uuid,
  p_operation_id uuid
)
returns public.log_note_documents
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_document public.log_note_documents;
  next_document public.log_note_documents;
  next_revision bigint;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_operation_id is null then
    raise exception using errcode = '22023', message = 'Operation ID is required';
  end if;
  if jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 10485760 then
    raise exception using errcode = '22023', message = 'Cloud payload is invalid';
  end if;

  select * into current_document
  from public.log_note_documents
  where user_id = current_user_id
  for update;

  if found and current_document.last_operation_id = p_operation_id then
    return current_document;
  end if;

  if not found then
    if coalesce(p_expected_revision, 0) <> 0 then
      raise exception using errcode = '40001', message = 'Cloud revision changed';
    end if;
    next_revision := 1;
    insert into public.log_note_documents (
      user_id, payload, data_version, structure_schema_version, revision,
      device_id, last_operation_id, updated_at
    ) values (
      current_user_id, p_payload, p_data_version, p_structure_schema_version, next_revision,
      p_device_id, p_operation_id, now()
    ) returning * into next_document;
  else
    if p_expected_revision is null or current_document.revision <> p_expected_revision then
      raise exception using errcode = '40001', message = 'Cloud revision changed';
    end if;
    next_revision := current_document.revision + 1;
    update public.log_note_documents set
      payload = p_payload,
      data_version = p_data_version,
      structure_schema_version = p_structure_schema_version,
      revision = next_revision,
      device_id = p_device_id,
      last_operation_id = p_operation_id,
      updated_at = now()
    where user_id = current_user_id
    returning * into next_document;
  end if;

  insert into public.log_note_document_revisions (
    user_id, revision, payload, data_version, structure_schema_version, device_id, operation_id
  ) values (
    current_user_id, next_revision, p_payload, p_data_version, p_structure_schema_version, p_device_id, p_operation_id
  );

  delete from public.log_note_document_revisions
  where user_id = current_user_id
    and revision <= next_revision - 30;

  return next_document;
end;
$$;

revoke all on function public.save_log_note_document(jsonb, integer, integer, bigint, uuid, uuid) from public, anon;
grant execute on function public.save_log_note_document(jsonb, integer, integer, bigint, uuid, uuid) to authenticated;
