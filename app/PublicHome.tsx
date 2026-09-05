"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import HeroSponsors from "./HeroSponsors";

const money=(currency:string)=>currency==="USD"?"$":currency==="EUR"?"€":"R$";
function dateLabel(start?:string|null,end?:string|null){if(!start)return "DATA A DEFINIR";const f=(v:string)=>new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",timeZone:"UTC"}).format(new Date(`${v}T12:00:00Z`)).replace(".","").toUpperCase();return end&&end!==start?`${f(start)} — ${f(end)}`:f(start)}
const particles=Array.from({length:26},(_,i)=>({left:52+((i*37)%47),top:8+((i*29)%83),size:1+(i%3),delay:-((i*.43)%8),duration:9+(i%7)}));

export default function PublicHome({go}:{go:(v:any)=>void}){
  const[content,setContent]=useState<any>(null),[registered,setRegistered]=useState(0),[now,setNow]=useState(Date.now());
  const heroRef=useRef<HTMLElement>(null);
  useEffect(()=>{fetch("/api/settings?scope=home").then(r=>r.json()).then(c=>{if(c.success){setContent(c);setRegistered(c.registered||0)}}).catch(()=>{})},[]);
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(id)},[]);
  useEffect(()=>{
    const hero=heroRef.current;if(!hero)return;const reduce=matchMedia("(prefers-reduced-motion: reduce)"),touch=matchMedia("(pointer: coarse)");let frame=0;
    const set=(x:number,y:number)=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{hero.style.setProperty("--mx",String(x));hero.style.setProperty("--my",String(y))})};
    const move=(e:PointerEvent)=>{if(reduce.matches||touch.matches)return;const r=hero.getBoundingClientRect();set(((e.clientX-r.left)/r.width-.5)*2,((e.clientY-r.top)/r.height-.5)*2)};
    const leave=()=>set(0,0);
    const scroll=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const p=Math.min(1,Math.max(0,-hero.getBoundingClientRect().top/hero.offsetHeight));hero.style.setProperty("--scroll",String(p))})};
    hero.addEventListener("pointermove",move);hero.addEventListener("pointerleave",leave);addEventListener("scroll",scroll,{passive:true});scroll();
    return()=>{cancelAnimationFrame(frame);hero.removeEventListener("pointermove",move);hero.removeEventListener("pointerleave",leave);removeEventListener("scroll",scroll)};
  },[]);
  const s=content?.settings||{},start=s.registration_start?new Date(s.registration_start).getTime():0,end=s.registration_end?new Date(s.registration_end).getTime():0,diff=Math.max(0,end-now),closed=!s.registrations_open||(Boolean(start)&&now<start)||(Boolean(end)&&diff<=0),clock=useMemo(()=>({days:Math.floor(diff/86400000),hours:Math.floor(diff/3600000)%24,minutes:Math.floor(diff/60000)%60}),[diff]),stages=content?.stages||[],prizes=content?.prizes||[],displayPrizes=prizes.length>=3?[prizes[1],prizes[0],prizes[2],...prizes.slice(3)]:prizes;
  function register(){if(closed)return;const link=s.cta_button_link||"/registration";if(link==="/registration"||link==="/register")go("register");else location.href=link}
  return <>
    <section className="hero cinematicHero" ref={heroRef}>
      <div className="heroDepth heroBackdrop" aria-hidden="true"><div className="heroSmoke"/></div>
      <div className="heroDepth heroAtmosphere" aria-hidden="true"><div className="goddessAura"/><div className="haloGlow"/><div className="particles">{particles.map((p,i)=><i key={i} style={{left:`${p.left}%`,top:`${p.top}%`,width:p.size,height:p.size,animationDelay:`${p.delay}s`,animationDuration:`${p.duration}s`}}/>)}</div><div className="handGlow handGlowLeft"/><div className="handGlow handGlowRight"/></div>
      <div className="heroDepth goddessScene" aria-hidden="true"><div className="goddessEntrance"><div className="goddessFloat"><img src="/images/darkness-goddess.webp" alt="" loading="eager" fetchPriority="high" decoding="async"/></div></div></div>
      <div className="ghost">DARKNESS</div>
      <div className="eyebrow">{s.season_name||""}　·　INVITATIONAL FEM　·　2026</div>
      <div className="heroCopy"><small>A NOVA ERA COMEÇA AGORA</small><h1>ENTER THE<br/><i>DARKNESS</i></h1><p>Uma nova geração de competição feminina começa aqui.</p><div><button className="primary" disabled={closed} onClick={register}>{closed?"REGISTRATIONS CLOSED":"INSCREVER MINHA EQUIPE ↗"}</button><button onClick={()=>document.querySelector("#competition")?.scrollIntoView()}>CONHECER A COMPETIÇÃO</button></div><HeroSponsors/></div>
      <aside><small>{closed?"INSCRIÇÕES ENCERRADAS":"INSCRIÇÕES ABERTAS"}</small><b>{registered} <i>/{s.total_slots||0}</i></b><span>TEAMS REGISTERED</span></aside>
    </section>
    <section className="manifest"><small>02 — MANIFESTO</small><h2>Não entramos em cena<br/>para sermos <i>apenas mais uma.</i></h2><p><b>DARKNESS IS A STATEMENT.</b><br/>Um palco internacional construído para quem compete no limite e deixa sua marca na história.</p></section>
    <section id="competition" className="competition"><div className="title"><small>03 — ROAD TO GLORY</small><h2>THE COMPETITION</h2></div><div className="stages">{stages.map((x:any,i:number)=><article className={x.is_featured?"active":""} key={x.id}><span>{String(i+1).padStart(2,"0")}</span><h3>{x.name}</h3><p>{x.team_count} equipes · {x.format_text}</p><time>{dateLabel(x.start_date,x.end_date)}</time><b>↗</b></article>)}</div></section>
    <section className="prize"><small>04 — PRIZE POOL</small><div className="prizeTop"><h2><span>{money(s.prize_currency)}</span>{s.prize_pool??""}<sup>{s.prize_currency||""}</sup></h2><p>{s.prize_heading}<br/><i>{s.prize_highlight}</i></p></div><div className="podium">{displayPrizes.map((x:any,i:number)=><div className={i===1?"first":""} key={x.id}><span>{String(x.order_index+1).padStart(2,"0")}</span><b>{money(x.currency)}{x.amount}</b><small>{x.title}</small></div>)}</div></section>
    <section className="cta"><h2>{String(s.cta_title||"").split(" ").map((w:string,i:number,a:string[])=><span key={i}>{w}{i===a.length-2?<><br/></>:" "}</span>)}</h2><div><small>{closed?"REGISTRATIONS CLOSED":"REGISTRATIONS CLOSE IN"}</small>{!closed&&(end?<b>{String(clock.days).padStart(2,"0")} <i>DAYS</i>　{String(clock.hours).padStart(2,"0")} <i>HRS</i>　{String(clock.minutes).padStart(2,"0")} <i>MIN</i></b>:<b>DATA A DEFINIR</b>)}<button className="primary" disabled={closed} onClick={register}>{closed?"REGISTRATIONS CLOSED":`${s.cta_button_text||""} ↗`}</button></div></section>
  </>;
}
