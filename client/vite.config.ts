import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
export default defineConfig(({ mode, command })=>{
  const values: Record<string,string>={};
  for(const name of ['.env','.env.local',`.env.${mode}`,`.env.${mode}.local`]){const file=path.join(root,name);if(existsSync(file))Object.assign(values,parseEnv(readFileSync(file,'utf8')));}
  // Import only public client settings. The server's NODE_ENV never turns a build into a development bundle.
  for(const [key,value] of Object.entries(values))if(key.startsWith('VITE_')&&process.env[key]===undefined)process.env[key]=value;
  if(command==='build')process.env.NODE_ENV='production';
  return { envDir:false,base:process.env.VITE_BASE_PATH||'/',server:{proxy:{'/api':'http://127.0.0.1:3001'}} };
});
