import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { Pool } from 'pg';
import { createUploadTicket, verifyUploadTicket } from '../src/lib/upload-ticket';

const url = process.env.DATABASE_URL;
if (!url || !url.includes('mms_upload_reliability_test')) throw new Error('Use the isolated reliability test database.');
const pool = new Pool({ connectionString: url });
after(() => pool.end());

test('upload ticket rejects app, asset, bucket, key and URL tampering', async () => {
  process.env.AUTH_SECRET = 'isolated-test-secret-with-sufficient-length';
  const values = { appId: 'app-one', assetId: 'cover', storageKey: 'one/cover-uuid.webp', publicUrl: 'https://example.com/one.webp', bucketId: crypto.randomUUID() };
  const token = await createUploadTicket(values);
  assert.equal(await verifyUploadTicket(token, values), true);
  for (const field of Object.keys(values)) {
    assert.equal(await verifyUploadTicket(token, { ...values, [field]: 'tampered' }), false, field);
  }
  assert.equal(await verifyUploadTicket(token + 'broken', values), false);
});

test('durable event survives worker failure and duplicate insertion is ignored', async () => {
  const event = crypto.randomUUID();
  const first = await pool.query('INSERT INTO telegram_outbox(event_key,payload) VALUES ($1,$2) RETURNING id', [event, JSON.stringify({event:'ASSET_UPLOADED',appName:'test'})]);
  await pool.query('INSERT INTO telegram_outbox(event_key,payload) VALUES ($1,$2) ON CONFLICT(event_key) DO NOTHING', [event, '{}']);
  assert.equal((await pool.query('SELECT count(*) FROM telegram_outbox WHERE event_key=$1',[event])).rows[0].count,'1');
  await pool.query("UPDATE telegram_outbox SET status='sending', lease_until=now()-interval '1 second' WHERE event_key=$1",[event]);
  assert.equal((await pool.query("SELECT id FROM telegram_outbox WHERE status='sending' AND lease_until < now() AND event_key=$1",[event])).rows[0].id,first.rows[0].id);
  await pool.query('DELETE FROM telegram_outbox WHERE event_key=$1',[event]);
});

test('app and asset unique identity ignores folder', async () => {
  const app = `test-${crypto.randomUUID()}`;
  try {
    await pool.query('INSERT INTO media_assets(app_id,asset_id,folder,storage_key,public_url) VALUES($1,$2,$3,$4,$5)',[app,'cover','covers','key-one','https://example.com/one']);
    await assert.rejects(pool.query('INSERT INTO media_assets(app_id,asset_id,folder,storage_key,public_url) VALUES($1,$2,$3,$4,$5)',[app,'cover','banners','key-two','https://example.com/two']),{code:'23505'});
    await pool.query('INSERT INTO media_assets(app_id,asset_id,folder,storage_key,public_url) VALUES($1,$2,$3,$4,$5)',[app+'-other','cover','covers','key-three','https://example.com/three']);
    assert.equal((await pool.query('SELECT count(*) FROM media_assets WHERE app_id IN ($1,$2)',[app,app+'-other'])).rows[0].count,'2');
  } finally { await pool.query('DELETE FROM media_assets WHERE app_id IN ($1,$2)',[app,app+'-other']); }
});

test('actual Telegram worker retries rate limits, records message ID and deduplicates events', async () => {
  const { enqueueTelegramNotification, drainTelegramOutbox } = await import('../src/lib/telegram');
  const { db } = await import('../src/db');
  const originalFetch = globalThis.fetch;
  const event = `worker-${crypto.randomUUID()}`;
  try {
    await pool.query("DELETE FROM telegram_outbox");
    await pool.query("INSERT INTO site_settings(telegram_notifications_enabled,telegram_bot_token,telegram_chat_id) VALUES(true,'test-token','test-chat')");
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response(JSON.stringify(calls === 1 ? {ok:false,description:'Too Many Requests',parameters:{retry_after:120}} : {ok:true,result:{message_id:1234}}), {status:calls === 1 ? 429 : 200});
    };
    const payload = {eventKey:event,event:'ASSET_UPLOADED' as const,appName:'Test',assetId:'cover'};
    await db.transaction(async tx => { await enqueueTelegramNotification(tx,payload); });
    await enqueueTelegramNotification(db,payload);
    assert.deepEqual(await drainTelegramOutbox(1),{sent:0,failed:1});
    let row = (await pool.query('SELECT * FROM telegram_outbox WHERE event_key=$1',[event])).rows[0];
    assert.equal(row.status,'pending');
    assert.match(row.last_error,/429/);
    assert.ok(row.next_attempt_at.getTime() > Date.now()+110000);
    assert.deepEqual(await drainTelegramOutbox(1),{sent:0,failed:0});
    assert.equal(calls,1);
    await pool.query('UPDATE telegram_outbox SET next_attempt_at=now() WHERE event_key=$1',[event]);
    assert.deepEqual(await drainTelegramOutbox(1),{sent:1,failed:0});
    row = (await pool.query('SELECT * FROM telegram_outbox WHERE event_key=$1',[event])).rows[0];
    assert.equal(row.message_id,'1234');
    assert.equal(row.attempts,2);
    assert.equal(row.last_error,null);
    await enqueueTelegramNotification(db,payload);
    await drainTelegramOutbox(1);
    assert.equal(calls,2);

    // Reclaim an interrupted worker and deliver multiple queued events.
    await pool.query('DELETE FROM telegram_outbox');
    for (const name of ['one','two']) await enqueueTelegramNotification(db,{...payload,eventKey:name});
    await pool.query("UPDATE telegram_outbox SET status='sending',lease_until=now()-interval '1 second' WHERE event_key='one'");
    assert.deepEqual(await drainTelegramOutbox(2),{sent:2,failed:0});
    assert.equal(calls,4);
    // Disabled settings defer without consuming attempts or calling the network.
    await pool.query('DELETE FROM telegram_outbox');
    await pool.query('UPDATE site_settings SET telegram_notifications_enabled=false');
    await enqueueTelegramNotification(db,{...payload,eventKey:'disabled'});
    await drainTelegramOutbox(1);
    row=(await pool.query("SELECT * FROM telegram_outbox WHERE event_key='disabled'")).rows[0];
    assert.equal(row.attempts,0);
    assert.equal(row.status,'pending');
    assert.equal(calls,4);
    // Transport timeout is retryable; exhausted attempts become auditable failures.
    await pool.query('DELETE FROM telegram_outbox');
    await pool.query('UPDATE site_settings SET telegram_notifications_enabled=true');
    globalThis.fetch=async()=>{throw new DOMException('Timed out','TimeoutError');};
    await enqueueTelegramNotification(db,{...payload,eventKey:'timeout'});
    await pool.query("UPDATE telegram_outbox SET attempts=9 WHERE event_key='timeout'");
    assert.deepEqual(await drainTelegramOutbox(1),{sent:0,failed:1});
    row=(await pool.query("SELECT * FROM telegram_outbox WHERE event_key='timeout'")).rows[0];
    assert.equal(row.status,'failed');
    assert.equal(row.attempts,10);
    assert.match(row.last_error,/TimeoutError/);
  } finally {
    globalThis.fetch = originalFetch;
    await pool.query('DELETE FROM telegram_outbox');
    await pool.query('DELETE FROM site_settings');
    await db.$client.end();
  }
});
