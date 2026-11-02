import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {S3Client,PutObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import {sql} from 'drizzle-orm';
import {db} from '../src/db';
import {createHandler as uploadHandler} from '../src/lib/mobile-upload-handler';
import {createHandler as deleteHandler} from '../src/lib/mobile-delete-handler';
import {MobileServices} from '../src/lib/mobile-services';
import {mobileRole} from '../src/lib/mobile-auth';
if(!process.env.DATABASE_URL?.includes('mms_upload_reliability_test')) throw new Error('Isolated test DB required');
const original=S3Client.prototype.send;
const objects=new Set<string>();
Object.defineProperty(S3Client.prototype,'send',{writable:true,configurable:true,value:async(command:unknown)=>{
 if(command instanceof PutObjectCommand){objects.add(command.input.Key!);return {};}
 if(command instanceof DeleteObjectCommand){objects.delete(command.input.Key!);return {};}
 throw new Error('Unexpected S3 request');
}});
after(async()=>{
 S3Client.prototype.send=original;
 for(const table of ['telegram_outbox','media_assets','api_keys','storage_cleanup','storage_buckets']) await db.execute(sql.raw(`DELETE FROM ${table}`));
 await db.$client.end();
});
test('public gateway rejects requests without both Firebase credentials before any cloud operation',async()=>{
 const response=await uploadHandler()(new Request('http://localhost/api/mobile/v1/upload',{method:'POST'}));
 assert.equal(response.status,401);assert.equal(objects.size,0);
});
test('verified gateway binds ownership, ignores spoofed identity, checks category/owner and guards delete',async()=>{
 for(const table of ['telegram_outbox','media_assets','api_keys','storage_cleanup','storage_buckets']) await db.execute(sql.raw(`DELETE FROM ${table}`));
 process.env.MOBILE_STORAGE_APP_ID='gateway-app';
 await db.execute(sql`INSERT INTO storage_buckets(name,slug,endpoint,bucket_name,access_key_id,secret_access_key,is_default) VALUES('test','gateway','https://storage.invalid','test','fake','fake',true)`);
 await db.execute(sql`INSERT INTO api_keys(app_name,app_id,secret_key) VALUES('gateway','gateway-app','server-only-test-key')`);
 let user=mobileRole({role:'PUBLISHER',name:'Verified writer',assignedCategoryIds:['cat']},'writer');
 const documents: Record<string,Record<string,unknown>>={'categories-v2/cat':{deleting:false}};
 const services:MobileServices={authenticate:async()=>user,readDocument:async path=>documents[path]};
 const upload=uploadHandler(services), remove=deleteHandler(services);
 const image=await sharp({create:{width:4,height:4,channels:3,background:'#ff0000'}}).png().toBuffer();
 function request(category='cat',extra:Record<string,string>={}) {
  const form=new FormData();form.set('asset_id','doc');form.set('category_id',category);form.set('title','Title');
  form.set('file',new File([image],'a.png',{type:'image/png'}));
  form.set('uploader_name','Spoof');form.set('app_id','other-app');
  for(const [key,value] of Object.entries(extra))form.set(key,value);
  return new Request('http://localhost/api/mobile/v1/upload',{method:'POST',body:form});
 }
 assert.equal((await upload(request('unassigned'))).status,403);assert.equal(objects.size,0);
 const first=await upload(request());assert.equal(first.status,200);
 const data=(await first.json()).data;assert.equal(data.uploader_name,'Verified writer');assert.equal(data.app_id,'gateway-app');
 assert.equal((await db.execute(sql`SELECT uploader_uid FROM media_assets WHERE app_id='gateway-app'`)).rows[0].uploader_uid,'writer');
 user=mobileRole({role:'PUBLISHER',assignedCategoryIds:['cat']},'other');
 assert.equal((await upload(request())).status,403);
 user=mobileRole({role:'PUBLISHER',assignedCategoryIds:['cat']},'writer');
 documents['stories/doc']={addedBy:'other',categoryId:'cat',image:''};
 assert.equal((await upload(request())).status,403);
 documents['stories/doc']={addedBy:'writer',categoryId:'cat',image:data.public_url};
 const deletion=(expected:string)=>remove(new Request('http://localhost/api/mobile/v1/assets/doc?expected_url='+encodeURIComponent(expected),{method:'DELETE'}),{params:Promise.resolve({asset_id:'doc'})});
 assert.equal((await deletion('https://old.invalid/photo')).status,409);
 assert.equal((await deletion(data.public_url)).status,409);
 documents['stories/doc'].image='';
 assert.equal((await deletion(data.public_url)).status,200);
 assert.equal((await deletion(data.public_url)).status,200);
 assert.equal((await db.execute(sql`SELECT is_deleted FROM media_assets WHERE app_id='gateway-app'`)).rows[0].is_deleted,true);
});
