import initSqlJs from 'sql.js';
import fs from 'node:fs';
const SQL=await initSqlJs();
export class Database{
 constructor(file){this.file=file;this.db=new SQL.Database(fs.existsSync(file)?fs.readFileSync(file):undefined);this.depth=0;}
 persist(){if(!this.depth){const temp=this.file+'.tmp';fs.writeFileSync(temp,this.db.export());fs.renameSync(temp,this.file);}}
 pragma(){}
 exec(sql){this.db.run(sql);this.persist();}
 prepare(sql){const self=this;function bind(args){if(args.length===1&&typeof args[0]==='object'){const o={};for(const [k,v] of Object.entries(args[0]))o['@'+k]=v;return o;}return args;}
 return {all(...args){const stmt=self.db.prepare(sql);try{stmt.bind(bind(args));const rows=[];while(stmt.step())rows.push(stmt.getAsObject());return rows;}finally{stmt.free();}},get(...args){return this.all(...args)[0];},run(...args){self.db.run(sql,bind(args));const id=self.db.exec('SELECT last_insert_rowid() id')[0].values[0][0];self.persist();return {lastInsertRowid:id};}};}
 transaction(fn){return (...args)=>{this.db.run('BEGIN');this.depth++;try{const result=fn(...args);this.db.run('COMMIT');this.depth--;this.persist();return result;}catch(e){this.db.run('ROLLBACK');this.depth--;throw e;}};}
}
