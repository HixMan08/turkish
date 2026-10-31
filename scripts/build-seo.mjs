import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));dotenv.config({path:path.join(root,'.env')});
const output=path.join(root,'client/dist');const base=process.env.VITE_BASE_PATH||'/';const site=(process.env.VITE_SITE_URL||process.env.SITE_URL||'http://localhost:3001').replace(/\/$/,'');
const url=new URL(site);if(!['http:','https:'].includes(url.protocol))throw new Error('Invalid public site URL');
let html=await fs.readFile(path.join(output,'index.html'),'utf8');
html=html.replaceAll('https://merhaba-adik-school.fairpalm.chatgpt.site',site);
const organization={ '@context':'https://schema.org','@type':'EducationalOrganization',name:'ASYL Language School',url:site+'/',availableLanguage:['ru','kk','tr'] };
html=html.replace('</head>',`<script type="application/ld+json">${JSON.stringify(organization).replaceAll('<','\\u003c')}</script></head>`);
await fs.writeFile(path.join(output,'index.html'),html);
await fs.writeFile(path.join(output,'404.html'),html.replace('</head>','<meta name="robots" content="noindex,nofollow"></head>'));
for(const route of ['privacy','cookies','terms','admin','error']){const dir=path.join(output,route);await fs.mkdir(dir,{recursive:true});let page=html.replace(/<title>[^<]*<\/title>/,`<title>${route==='privacy'?'Политика конфиденциальности':route==='cookies'?'Политика cookies':route==='terms'?'Условия использования':route==='admin'?'Админка':'Ошибка'} — ASYL</title>`).replace(`rel="canonical" href="${site}"`,`rel="canonical" href="${site}/${route}"`);if(route==='admin'||route==='error')page=page.replace('</head>','<meta name="robots" content="noindex,nofollow"></head>');await fs.writeFile(path.join(dir,'index.html'),page);}
await fs.writeFile(path.join(output,'robots.txt'),`User-agent: *\nAllow: ${base}\nDisallow: ${base}admin\nDisallow: /api/\nSitemap: ${site}/sitemap.xml\n`);
await fs.writeFile(path.join(output,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['','/privacy','/cookies','/terms'].map(route=>`<url><loc>${site+route}/</loc></url>`).join('')}</urlset>`);
console.log('SEO files and route entrypoints generated');
