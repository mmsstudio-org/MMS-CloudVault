import { mobileServices, MobileServices } from './mobile-services';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { apiKeys, mediaAssets } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { authorizeMobileStory, mobileId, MobileError } from '@/lib/mobile-auth';
import { enqueueTelegramNotification } from '@/lib/telegram';

export function createHandler(services: MobileServices = mobileServices) {
return async function DELETE(request: Request, {params}: {params:Promise<{asset_id:string}>}) {
  try {
    const user = await services.authenticate(request);
    const id = mobileId((await params).asset_id);
    const appId = process.env.MOBILE_STORAGE_APP_ID;
    if (!appId) throw new MobileError(503,'Storage application is not configured');
    const [application] = await db.select().from(apiKeys).where(and(eq(apiKeys.appId,appId),eq(apiKeys.isActive,true))).limit(1);
    if (!application) throw new MobileError(503,'Storage application is unavailable');
    const expected = new URL(request.url).searchParams.get('expected_url');
    if (!expected) throw new MobileError(400,'Expected photo URL is required');
    const story = await services.readDocument(`stories/${id}`);
    return await db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify([appId,id])},0))`);
      const [asset] = await tx.select().from(mediaAssets).where(and(eq(mediaAssets.appId,appId),eq(mediaAssets.assetId,id))).limit(1);
      if (!asset) throw new MobileError(404,'Photo not found');
      if (!story && !asset.uploaderUid) throw new MobileError(403,'Legacy asset requires dashboard cleanup');
      authorizeMobileStory(user,story,'',asset.uploaderUid,true);
      if (asset.publicUrl !== expected) throw new MobileError(409,'Obsolete cleanup skipped');
      if (story?.image === asset.publicUrl) throw new MobileError(409,'Photo is still active on the story');
      if (!asset.isDeleted) {
        await tx.update(mediaAssets).set({isDeleted:true,deletedAt:new Date(),updatedAt:new Date()}).where(eq(mediaAssets.id,asset.id));
        await enqueueTelegramNotification(tx,{eventKey:`mobile-delete:${asset.id}:${asset.storageKey}`,event:'ASSET_SOFT_DELETED',appName:appId,assetId:id,title:asset.title||'',publicUrl:asset.publicUrl});
      }
      return NextResponse.json({success:true});
    });
  } catch(error) {
    return NextResponse.json({success:false,error:error instanceof MobileError?error.message:'Mobile photo deletion failed'},{status:error instanceof MobileError?error.status:500});
  }
}

}
