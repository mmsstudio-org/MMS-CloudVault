import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT, generateKeyPair, exportJWK } from 'jose';
import { appCheckClaimError, validateAppCheckToken } from '../src/lib/app-check-validator';
const valid={iss:'https://firebaseappcheck.googleapis.com/12345',aud:['projects/12345'],sub:'1:12345:android:abc'};
const options={enforceAppCheck:true,firebaseProjectId:'12345',allowedAppIds:'1:12345:android:abc'};
test('accepts exact Firebase project audience issuer and app',()=>assert.equal(appCheckClaimError(valid,options),null));
test('rejects issuer, suffix audience, project and app mismatches',()=>{
 for(const altered of [{...valid,iss:'https://evil.invalid/12345'},{...valid,aud:['projects/912345']},{...valid,sub:'1:12345:android:ABC'},{...valid,iss:'https://firebaseappcheck.googleapis.com/999'}]) assert.ok(appCheckClaimError(altered,options));
 assert.ok(appCheckClaimError(valid,{...options,firebaseProjectId:'project-name'}));
});


test('App Check verifies real signatures, expiry, project and app claims',async()=>{
  const {publicKey,privateKey}=await generateKeyPair('RS256');
  const jwk={...await exportJWK(publicKey),kid:'isolated-test-key',alg:'RS256',use:'sig'};
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({keys:[jwk]}),{headers:{'Content-Type':'application/json'}});
  const token=(claims:Record<string,unknown>={},expiry='2m')=>new SignJWT({...valid,...claims})
    .setProtectedHeader({alg:'RS256',kid:jwk.kid}).setIssuedAt().setExpirationTime(expiry).sign(privateKey);
  try {
    assert.equal((await validateAppCheckToken(undefined,{enforceAppCheck:false})).isValid,true);
    assert.equal((await validateAppCheckToken(undefined,options)).isValid,false);
    assert.equal((await validateAppCheckToken(await token(),options)).isValid,true);
    for(const claims of [{iss:'https://evil.invalid/12345'},{aud:['projects/999']},{sub:'wrong-app'}])
      assert.equal((await validateAppCheckToken(await token(claims),options)).isValid,false);
    assert.equal((await validateAppCheckToken(await token({},'-1s'),options)).isValid,false);
    const other=await generateKeyPair('RS256');
    const forged=await new SignJWT(valid).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setIssuedAt().setExpirationTime('2m').sign(other.privateKey);
    assert.equal((await validateAppCheckToken(forged,options)).isValid,false);
  } finally { globalThis.fetch=originalFetch; }
});
