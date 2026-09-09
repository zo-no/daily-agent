-- Keep the complete document and the item streams coherent during the
-- compatibility window. Direct item writes refresh the legacy text arrays;
-- direct document writes are translated into item mutations and tombstones.

create or replace function public.refresh_log_note_legacy_document_records()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then return new; end if;
  update public.log_note_documents
  set payload = jsonb_set(payload, '{entries}', coalesce((
    select jsonb_agg(i.payload order by i.entity_id)
    from public.log_note_record_items i
    where i.user_id = new.user_id and i.deleted_at is null
  ), '[]'::jsonb), true), revision = revision + 1, updated_at = now()
  where user_id = new.user_id;
  return new;
end;
$$;

create or replace function public.refresh_log_note_legacy_document_plans()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then return new; end if;
  update public.log_note_documents
  set payload = jsonb_set(payload, '{planBlocks}', coalesce((
    select jsonb_agg(i.payload order by i.entity_id)
    from public.log_note_plan_items i
    where i.user_id = new.user_id and i.deleted_at is null
  ), '[]'::jsonb), true), revision = revision + 1, updated_at = now()
  where user_id = new.user_id;
  return new;
end;
$$;

drop trigger if exists log_note_record_items_legacy_document on public.log_note_record_items;
create trigger log_note_record_items_legacy_document
after insert or update on public.log_note_record_items
for each row execute function public.refresh_log_note_legacy_document_records();

drop trigger if exists log_note_plan_items_legacy_document on public.log_note_plan_items;
create trigger log_note_plan_items_legacy_document
after insert or update on public.log_note_plan_items
for each row execute function public.refresh_log_note_legacy_document_plans();

create or replace function public.bridge_log_note_document_to_items()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  old_item jsonb;
  v_entity_id text;
  existing_version bigint;
  existing_payload jsonb;
  existing_deleted_at timestamptz;
  next_version bigint;
  v_operation_id uuid;
  normalized jsonb;
  new_entries jsonb := case when jsonb_typeof(new.payload->'entries') = 'array' then new.payload->'entries' else '[]'::jsonb end;
  new_plans jsonb := case when jsonb_typeof(new.payload->'planBlocks') = 'array' then new.payload->'planBlocks' else '[]'::jsonb end;
  old_entries jsonb := case when tg_op = 'UPDATE' and jsonb_typeof(old.payload->'entries') = 'array' then old.payload->'entries' else '[]'::jsonb end;
  old_plans jsonb := case when tg_op = 'UPDATE' and jsonb_typeof(old.payload->'planBlocks') = 'array' then old.payload->'planBlocks' else '[]'::jsonb end;
begin
  if pg_trigger_depth() > 1 then return new; end if;

  for item in select value from jsonb_array_elements(new_entries) loop
    v_entity_id := trim(coalesce(item->>'id', ''));
    if v_entity_id = '' then continue; end if;
    normalized := item - 'attachments' || jsonb_build_object('attachments', '[]'::jsonb);
    select item_version, payload, deleted_at into existing_version, existing_payload, existing_deleted_at
    from public.log_note_record_items where user_id = new.user_id and entity_id = v_entity_id;
    if found and existing_deleted_at is null and existing_payload is not distinct from normalized then continue; end if;
    next_version := case when found then existing_version + 1 else 1 end;
    v_operation_id := md5(new.user_id::text || ':legacy:' || new.revision::text || ':record:' || v_entity_id)::uuid;
    insert into public.log_note_sync_changes (user_id, entity_type, entity_id, operation, payload, item_version, operation_id, device_id)
    values (new.user_id, 'record', v_entity_id, 'upsert', normalized, next_version, v_operation_id, new.device_id)
    on conflict (user_id, operation_id) do nothing;
    insert into public.log_note_record_items (user_id, entity_id, payload, item_version, last_server_seq, deleted_at, updated_at)
    select new.user_id, v_entity_id, normalized, next_version, c.server_seq, null, now()
    from public.log_note_sync_changes c where c.user_id = new.user_id and c.operation_id = v_operation_id
    on conflict (user_id, entity_id) do update set payload = excluded.payload, item_version = excluded.item_version, last_server_seq = excluded.last_server_seq, deleted_at = null, updated_at = excluded.updated_at;
  end loop;

  for old_item in select value from jsonb_array_elements(old_entries) loop
    v_entity_id := trim(coalesce(old_item->>'id', ''));
    if v_entity_id = '' or exists (select 1 from jsonb_array_elements(new_entries) n where n->>'id' = v_entity_id) then continue; end if;
    select item_version into existing_version from public.log_note_record_items where user_id = new.user_id and entity_id = v_entity_id;
    if not found or exists (select 1 from public.log_note_record_items where user_id = new.user_id and entity_id = v_entity_id and deleted_at is not null) then continue; end if;
    next_version := existing_version + 1;
    v_operation_id := md5(new.user_id::text || ':legacy:' || new.revision::text || ':record-delete:' || v_entity_id)::uuid;
    insert into public.log_note_sync_changes (user_id, entity_type, entity_id, operation, payload, item_version, operation_id, device_id)
    values (new.user_id, 'record', v_entity_id, 'delete', null, next_version, v_operation_id, new.device_id)
    on conflict (user_id, operation_id) do nothing;
    update public.log_note_record_items i set payload = null, item_version = next_version, last_server_seq = c.server_seq, deleted_at = now(), updated_at = now()
    from public.log_note_sync_changes c where c.user_id = new.user_id and c.operation_id = v_operation_id and i.user_id = new.user_id and i.entity_id = v_entity_id;
  end loop;

  for item in select value from jsonb_array_elements(new_plans) loop
    v_entity_id := trim(coalesce(item->>'id', ''));
    if v_entity_id = '' then continue; end if;
    select item_version, payload, deleted_at into existing_version, existing_payload, existing_deleted_at
    from public.log_note_plan_items where user_id = new.user_id and entity_id = v_entity_id;
    if found and existing_deleted_at is null and existing_payload is not distinct from item then continue; end if;
    next_version := case when found then existing_version + 1 else 1 end;
    v_operation_id := md5(new.user_id::text || ':legacy:' || new.revision::text || ':plan:' || v_entity_id)::uuid;
    insert into public.log_note_sync_changes (user_id, entity_type, entity_id, operation, payload, item_version, operation_id, device_id)
    values (new.user_id, 'plan', v_entity_id, 'upsert', item, next_version, v_operation_id, new.device_id)
    on conflict (user_id, operation_id) do nothing;
    insert into public.log_note_plan_items (user_id, entity_id, payload, item_version, last_server_seq, deleted_at, updated_at)
    select new.user_id, v_entity_id, item, next_version, c.server_seq, null, now()
    from public.log_note_sync_changes c where c.user_id = new.user_id and c.operation_id = v_operation_id
    on conflict (user_id, entity_id) do update set payload = excluded.payload, item_version = excluded.item_version, last_server_seq = excluded.last_server_seq, deleted_at = null, updated_at = excluded.updated_at;
  end loop;

  for old_item in select value from jsonb_array_elements(old_plans) loop
    v_entity_id := trim(coalesce(old_item->>'id', ''));
    if v_entity_id = '' or exists (select 1 from jsonb_array_elements(new_plans) n where n->>'id' = v_entity_id) then continue; end if;
    select item_version into existing_version from public.log_note_plan_items where user_id = new.user_id and entity_id = v_entity_id;
    if not found or exists (select 1 from public.log_note_plan_items where user_id = new.user_id and entity_id = v_entity_id and deleted_at is not null) then continue; end if;
    next_version := existing_version + 1;
    v_operation_id := md5(new.user_id::text || ':legacy:' || new.revision::text || ':plan-delete:' || v_entity_id)::uuid;
    insert into public.log_note_sync_changes (user_id, entity_type, entity_id, operation, payload, item_version, operation_id, device_id)
    values (new.user_id, 'plan', v_entity_id, 'delete', null, next_version, v_operation_id, new.device_id)
    on conflict (user_id, operation_id) do nothing;
    update public.log_note_plan_items i set payload = null, item_version = next_version, last_server_seq = c.server_seq, deleted_at = now(), updated_at = now()
    from public.log_note_sync_changes c where c.user_id = new.user_id and c.operation_id = v_operation_id and i.user_id = new.user_id and i.entity_id = v_entity_id;
  end loop;
  return new;
end;
$$;

drop trigger if exists log_note_documents_incremental_bridge on public.log_note_documents;
create trigger log_note_documents_incremental_bridge
after insert or update of payload on public.log_note_documents
for each row execute function public.bridge_log_note_document_to_items();
