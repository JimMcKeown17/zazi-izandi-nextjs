import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync,readFileSync} from 'node:fs';
test('password document has an independent root with no Clerk or analytics provider',()=>{
 const root=existsSync('app/layout.tsx')?'app/layout.tsx':'app/(password)/layout.tsx';
 const source=readFileSync(root,'utf8');
 assert.doesNotMatch(source,/ClerkProvider|Analytics|next\/font\/google/);
 assert.match(source,/<html/);
 assert.equal(existsSync('app/(site)/layout.tsx'),true);
});
