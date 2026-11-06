import express from 'express';
import {Database} from './sqlite.js';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import crypto from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url));
const db=new Database(process.env.DB_PATH || path.join(here,'mercadolocal.sqlite'));
db.pragma('journal_mode = WAL');
db.exec('CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, price INTEGER NOT NULL, stock INTEGER NOT NULL, image TEXT, unit TEXT, description TEXT, featured INTEGER DEFAULT 0); CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, created TEXT NOT NULL, total INTEGER NOT NULL, items TEXT NOT NULL)');
if(!db.prepare('SELECT count(*) n FROM products').get().n){const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(here,'../frontend/seed.js'),'utf8'),context);const insert=db.prepare('INSERT INTO products (id,name,category,price,stock,image,unit,description,featured) VALUES (@id,@name,@category,@price,@stock,@image,@unit,@description,@featured)');db.transaction(()=>context.window.SEED_PRODUCTS.forEach(p=>insert.run({...p,featured:+!!p.featured})))();}
const app=express();app.use(express.json({limit:'100kb'}));
app.use((req,res,next)=>{res.set('Access-Control-Allow-Origin','*');res.set('Access-Control-Allow-Headers','Content-Type, Authorization');res.set('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS');if(req.method==='OPTIONS')return res.sendStatus(204);next();});
const sessions=new Set();const auth=(req,res,next)=>sessions.has(req.headers.authorization?.replace('Bearer ',''))?next():res.status(401).json({error:'Ingresá con la clave del vendedor.'});
app.get('/api/health',(req,res)=>res.json({ok:true}));
app.get('/api/products',(req,res)=>res.json(db.prepare('SELECT * FROM products ORDER BY id').all()));
app.post('/api/login',(req,res)=>{if(req.body.password!=='demo')return res.status(401).json({error:'La clave no es correcta. Probá con demo.'});const token=crypto.randomUUID();sessions.add(token);res.json({token});});
function valid(p){return typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=120&&['Herramientas','Pinturas','Tornillería','Jardín','Cerrajería'].includes(p.category)&&Number.isSafeInteger(p.price)&&p.price>0&&Number.isSafeInteger(p.stock)&&p.stock>=0&&p.stock<=100000;}
app.post('/api/products',auth,(req,res)=>{const p=req.body;if(!valid(p))return res.status(400).json({error:'Revisá nombre, precio y stock.'});const r=db.prepare('INSERT INTO products(name,category,price,stock,image,unit,description) VALUES(?,?,?,?,?,?,?)').run(p.name.trim(),p.category,p.price,p.stock,['taladro.png','pintura.png','tornillos.png','manguera.png','candado.png'].includes(p.image)?p.image:'taladro.png',String(p.unit||'unidad').slice(0,80),String(p.description||'').slice(0,1000));res.status(201).json({id:r.lastInsertRowid});});
app.patch('/api/products/:id',auth,(req,res)=>{const p=db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Producto inexistente.'});const next={...p,...req.body};if(!valid(next))return res.status(400).json({error:'Revisá precio y stock.'});db.prepare('UPDATE products SET name=?,category=?,price=?,stock=?,description=? WHERE id=?').run(next.name,next.category,next.price,next.stock,String(next.description||'').slice(0,1000),p.id);res.json({ok:true});});
app.post('/api/checkout',(req,res)=>{try{const result=db.transaction(()=>{const items=req.body.items;if(!Array.isArray(items)||!items.length||items.length>100)throw Error('El carrito está vacío o es inválido.');const merged=new Map();for(const i of items){if(!Number.isSafeInteger(i.id)||!Number.isSafeInteger(i.qty)||i.qty<1||i.qty>10000)throw Error('Cantidad inválida.');merged.set(i.id,(merged.get(i.id)||0)+i.qty);}let total=0;const lines=[];for(const [id,qty] of merged){const p=db.prepare('SELECT * FROM products WHERE id=?').get(id);if(!p||p.stock<qty)throw Error('No alcanza el stock. Actualizá el carrito.');total+=p.price*qty;lines.push({id,name:p.name,qty,price:p.price});db.prepare('UPDATE products SET stock=stock-? WHERE id=?').run(qty,id);}const order=db.prepare('INSERT INTO orders(created,total,items) VALUES(?,?,?)').run(new Date().toISOString(),total,JSON.stringify(lines));return {id:order.lastInsertRowid,total};})();res.json(result);}catch(e){res.status(400).json({error:e.message});}});
app.use(express.static(path.join(here,'../frontend')));
app.use((err,req,res,next)=>res.status(400).json({error:'No pudimos procesar la solicitud.'}));
app.listen(process.env.PORT||3847,'0.0.0.0',()=>console.log('TodoHierro en http://localhost:'+(process.env.PORT||3847)));
