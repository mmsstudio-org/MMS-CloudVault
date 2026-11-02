import { mobileServices, MobileServices } from './mobile-services';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { apiKeys, mediaAssets } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { processAndSaveAsset } from '@/lib/asset-manager';
import { authorizeMobileStory, isMobileAdmin, mobileId, MobileError } from '@/lib/mobile-auth';

export function createHandler(services: MobileServices = mobileServices) {
return async function POST(request: Request) {
  try {
    const user = await services.authenticate(request);
    const declared = Number(request.headers.get('content-length') || 0);
    if (declared > 5 * 1024 * 1024) throw new MobileError(413, 'Photo request too large');
    const form = await boundedPhotoForm(request);
    const id = mobileId(String(form.get('asset_id') || ''));
    const file = form.get('file');
    if (!(file instanceof File) || file.size > 4 * 1024 * 1024 || !['image/webp','image/jpeg','image/png'].includes(file.type))
      throw new MobileError(400, 'A photo up to 4 MB is required');
    const appId = process.env.MOBILE_STORAGE_APP_ID;
    if (!appId) throw new MobileError(503, 'Mobile storage application is not configured');
    const [application] = await db.select().from(apiKeys).where(and(eq(apiKeys.appId,appId),eq(apiKeys.isActive,true))).limit(1);
    if (!application) throw new MobileError(503, 'Storage application is unavailable');
    const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.appId,appId),eq(mediaAssets.assetId,id))).limit(1);
    const story = await services.readDocument(`stories/${id}`);
    const categoryId = !!story ? String(story?.categoryId || '') : String(form.get('category_id') || '');
    mobileId(categoryId);
    authorizeMobileStory(user, story, categoryId, asset?.uploaderUid);
    const category = await services.readDocument(`categories-v2/${categoryId}`);
    if (!category || category?.deleting === true) throw new MobileError(403, 'Category is unavailable');
    const result = await processAndSaveAsset({appId,assetId:id,ownerUid:user.uid,allowOwnerOverride:isMobileAdmin(user),
      title:String(form.get('title') || '').slice(0,300),folder:'story-covers',uploaderName:user.name,
      buffer:Buffer.from(await file.arrayBuffer()),fileName:file.name,mimeType:file.type,apiKey:application,appName:application.appName});
    return NextResponse.json({success:true,data:{asset_id:id,public_url:result.asset.publicUrl,app_id:appId,uploader_name:user.name}});
  } catch(error) {
    return NextResponse.json({success:false,error:error instanceof MobileError ? error.message : 'Mobile photo upload failed'}, {status:error instanceof MobileError ? error.status : 500});
  }
}

}

async function boundedPhotoForm(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new MobileError(400,'Photo body required');
  const parts: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 5 * 1024 * 1024) { await reader.cancel(); throw new MobileError(413,'Photo request too large'); }
      parts.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  return new Request('http://upload.local', {method:'POST',headers:{'content-type':request.headers.get('content-type') || ''},body:Buffer.concat(parts)}).formData();
}
