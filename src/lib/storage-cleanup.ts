import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { deleteObjectFromBucket, getBucketById } from './storage';

/** New object keys are unique and never reused. Referenced files are never removed. */
export async function scheduleStorageCleanup(executor: Pick<typeof db,'execute'>, bucketId: string, storageKey: string, delaySeconds = 0) {
  await executor.execute(sql`INSERT INTO storage_cleanup(bucket_id,storage_key,due_at) VALUES(${bucketId}::uuid,${storageKey},now()+${delaySeconds}*interval '1 second') ON CONFLICT(bucket_id,storage_key) DO UPDATE SET due_at=LEAST(storage_cleanup.due_at,excluded.due_at)`);
}

export async function drainStorageCleanup(limit = 20) {
  let deleted=0;
  let failed=0;
  for(let i=0;i<limit;i++) {
    const result=await db.transaction(async tx=>{
      const jobs=await tx.execute(sql`SELECT * FROM storage_cleanup WHERE due_at<=now() ORDER BY due_at FOR UPDATE SKIP LOCKED LIMIT 1`);
      const job=jobs.rows[0];
      if(!job) return 'empty';
      const references=await tx.execute(sql`SELECT id FROM media_assets WHERE bucket_id=${job.bucket_id as string}::uuid AND storage_key=${job.storage_key as string} LIMIT 1`);
      if(references.rows.length) {
        await tx.execute(sql`DELETE FROM storage_cleanup WHERE id=${job.id as string}::uuid`);
        return 'referenced';
      }
      const bucket=await getBucketById(String(job.bucket_id));
      const ok=bucket && await deleteObjectFromBucket(bucket,String(job.storage_key));
      if(ok) {await tx.execute(sql`DELETE FROM storage_cleanup WHERE id=${job.id as string}::uuid`);return 'deleted';}
      await tx.execute(sql`UPDATE storage_cleanup SET attempts=attempts+1,last_error='Storage deletion failed',due_at=now()+interval '10 minutes' WHERE id=${job.id as string}::uuid`);
      return 'failed';
    });
    if(result==='empty') break;
    if(result==='deleted') deleted++;
    if(result==='failed') failed++;
  }
  return {deleted,failed};
}
