import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));const target=path.join(root,'.env');
try{const content=await fs.readFile(path.join(root,'.env.example'),'utf8');const password=randomBytes(24).toString('hex');await fs.writeFile(target,content.replaceAll('replace_with_a_long_random_password',password).replace('replace_with_at_least_32_random_characters',randomBytes(32).toString('hex')),{flag:'wx',mode:0o600});console.log('.env created with private random local secrets. Existing files were not overwritten.');}catch(e){if(e&&typeof e==='object'&&'code'in e&&e.code==='EEXIST')console.log('.env already exists; left unchanged.');else throw e;}
