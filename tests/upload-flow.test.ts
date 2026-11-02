import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import { processAndSaveAsset } from '../src/lib/asset-manager';
import { POST as completeUpload } from '../src/app/api/v1/upload/complete/route';
import { NextRequest } from 'next/server';
import { createUploadTicket } from '../src/lib/upload-ticket';

if (!process.env.DATABASE_URL?.includes('mms_upload_reliability_test')) throw new Error('Isolated test DB required');
const originalSend = S3Client.prototype.send;
const objects = new Map<string,Buffer>();
let failPut = false;
let failDelete = false;
// Replace only S3 transport; exercise real optimizer, DB transactions and API handlers.
Object.defineProperty(S3Client.prototype,'send',{writable:true,configurable:true,value:async (command: {input: {Key: string; Body?: Buffer}}) => {
  if (command instanceof PutObjectCommand) { if(failPut) throw new Error('Simulated S3 outage'); objects.set(command.input.Key!, command.input.Body as Buffer); return {}; }
  if (command instanceof DeleteObjectCommand) { if(failDelete) throw new Error('Simulated deletion outage'); objects.delete(command.input.Key!); return {}; }
  if (command instanceof HeadObjectCommand) { const body=objects.get(command.input.Key!); if(!body) throw new Error('NotFound'); return {ContentLength:body.length,ContentType:'image/webp'}; }
  throw new Error('Unexpected S3 command');
}});
let bucketId: string;
after(async () => {
  S3Client.prototype.send=originalSend;
  await db.execute(sql`DELETE FROM telegram_outbox`);
  await db.execute(sql`DELETE FROM media_assets`);
  await db.execute(sql`DELETE FROM api_keys`);
  await db.execute(sql`DELETE FROM storage_cleanup`);
  await db.execute(sql`DELETE FROM storage_buckets`);
  await db.$client.end();
});

test('real upload safely replaces across folders, serializes concurrent requests and preserves old file on failure',async()=>{
  await db.execute(sql`DELETE FROM telegram_outbox`);
  await db.execute(sql`DELETE FROM media_assets`);
  await db.execute(sql`DELETE FROM api_keys`);
  await db.execute(sql`DELETE FROM storage_cleanup`);
  await db.execute(sql`DELETE FROM storage_buckets`);
  await db.execute(sql`DELETE FROM site_settings`);
  const result=await db.execute(sql`INSERT INTO storage_buckets(name,slug,endpoint,bucket_name,access_key_id,secret_access_key,is_default) VALUES('Test','test','https://s3.example.invalid','test','fake','fake',true) RETURNING id`);
  bucketId=String(result.rows[0].id);
  const buffer=await sharp({create:{width:8,height:8,channels:3,background:'#f00'}}).png().toBuffer();
  const upload=(folder:string)=>processAndSaveAsset({appId:'test-app',assetId:'cover',folder,buffer,mimeType:'image/png',fileName:'cover.png'});
  const first=await upload('covers');
  assert.ok(objects.has(first.asset.storageKey));
  const second=await upload('banners');
  assert.equal(first.asset.id,second.asset.id);
  assert.equal(second.isReplaced,true);
  assert.equal(objects.has(first.asset.storageKey),false);
  failPut=true;
  await assert.rejects(upload('failed'),/outage/);
  failPut=false;
  assert.ok(objects.has(second.asset.storageKey));
  const concurrent=await Promise.all([upload('one'),upload('two'),upload('three')]);
  const current=(await db.execute(sql`SELECT * FROM media_assets WHERE app_id='test-app' AND asset_id='cover'`)).rows;
  assert.equal(current.length,1);
  assert.equal(objects.size,1);
  assert.ok(objects.has(String(current[0].storage_key)));
  assert.ok(concurrent.every(r=>r.asset.id===first.asset.id));
  assert.equal((await db.execute(sql`SELECT count(*) FROM telegram_outbox`)).rows[0].count,'5');
  // Fail the DB write after physical upload; its new object must be removed.
  await db.execute(sql`CREATE OR REPLACE FUNCTION reject_test_upload() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.folder='reject' THEN RAISE EXCEPTION 'Simulated DB failure'; END IF; RETURN NEW; END $$`);
  await db.execute(sql`CREATE TRIGGER reject_test_upload BEFORE UPDATE ON media_assets FOR EACH ROW EXECUTE FUNCTION reject_test_upload()`);
  try {await assert.rejects(upload('reject')); assert.equal(objects.size,1);}
  finally { await db.execute(sql`DROP TRIGGER reject_test_upload ON media_assets`); await db.execute(sql`DROP FUNCTION reject_test_upload()`); }
});

test('cleanup retries failed deletion and never deletes a referenced object', async()=>{
  const { scheduleStorageCleanup, drainStorageCleanup } = await import('../src/lib/storage-cleanup');
  const current=(await db.execute(sql`SELECT storage_key FROM media_assets LIMIT 1`)).rows[0];
  await scheduleStorageCleanup(db,bucketId,String(current.storage_key));
  await drainStorageCleanup();
  assert.ok(objects.has(String(current.storage_key)));
  objects.set('orphan',Buffer.from('orphan'));
  await scheduleStorageCleanup(db,bucketId,'orphan');
  failDelete=true;
  assert.equal((await drainStorageCleanup()).failed,1);
  assert.ok(objects.has('orphan'));
  failDelete=false;
  await db.execute(sql`UPDATE storage_cleanup SET due_at=now() WHERE storage_key='orphan'`);
  assert.equal((await drainStorageCleanup()).deleted,1);
  assert.equal(objects.has('orphan'),false);
});

test('real direct completion rejects missing objects/tampered tickets and matches same app+asset across folders',async()=>{
  process.env.AUTH_SECRET='isolated-test-secret';
  await db.execute(sql`INSERT INTO api_keys(app_name,app_id,secret_key,default_bucket_id) VALUES('Test','direct-app','test-key',${bucketId}::uuid)`);
  const key='direct-app/audio/cover-'+crypto.randomUUID()+'.webp';
  const publicUrl='https://s3.example.invalid/test/'+key;
  const fields={appId:'direct-app',assetId:'cover',storageKey:key,publicUrl,bucketId};
  const token=await createUploadTicket(fields);
  const body={app_id:'ignored',asset_id:'cover',storage_key:key,public_url:publicUrl,bucket_id:bucketId,upload_token:token,folder:'first'};
  const request=(payload:object)=>new NextRequest('http://localhost/api/v1/upload/complete',{method:'POST',headers:{'content-type':'application/json','x-api-key':'test-key'},body:JSON.stringify(payload)});
  assert.equal((await completeUpload(request({...body,asset_id:'other'}))).status,403);
  assert.equal((await completeUpload(request(body))).status,400);
  objects.set(key,Buffer.from('image'));
  const first=await completeUpload(request(body)); assert.equal(first.status,200);
  const data=(await first.json()).data;
  assert.equal(data.mime_type,'image/webp');
  const duplicate=await completeUpload(request({...body,folder:'changed'})); assert.equal(duplicate.status,200);
  assert.equal((await duplicate.json()).data.folder,'first');
  assert.equal((await db.execute(sql`SELECT count(*) FROM telegram_outbox WHERE event_key LIKE 'upload:direct-app:%'`)).rows[0].count,'1');
  const newKey='direct-app/new-'+crypto.randomUUID()+'.webp';
  objects.set(newKey,Buffer.from('new image'));
  const newFields={...fields,storageKey:newKey,publicUrl:'https://s3.example.invalid/test/'+newKey};
  const newToken=await createUploadTicket(newFields);
  const replacement=await completeUpload(request({...body,storage_key:newKey,public_url:newFields.publicUrl,upload_token:newToken,folder:'second'}));
  assert.equal(replacement.status,200);
  assert.equal((await replacement.json()).data.id,data.id);
  assert.equal(objects.has(key),false);
  // Even if an old signed PUT is replayed to re-create old bytes, completion cannot resurrect it.
  objects.set(key,Buffer.from('replayed old image'));
  assert.equal((await completeUpload(request(body))).status,200);
  const current=(await db.execute(sql`SELECT storage_key FROM media_assets WHERE app_id='direct-app'`)).rows[0];
  assert.equal(current.storage_key,newKey);
  assert.ok(objects.has(newKey));
});
