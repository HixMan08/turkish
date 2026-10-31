import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { hash } from 'bcryptjs';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { createServer } from 'node:net';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/db.js';
import { readConfig } from '../src/env.js';
import { applicationSchema } from '../src/schemas.js';
import { seedContent } from '../prisma/seed.js';
const origin = 'http://localhost:5173';
let db: ReturnType<typeof createDatabase>; let socket: PGLiteSocketServer; let pglite: PGlite; let app: ReturnType<typeof createApp>; let databaseUrl = '';
const body = { name:'Тестовый ученик',phone:'+7 000 000 00 00',email:'test@example.test',language:'turkish',level:'A1',preferredFormat:'online',message:'Хочу изучать язык',source:'integration-test',consent:true,consentVersion:'2026-10-31',website:'' };
async function migration() { return await new Promise<{code:number;out:string}>(resolve=>execFile(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy','--schema','server/prisma/schema.prisma'],{cwd:fileURLToPath(new URL('../../',import.meta.url)),env:{...process.env,DATABASE_URL:databaseUrl},timeout:40000},(error,stdout,stderr)=>resolve({code:typeof error?.code==='number'?error.code:error?1:0,out:stdout+stderr}))); }
beforeAll(async()=>{
  const probe=createServer();await new Promise<void>(resolve=>probe.listen(0,'127.0.0.1',resolve));const address=probe.address();if(!address||typeof address==='string')throw Error('No test port');const port=address.port;await new Promise<void>((resolve,reject)=>probe.close(e=>e?reject(e):resolve()));
  pglite=await PGlite.create();socket=new PGLiteSocketServer({db:pglite,port,host:'127.0.0.1'});await socket.start();
  databaseUrl=`postgresql://test:test@127.0.0.1:${port}/asyl?schema=public&sslmode=disable`;
  const migrated=await migration();expect(migrated.code,migrated.out).toBe(0);const again=await migration();expect(again.code,again.out).toBe(0);
  db=createDatabase(databaseUrl, 1);await seedContent(db);await seedContent(db);
  await db.adminUser.create({data:{email:'admin@example.test',passwordHash:await hash('test-password-12345',12),role:'admin'}});
  app=createApp(db,readConfig({NODE_ENV:'test',APPLICATIONS_ENABLED:'true',DATABASE_URL:databaseUrl,SESSION_SECRET:'test-session-secret-at-least-32-characters',ALLOWED_ORIGINS:origin,LOG_LEVEL:'silent'}));
},90000);
beforeEach(async()=>{await db.adminSession.deleteMany();await db.rateLimitBucket.deleteMany();await db.application.deleteMany();});
afterAll(async()=>{await db?.$disconnect();await socket?.stop();await pglite?.close();},30000);
function apply(data:unknown=body,key=randomUUID()){return request(app).post('/api/applications').set('Origin',origin).set('X-Idempotency-Key',key).send(data);}
async function login(){const agent=request.agent(app);const response=await agent.post('/api/auth/login').set('Origin',origin).send({email:'admin@example.test',password:'test-password-12345'});expect(response.status).toBe(200);const json=response.body as {data:{csrfToken:string}};return {agent,csrf:json.data.csrfToken,cookies:response.headers['set-cookie']};}
describe('Database and public API',()=>{
  it('applies migration idempotently and seeds without duplicates',async()=>{expect(await db.program.count()).toBe(3);expect(await db.phrase.count()).toBe(4);expect(await db.review.count()).toBe(0);const result=await db.$queryRaw<{count:bigint}[]>`SELECT COUNT(*) AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;expect(Number(result[0]?.count)).toBe(1);});
  it('returns content with ETag and only published records',async()=>{const response=await request(app).get('/api/programs');expect(response.status).toBe(200);expect(response.headers['cache-control']).toContain('max-age=60');expect(response.headers.etag).toBeTruthy();expect((await request(app).get('/api/programs').set('If-None-Match',response.headers.etag as string)).status).toBe(304);expect((await request(app).get('/api/phrases?random=true')).body.data).toHaveLength(1);expect((await request(app).get('/api/reviews')).body.data).toHaveLength(0);});
  it('rejects missing consent, invalid phone, unknown fields and oversized body',async()=>{expect(applicationSchema.safeParse({...body,consent:false}).success).toBe(false);expect((await apply({...body,phone:'123'})).status).toBe(422);expect((await apply({...body,consent:false})).status).toBe(422);expect((await apply({...body,admin:true})).status).toBe(422);expect((await apply({...body,message:'a'.repeat(20000)})).status).toBe(413);expect(await db.application.count()).toBe(0);});
  it('stores application and notification atomically; timestamps consent on the server',async()=>{const response=await apply();expect(response.status).toBe(201);const item=await db.application.findFirstOrThrow();expect(item.name).toBe(body.name);expect(item.phone).toBe('70000000000');expect(item.status).toBe('new');expect(item.consentGivenAt.getTime()).toBeGreaterThan(Date.now()-10000);expect(await db.notificationOutbox.count()).toBe(1);expect(response.body.data.phone).toBeUndefined();});
  it('deduplicates retries and rejects changed payload under the same key',async()=>{const key=randomUUID();expect((await apply(body,key)).status).toBe(201);expect((await apply(body,key)).status).toBe(200);expect((await apply({...body,message:'Changed'},key)).status).toBe(409);expect(await db.application.count()).toBe(1);});
  it('limits submissions to five attempts per IP per hour',async()=>{for(let i=0;i<5;i++)expect((await apply()).status).toBe(201);const blocked=await apply();expect(blocked.status).toBe(429);expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);expect(await db.application.count()).toBe(5);});
  it('rejects foreign or missing Origin and silently discards honeypot submissions',async()=>{expect((await request(app).post('/api/applications').set('Origin','https://evil.example').send(body)).status).toBe(403);expect((await request(app).post('/api/applications').send(body)).status).toBe(403);expect((await apply({...body,website:'bot'})).status).toBe(202);expect(await db.application.count()).toBe(0);});
});
describe('Admin security and management',()=>{
  it('uses Secure cookies in production and enforces editor permissions',async()=>{
    const prod=createApp(db,readConfig({NODE_ENV:'production',DATABASE_URL:databaseUrl,SESSION_SECRET:'test-private-production-session-secret-32-characters',ALLOWED_ORIGINS:'https://asyl.example',SITE_URL:'https://asyl.example',LOG_LEVEL:'silent'}));
    const loginResponse=await request(prod).post('/api/auth/login').set('Origin','https://asyl.example').send({email:'admin@example.test',password:'test-password-12345'});
    expect(loginResponse.status).toBe(200);expect(String(loginResponse.headers['set-cookie'])).toContain('Secure');
    await db.adminUser.create({data:{email:'editor@example.test',passwordHash:await hash('editor-test-password',12),role:'editor'}});
    const agent=request.agent(app);const response=await agent.post('/api/auth/login').set('Origin',origin).send({email:'editor@example.test',password:'editor-test-password'});
    expect(response.status).toBe(200);const csrf=response.body.data.csrfToken as string;
    expect((await agent.get('/api/admin/applications')).status).toBe(200);
    expect((await agent.get('/api/admin/applications/export')).status).toBe(403);
    expect((await agent.post('/api/admin/reviews').set('Origin',origin).set('X-CSRF-Token',csrf).send({authorName:'Test',text:'Not a real review',rating:5,isPublished:false})).status).toBe(403);
  });
  it('rotates an aged session and expires invalidated tokens',async()=>{
    const {agent,cookies}=await login();await db.adminSession.updateMany({data:{createdAt:new Date(Date.now()-31*60000)}});
    expect((await agent.get('/api/auth/session')).status).toBe(200);
    expect(await db.adminSession.count()).toBe(1);
    const cookie=String(cookies).split(';')[0]??'';
    expect((await request(app).get('/api/auth/session').set('Cookie',cookie)).status).toBe(401);
    await db.adminSession.updateMany({data:{expiresAt:new Date(Date.now()-1000)}});
    expect((await agent.get('/api/auth/session')).status).toBe(401);
  });

  it('requires authentication and protects login from brute force',async()=>{expect((await request(app).get('/api/admin/applications')).status).toBe(401);for(let i=0;i<5;i++)expect((await request(app).post('/api/auth/login').set('Origin',origin).send({email:'admin@example.test',password:'wrong'})).status).toBe(401);expect((await request(app).post('/api/auth/login').set('Origin',origin).send({email:'admin@example.test',password:'wrong'})).status).toBe(429);});
  it('sets httpOnly session cookies, rotates login and invalidates logout',async()=>{const {agent,csrf,cookies}=await login();expect(String(cookies)).toContain('HttpOnly');expect(String(cookies)).toContain('SameSite=Lax');expect((await agent.get('/api/auth/session')).status).toBe(200);const first=await db.adminSession.findFirstOrThrow();expect(first.tokenHash).not.toBe(String(cookies).split('=')[1]?.split(';')[0]);const second=await agent.post('/api/auth/login').set('Origin',origin).send({email:'admin@example.test',password:'test-password-12345'});expect(second.status).toBe(200);expect(await db.adminSession.count()).toBe(1);expect((await agent.post('/api/auth/logout').set('Origin',origin).set('X-CSRF-Token',csrf)).status).toBe(403);expect((await agent.post('/api/auth/logout').set('Origin',origin).set('X-CSRF-Token',second.body.data.csrfToken as string)).status).toBe(204);expect((await agent.get('/api/admin/applications')).status).toBe(401);});
  it('blocks missing/incorrect CSRF and supports status, filters, CSV and deletion',async()=>{await apply({...body,message:'=HYPERLINK("https://example.test")'});const item=await db.application.findFirstOrThrow();const {agent,csrf}=await login();const route='/api/admin/applications/'+item.id+'/status';expect((await agent.patch(route).set('Origin',origin).send({status:'contacted'})).status).toBe(403);expect((await agent.patch(route).set('Origin',origin).set('X-CSRF-Token',csrf).send({status:'contacted'})).status).toBe(200);const list=await agent.get('/api/admin/applications?status=contacted&page=1&pageSize=1');expect(list.body.pagination.total).toBe(1);const csv=await agent.get('/api/admin/applications/export');expect(csv.status).toBe(200);expect(csv.text).toContain("'=HYPERLINK");expect((await agent.delete('/api/admin/applications/'+item.id).set('Origin',origin).set('X-CSRF-Token',csrf)).status).toBe(204);expect(await db.notificationOutbox.count()).toBe(0);});
  it('creates, updates, publishes and deletes managed content',async()=>{const {agent,csrf}=await login();const created=await agent.post('/api/admin/reviews').set('Origin',origin).set('X-CSRF-Token',csrf).send({authorName:'Тест',text:'Тестовый отзыв, не настоящий',rating:5,isPublished:false});expect(created.status).toBe(201);expect((await request(app).get('/api/reviews')).body.data).toHaveLength(0);const id=created.body.data.id as string;expect((await agent.put('/api/admin/reviews/'+id).set('Origin',origin).set('X-CSRF-Token',csrf).send({authorName:'Тест',text:'Тестовый отзыв, не настоящий',rating:4,isPublished:true})).status).toBe(200);expect((await request(app).get('/api/reviews')).body.data).toHaveLength(1);expect((await agent.delete('/api/admin/reviews/'+id).set('Origin',origin).set('X-CSRF-Token',csrf)).status).toBe(204);});
});
