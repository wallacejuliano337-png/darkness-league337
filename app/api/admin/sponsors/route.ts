import {can,database,getAdmin,logAdmin} from "../../_db";
import {sponsorFields} from "../../../sponsor-data";
async function write(r:Request){try{
  const origin=r.headers.get("origin");
  if(origin && origin!==new URL(r.url).origin)return Response.json({error:"Origem inválida"},{status:403});
  const admin=await getAdmin(r);
  if(!admin)return Response.json({error:"Entre novamente no Darkness Control."},{status:401});
  if(!can(admin,"settings.edit"))return Response.json({error:"Sem permissão para configurar patrocinadores."},{status:403});
  let body:any;try{body=await r.json()}catch{return Response.json({error:"Dados inválidos."},{status:400})}
  if(!body || typeof body!=="object")return Response.json({error:"Dados inválidos."},{status:400});
  const db=database(),id=r.method==="POST"?crypto.randomUUID():String(body.id||"");
  if(r.method!=="POST" && !await db.prepare("SELECT id FROM sponsors WHERE id=?").bind(id).first())return Response.json({error:"Patrocinador não encontrado."},{status:404});
  if(r.method==="DELETE"){
    await db.prepare("DELETE FROM sponsors WHERE id=?").bind(id).run();
    await logAdmin(admin,"REMOVEU PATROCINADOR","PATROCINADOR",id);
  }else{
    let fields;try{fields=sponsorFields(body)}catch(e){return Response.json({error:e instanceof Error?e.message:"Dados inválidos."},{status:400})}
    const {name,description,logo_url,instagram_url}=fields,now=Date.now();
    if(r.method==="POST")await db.prepare("INSERT INTO sponsors(id,name,description,logo_url,instagram_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").bind(id,name,description,logo_url,instagram_url,now,now).run();
    else await db.prepare("UPDATE sponsors SET name=?,description=?,logo_url=?,instagram_url=?,updated_at=? WHERE id=?").bind(name,description,logo_url,instagram_url,now,id).run();
    await logAdmin(admin,r.method==="POST"?"ADICIONOU PATROCINADOR":"EDITOU PATROCINADOR","PATROCINADOR",id,name);
  }
  return Response.json({success:true,id});
}catch(e){console.error("[SPONSORS WRITE]",e);return Response.json({error:"Não foi possível salvar a alteração. Tente novamente."},{status:500})}}
export const POST=write;
export const PATCH=write;
export const DELETE=write;
