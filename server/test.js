import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
test('API: auth, checkout atomicity, duplicate quantities, persistence',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'todo-test-'));const port=3948;
 let child;async function start(){child=spawn(process.execPath,['index.js'],{cwd:import.meta.dirname,env:{...process.env,PORT:String(port),DB_PATH:path.join(dir,'test.sqlite')},stdio:'pipe'});await new Promise((resolve,reject)=>{child.stdout.on('data',resolve);child.on('error',reject);child.on('exit',code=>{if(code)reject(Error('Server exited '+code))})});}
 async function stop(){const c=child;await new Promise(resolve=>{c.once('exit',resolve);c.kill()})}
 async function call(route,body,token,method=body?'POST':'GET'){const r=await fetch('http://localhost:'+port+'/api/'+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
 try{await start();assert.equal((await call('products')).data.length,12);assert.equal((await call('products',{name:'x'})).status,401);assert.equal((await call('login',{password:'wrong'})).status,401);const token=(await call('login',{password:'demo'})).data.token;
 assert.equal((await call('checkout',{items:[{id:1,qty:1},{id:10,qty:1}]})).status,400);assert.equal((await call('products')).data[0].stock,8);
 assert.equal((await call('checkout',{items:[{id:1,qty:5},{id:1,qty:5}]})).status,400);assert.equal((await call('products')).data[0].stock,8);
 assert.equal((await call('checkout',{items:[{id:1,qty:2}]})).data.total,179800);assert.equal((await call('products')).data[0].stock,6);
 assert.equal((await call('products/1',{stock:-1},token,'PATCH')).status,400);
 const created=await call('products',{name:'Prueba',category:'Herramientas',price:100,stock:4,image:'taladro.png'},token);assert.equal(created.status,201);
 await stop();await start();assert.equal((await call('products')).data[0].stock,6);assert.equal((await call('products')).data.length,13);
 }finally{if(child?.exitCode===null)await stop();rmSync(dir,{recursive:true,force:true});}
});
