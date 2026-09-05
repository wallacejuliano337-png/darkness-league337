"use client";
import {useEffect,useState} from "react";
import {SponsorCard} from "./Sponsors";
import {instagramUrl,type Sponsor} from "./sponsor-data";
import {validateSponsorFile,optimizeSponsorImage,sponsorResponse} from "./sponsor-upload";
const blank={name:"",description:"",logo_url:"",instagram_url:""};
export default function SponsorManager({canEdit}:{canEdit:boolean}){
  const[items,setItems]=useState<Sponsor[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState(""),[draft,setDraft]=useState({...blank}),[editing,setEditing]=useState<string|null>(null),[opened,setOpened]=useState(false),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[selectedFile,setSelectedFile]=useState<File|null>(null),[preview,setPreview]=useState("");
  useEffect(()=>{if(!selectedFile){setPreview("");return}const url=URL.createObjectURL(selectedFile);setPreview(url);return ()=>URL.revokeObjectURL(url)},[selectedFile]);
  async function load(){setLoading(true);try{const r=await fetch("/api/sponsors",{cache:"no-store"}),j=await sponsorResponse(r,"Não foi possível carregar os patrocinadores.");setItems(j.sponsors)}catch{setError("Não foi possível carregar a lista. Tente novamente.")}finally{setLoading(false)}}
  useEffect(()=>{load()},[]);
  function edit(s?:Sponsor){setSelectedFile(null);setEditing(s?.id||null);setDraft(s?{name:s.name,description:s.description,logo_url:s.logo_url,instagram_url:s.instagram_url}:{...blank});setOpened(true);setError("");setNotice("")}
  function selectLogo(file?:File){if(!file)return;setError("");setNotice("");try{validateSponsorFile(file);setSelectedFile(file)}catch(e){setError((e as Error).message)}}
  async function save(e:React.FormEvent){e.preventDefault();setError("");setNotice("");
    if(!draft.name.trim()||!draft.description.trim()){setError("Preencha o nome e a descrição do patrocinador.");return}
    if(!selectedFile&&!draft.logo_url){setError("Envie a logo antes de salvar.");return}
    try{instagramUrl(draft.instagram_url);if(selectedFile)validateSponsorFile(selectedFile)}catch(e){setError((e as Error).message);return}
    setBusy(true);
    try{
      let logo_url=draft.logo_url;
      if(selectedFile){setUploading(true);const file=await optimizeSponsorImage(selectedFile),form=new FormData();form.set("file",file);form.set("kind","sponsor");
        const response=await fetch("/api/uploads?kind=sponsor",{method:"POST",body:form}),uploaded=await sponsorResponse(response,"Não foi possível enviar a logo. Tente novamente.");
        if(typeof uploaded.url!=="string")throw new Error("Não foi possível confirmar o envio da logo.");
        logo_url=uploaded.url;setDraft(d=>({...d,logo_url}));setSelectedFile(null);setUploading(false);
      }
      const r=await fetch("/api/admin/sponsors",{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...draft,logo_url,id:editing})});
      await sponsorResponse(r,"Não foi possível salvar o patrocinador. Tente novamente.");
      setNotice(editing?"Patrocinador atualizado com sucesso.":"Patrocinador cadastrado com sucesso.");setDraft({...blank});setSelectedFile(null);setEditing(null);setOpened(false);
      if(typeof BroadcastChannel!=="undefined"){const channel=new BroadcastChannel("darkness-sponsors");channel.postMessage("updated");channel.close()}
      await load();
    }catch(e){setError(e instanceof Error&&!/failed to fetch|network|unexpected|json/i.test(e.message)?e.message:"Não foi possível concluir. Verifique sua conexão e tente novamente.")}finally{setBusy(false);setUploading(false)}
  }
  async function remove(s:Sponsor){if(!confirm("Tem certeza que deseja remover este patrocinador?"))return;setBusy(true);setError("");setNotice("");try{const r=await fetch("/api/admin/sponsors",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:s.id})}),j=await sponsorResponse(r,"Não foi possível remover o patrocinador.");setNotice("Patrocinador removido.");if(typeof BroadcastChannel!=="undefined"){const channel=new BroadcastChannel("darkness-sponsors");channel.postMessage("updated");channel.close()}await load()}catch(e){setError(e instanceof Error&&!/failed to fetch|network|unexpected|json/i.test(e.message)?e.message:"Não foi possível remover. Tente novamente.")}finally{setBusy(false)}}
  let previewInstagram="";try{previewInstagram=instagramUrl(draft.instagram_url)}catch{}
  return <div className="sponsorManager"><p className="sponsorsIntro">Cadastre os parceiros da liga. As alterações salvas aparecem automaticamente na aba Patrocinadores.</p>{error&&<p className="formError" role="alert">{error}</p>}{notice&&<p className="sponsorNotice" role="status">{notice}</p>}{!canEdit&&<p>Você precisa da permissão de editar configurações para alterar patrocinadores.</p>}
  {opened?<div className="sponsorEditor"><form onSubmit={save}><h2>{editing?"EDITAR":"ADICIONAR"} PATROCINADOR</h2><fieldset disabled={busy||uploading}><label>NOME DO PATROCINADOR<input required maxLength={100} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>LOGO · PNG, JPG OU WEBP · ATÉ 5 MB<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{selectLogo(e.target.files?.[0]);e.target.value=""}}/></label>{uploading&&<p role="status">Enviando logo...</p>}<label>DESCRIÇÃO<textarea required rows={5} maxLength={1000} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/><small>{draft.description.length}/1000</small></label><label>INSTAGRAM<input required placeholder="@patrocinador ou link do perfil" value={draft.instagram_url} onChange={e=>setDraft({...draft,instagram_url:e.target.value})}/></label><div className="sponsorActions"><button className="adminPrimary" type="submit">{busy?"SALVANDO...":"SALVAR PATROCINADOR"}</button><button type="button" onClick={()=>{setOpened(false);setSelectedFile(null);setError("")}}>CANCELAR</button></div></fieldset></form><div><small className="sponsorPreviewLabel">PRÉVIA NO SITE</small><SponsorCard sponsor={{...draft,logo_url:preview||draft.logo_url,id:"preview",name:draft.name||"Nome do patrocinador",description:draft.description||"A descrição do parceiro aparecerá aqui.",instagram_url:previewInstagram||"https://www.instagram.com/",created_at:0,updated_at:0}}/></div></div>:<>{canEdit&&<button className="adminPrimary" disabled={busy} onClick={()=>edit()}>＋ ADICIONAR PATROCINADOR</button>}{loading?<p role="status">Carregando...</p>:<><div className="sponsorGrid">{items.map(s=><SponsorCard key={s.id} sponsor={s} actions={canEdit?<><button disabled={busy} onClick={()=>edit(s)}>EDITAR</button><button disabled={busy} onClick={()=>remove(s)}>REMOVER</button></>:undefined}/>)}</div>{!items.length&&<p className="sponsorsIntro">Nenhum patrocinador cadastrado.</p>}{error&&<button onClick={()=>{setError("");load()}}>TENTAR NOVAMENTE</button>}</>}</>}
  </div>
}
