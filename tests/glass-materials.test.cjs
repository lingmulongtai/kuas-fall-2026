const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const materials=require('../glass-materials.js');
test('all six reference presets retain the original optical parameters',()=>{
 assert.deepEqual(materials.presets.map(p=>p.id),['apple','apple-clear','thick','frosted','clear','prism']);
 const actual=crypto.createHash('sha256').update(JSON.stringify(materials.presets)).digest('hex');
 assert.equal(actual,'b8c157e44622e9d6980d77bd0974919686df9471626dad45e59ea1ff13699ee7');
 assert.ok(materials.presets.every(p=>Object.isFrozen(p.p)));
});
test('reference vertex, cover, Gaussian and glass shaders remain byte-for-byte unchanged',()=>{
 const expected={
  "VERT": "c3b9e50cba634644cfaaa56cf5538bd3c9e4e376196879e898be2f3a0d3f9c87",
  "COVER": "f8bee9bcfa46e9cf835d917afd6ed957670ccfa804fd559646e24c9edd090316",
  "BLUR": "ac499d2ee81019ad14d59ccad8c1182f49a085abe56742ca148843c1891c9466",
  "GLASS": "50efd52277b63a7ba13a1bd22b5b7b43628216af14462162d64c0e4269991667"
};
 for(const [key,value] of Object.entries(materials.shaders()))
 assert.equal(crypto.createHash('sha256').update(value).digest('hex'),expected[key],key);
 assert.match(materials.shaders(48).GLASS,/#define MAXS 48/);
});
