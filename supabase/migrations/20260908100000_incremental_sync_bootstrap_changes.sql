-- Emit bootstrap changes for item rows created by the initial incremental-sync backfill.
-- This is idempotent and lets a new client initialize from the cursor stream without
-- silently missing records that predate the change log.

do $$
declare
  item record;
  v_seq bigint;
  v_operation_id uuid;
begin
  for item in
    select user_id, entity_id, payload, item_version
    from public.log_note_record_items
    where last_server_seq = 0
  loop
    v_operation_id := md5(item.user_id::text || ':record:' || item.entity_id || ':bootstrap')::uuid;
    insert into public.log_note_sync_changes (
      user_id, entity_type, entity_id, operation, payload, item_version, operation_id, device_id
    ) values (
      item.user_id, 'record', item.entity_id, 'upsert', item.payload,
      item.item_version, v_operation_id, null
    )
    on conflict (user_id, operation_id) do update set operation_id = excluded.operation_id
    returning server_seq into v_seq;

    update public.log_note_record_items
    set last_server_seq = v_seq
    where user_id = item.user_id and entity_id = item.entity_id and last_server_seq = 0;
  end loop;

  for item in
    select user_id, entity_id, payload, item_version
    from public.log_note_plan_items
    where last_server_seq = 0
  loop
    v_operation_id := md5(item.user_id::text || ':plan:' || item.entity_id || ':bootstrap')::uuid;
    insert into public.log_note_sync_changes (
      user_id, entity_type, entity_id, operation, payload, item_version, operation_id, device_id
    ) values (
      item.user_id, 'plan', item.entity_id, 'upsert', item.payload,
      item.item_version, v_operation_id, null
    )
    on conflict (user_id, operation_id) do update set operation_id = excluded.operation_id
    returning server_seq into v_seq;

    update public.log_note_plan_items
    set last_server_seq = v_seq
    where user_id = item.user_id and entity_id = item.entity_id and last_server_seq = 0;
  end loop;
end;
$$;
