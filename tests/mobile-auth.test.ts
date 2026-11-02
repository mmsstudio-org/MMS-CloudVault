import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mobileRole,authorizeMobileStory,mobileId} from '../src/lib/mobile-auth';
const writer=mobileRole({role:'3 - PUBLISHER',name:'Writer',assignedCategoryIds:['cat-a']},'writer');
const admin=mobileRole({role:'1 - ADMIN'},'admin');
test('live account role policy rejects pending, disabled, missing and malformed roles',()=>{
 for(const account of [undefined,{role:'USER_PENDING'},{role:'PUBLISHER',disabled:true},{role:'3 - ADMIN'},{role:'unknown'}]) assert.throws(()=>mobileRole(account,'uid'));
 assert.equal(writer.uid,'writer');assert.equal(writer.name,'Writer');
});
test('existing story requires exact owner or admin, never client-supplied ownership',()=>{
 authorizeMobileStory(writer,{addedBy:'writer'},'cat-a');authorizeMobileStory(admin,{addedBy:'other'},'cat-a');
 assert.throws(()=>authorizeMobileStory(writer,{addedBy:'other'},'cat-a'));
});
test('new stories require assigned category even after an orphan upload',()=>{
 authorizeMobileStory(writer,undefined,'cat-a');
 assert.throws(()=>authorizeMobileStory(writer,undefined,'cat-b'));
 assert.throws(()=>authorizeMobileStory(writer,undefined,'cat-b','writer'));
 assert.throws(()=>authorizeMobileStory(writer,undefined,'cat-a','other'));
 authorizeMobileStory(writer,undefined,'','writer',true);
 assert.throws(()=>authorizeMobileStory(writer,undefined,'','other',true));
});
test('document IDs cannot traverse Firestore paths',()=>{
 for(const id of ['','../users/admin','abc/def','%2f','a b']) assert.throws(()=>mobileId(id));
 assert.equal(mobileId('uuid-123_a'),'uuid-123_a');
});
