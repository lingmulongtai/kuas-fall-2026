import {mkdir,copyFile,cp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'dist');
if(path.dirname(output)!==root || path.basename(output)!=='dist')throw Error('Invalid build output');
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
// Publish only application assets. Notes, tests, local attachments and tooling
// are never part of the website's document root.
for(const name of ['index.html','style.css','app.js','effects.js','glass-materials.js','glass-renderer.js','rain.html'])
  await copyFile(path.join(root,name),path.join(output,name));
await cp(path.join(root,'handouts'),path.join(output,'handouts'),{recursive:true});
console.log('Static dashboard built in dist/');
