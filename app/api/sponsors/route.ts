import {database} from "../_db";
export async function GET(){try{
  const sponsors=(await database().prepare("SELECT id,name,description,logo_url,instagram_url,created_at,updated_at FROM sponsors ORDER BY created_at,id").all()).results;
  return Response.json({success:true,sponsors},{headers:{"Cache-Control":"no-store"}});
}catch(e){console.error("[SPONSORS GET]",e);return Response.json({success:false,error:"Não foi possível carregar os patrocinadores."},{status:500})}}
