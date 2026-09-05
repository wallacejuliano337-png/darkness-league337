export type Sponsor = {id:string;name:string;description:string;logo_url:string;instagram_url:string;created_at:number;updated_at:number};
export function instagramUrl(value:string){
  let username=value.trim().replace(/^@/,"");
  if (/^(https?:\/\/|www\.|instagram\.com)/i.test(username)) {
    const url=new URL(/^https?:\/\//i.test(username)?username:`https://${username}`);
    if(url.protocol!=="https:" || !["instagram.com","www.instagram.com"].includes(url.hostname) || url.username || url.password) throw new Error("Informe um perfil válido do Instagram.");
    username=url.pathname.replace(/^\/+|\/+$/g,"");
  }
  if(!/^[a-zA-Z0-9._]{1,30}$/.test(username) || ["p","reel","reels","stories","explore"].includes(username.toLowerCase())) throw new Error("Informe o @ ou link do perfil do Instagram.");
  return `https://www.instagram.com/${username}/`;
}
export function sponsorFields(body:Record<string,unknown>){
  const name=String(body.name||"").trim(),description=String(body.description||"").trim(),logo_url=String(body.logo_url||"").trim();
  if(!name || name.length>100) throw new Error("Informe um nome com até 100 caracteres.");
  if(!description || description.length>1000) throw new Error("Informe uma descrição com até 1.000 caracteres.");
  if(!/^\/api\/uploads\?key=sponsor-logos(?:%2F|\/)[a-f0-9-]+\.(png|jpg|webp)$/.test(logo_url)) throw new Error("Envie a logo do patrocinador.");
  return {name,description,logo_url,instagram_url:instagramUrl(String(body.instagram_url||""))};
}
