export const SPONSOR_MAX_BYTES = 5 * 1024 * 1024;
export const SPONSOR_MULTIPART_MAX_BYTES = SPONSOR_MAX_BYTES + 64 * 1024;
export const SPONSOR_SIZE_ERROR = "A imagem deve ter no máximo 5 MB.";
export function validateSponsorFile(file:File){
  if(file.size>SPONSOR_MAX_BYTES)throw new Error(SPONSOR_SIZE_ERROR);
  const extensions:Record<string,RegExp>={"image/png":/\.png$/i,"image/jpeg":/\.jpe?g$/i,"image/webp":/\.webp$/i};
  if(!file.size||!extensions[file.type]?.test(file.name))throw new Error("Envie uma logo PNG, JPG, JPEG ou WEBP válida.");
}
export async function validateSponsorBytes(file:File){
  validateSponsorFile(file);
  const b=new Uint8Array(await file.slice(0,16).arrayBuffer());
  const png=[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v);
  const jpg=b[0]===255&&b[1]===216&&b[2]===255;
  const webp=new TextDecoder().decode(b.slice(0,4))==="RIFF"&&new TextDecoder().decode(b.slice(8,12))==="WEBP";
  if(!(file.type==="image/png"?png:file.type==="image/jpeg"?jpg:webp))throw new Error("O conteúdo da imagem não corresponde ao formato informado.");
}
export async function sponsorResponse(response:Response,fallback:string){
  if(response.status===413)throw new Error(SPONSOR_SIZE_ERROR);
  if(response.status===401)throw new Error("Sua sessão expirou. Entre novamente no Darkness Control.");
  if(response.status===403)throw new Error("Você não tem permissão para realizar esta ação.");
  if(!(response.headers.get("content-type")||"").toLowerCase().includes("application/json"))throw new Error(fallback);
  let body;try{body=await response.json()}catch{throw new Error(fallback)}
  if(!response.ok||body?.success===false){
    const message=typeof body?.error==="string"?body.error:"";
    throw new Error(message&&!/unexpected|payload|json|sql|internal|stack/i.test(message)?message:fallback);
  }
  if(!body||typeof body!=="object")throw new Error(fallback);
  return body;
}
// Best-effort optimization: keep the original if decoding or WebP encoding fails.
export async function optimizeSponsorImage(file:File){
  validateSponsorFile(file);
  if(file.size<1024*1024 || typeof createImageBitmap!=="function")return file;
  let bitmap:ImageBitmap|undefined;
  try{
    bitmap=await createImageBitmap(file);
    const scale=Math.min(1,2560/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const context=canvas.getContext("2d");if(!context)return file;
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/webp",.94));
    if(!blob||blob.type!=="image/webp"||blob.size>=file.size*.9)return file;
    return new File([blob],file.name.replace(/\.[^.]+$/,".webp"),{type:"image/webp"});
  }catch{return file}finally{bitmap?.close()}
}
