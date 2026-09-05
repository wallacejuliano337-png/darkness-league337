"use client";
import {useEffect,useState,type ReactNode} from "react";
import {SocialIcon} from "./SiteFooter";
import {sponsorResponse} from "./sponsor-upload";
import type {Sponsor} from "./sponsor-data";
export function SponsorCard({sponsor,actions}:{sponsor:Sponsor;actions?:ReactNode}){
  const[bad,setBad]=useState(false);
  useEffect(()=>setBad(false),[sponsor.logo_url]);
  return <article className="sponsorCard">
    <div className="sponsorLogo">{sponsor.logo_url&&!bad?<img src={sponsor.logo_url} alt={`Logo de ${sponsor.name}`} loading="lazy" decoding="async" onError={()=>setBad(true)}/>:<span aria-hidden="true">♦</span>}</div>
    <div className="sponsorInfo"><h3>{sponsor.name}</h3><p>{sponsor.description}</p><a href={sponsor.instagram_url} target="_blank" rel="noopener noreferrer" aria-label={`Ver Instagram de ${sponsor.name}`}><SocialIcon type="instagram"/><span>Ver Instagram ↗</span></a></div>
    {actions&&<div className="sponsorCardActions">{actions}</div>}
  </article>
}
export default function Sponsors(){const[items,setItems]=useState<Sponsor[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");async function load(quiet=false){if(!quiet)setLoading(true);setError("");try{const r=await fetch("/api/sponsors",{cache:"no-store"}),j=await sponsorResponse(r,"Não foi possível carregar os patrocinadores.");setItems(j.sponsors)}catch{setError("Não foi possível carregar os patrocinadores.")}finally{setLoading(false)}}useEffect(()=>{load();const refresh=()=>{if(document.visibilityState!=="hidden")load(true)};const timer=setInterval(refresh,15000);window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);const channel=typeof BroadcastChannel!=="undefined"?new BroadcastChannel("darkness-sponsors"):null;if(channel)channel.onmessage=refresh;return ()=>{clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);channel?.close()}},[]);return <main className="inside sponsorsPage"><div className="title"><small>OFICIAL — PARCEIROS DA LIGA · SEASON 1</small><h2>PATROCINADORES</h2></div><p className="sponsorsIntro">Quem apoia a Darkness League e fortalece o cenário competitivo feminino.</p>{loading?<p role="status">Carregando patrocinadores...</p>:error?<div role="alert">{error} <button className="adminPrimary" onClick={()=>load()}>TENTAR NOVAMENTE</button></div>:items.length?<div className="sponsorGrid">{items.map(s=><SponsorCard key={s.id} sponsor={s}/>)}</div>:<section className="sponsorsEmpty"><span className="sponsorsMark" aria-hidden="true">♦</span><small>JUNTOS PELA DARKNESS</small><h3>Nossos parceiros, em breve.</h3><p>Os patrocinadores oficiais da liga serão apresentados aqui.</p><span className="sponsorsSeason">DARKNESS LEAGUE · SEASON 1</span></section>}</main>}
