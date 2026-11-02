import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appCheckClaimError } from '../src/lib/app-check-validator';
const valid={iss:'https://firebaseappcheck.googleapis.com/12345',aud:['projects/12345'],sub:'1:12345:android:abc'};
const options={enforceAppCheck:true,firebaseProjectId:'12345',allowedAppIds:'1:12345:android:abc'};
test('accepts exact Firebase project audience issuer and app',()=>assert.equal(appCheckClaimError(valid,options),null));
test('rejects issuer, suffix audience, project and app mismatches',()=>{
 for(const altered of [{...valid,iss:'https://evil.invalid/12345'},{...valid,aud:['projects/912345']},{...valid,sub:'1:12345:android:ABC'},{...valid,iss:'https://firebaseappcheck.googleapis.com/999'}]) assert.ok(appCheckClaimError(altered,options));
 assert.ok(appCheckClaimError(valid,{...options,firebaseProjectId:'project-name'}));
});
