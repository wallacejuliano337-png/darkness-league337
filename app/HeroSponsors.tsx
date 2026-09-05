"use client";
import {useEffect,useState} from "react";
import type {Sponsor} from "./sponsor-data";
import {sponsorResponse} from "./sponsor-upload";

export function HeroSponsorLogo({sponsor}:{sponsor:Sponsor}){
  const[failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[sponsor.logo_url]);
  const logo=sponsor.logo_url&&!failed?<img src={sponsor.logo_url} alt={sponsor.name} decoding="async" onError={()=>setFailed(true)}/>:<span aria-label={sponsor.name}>♦</span>;
  return sponsor.instagram_url?<a className="heroSponsorMedallion" href={sponsor.instagram_url} target="_blank" rel="noopener noreferrer" title={sponsor.name} aria-label={`Instagram de ${sponsor.name}`}>{logo}</a>:<span className="heroSponsorMedallion" title={sponsor.name}>{logo}</span>;
}
export default function HeroSponsors(){
  const[items,setItems]=useState<Sponsor[]>([]);
  useEffect(()=>{
    let alive=true;
    async function refresh(){if(document.visibilityState==="hidden")return;try{const response=await fetch("/api/sponsors",{cache:"no-store"}),body=await sponsorResponse(response,"Não foi possível carregar os apoiadores.");if(alive&&Array.isArray(body.sponsors))setItems(body.sponsors)}catch{/* Keep the hero quiet if sponsors are temporarily unavailable. */}}
    refresh();window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);
    const channel=typeof BroadcastChannel!=="undefined"?new BroadcastChannel("darkness-sponsors"):null;if(channel)channel.onmessage=refresh;
    return()=>{alive=false;window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);channel?.close()};
  },[]);
  if(!items.length)return null;
  return <section className="heroSponsors" aria-label="Apoiadores oficiais">
    <div className="heroSponsorsHeading"><span>APOIADORES OFICIAIS</span></div>
    <div className="heroSponsorsTrack">{items.map(s=><HeroSponsorLogo key={s.id} sponsor={s}/>)}</div>
  </section>;
}
