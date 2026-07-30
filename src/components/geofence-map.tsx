"use client";
import { useEffect, useRef, useState } from "react";

type Point={latitude:number;longitude:number};
type Props={office:Point&{radius:number;name?:string};user?:Point|null;height?:number};

declare global { interface Window { __nadiGoogleMaps?: Promise<void>; google?: { maps: { Map:new(el:HTMLElement,opts:Record<string,unknown>)=>unknown; Circle:new(opts:Record<string,unknown>)=>{setMap:(map:unknown|null)=>void}; LatLngBounds:new()=>{extend:(p:{lat:number;lng:number})=>void}; } } } }
function loadGoogleMaps(key:string){if(window.google?.maps)return Promise.resolve();if(window.__nadiGoogleMaps)return window.__nadiGoogleMaps;window.__nadiGoogleMaps=new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;s.async=true;s.onload=()=>resolve();s.onerror=()=>reject(new Error("Google Maps gagal dimuat"));document.head.appendChild(s);});return window.__nadiGoogleMaps;}

export function GeofenceMap({office,user,height=260}:Props){const ref=useRef<HTMLDivElement>(null);const [failed,setFailed]=useState(false);const key=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
useEffect(()=>{if(!key||!ref.current)return;let active=true;const circles:{setMap:(m:unknown|null)=>void}[]=[];loadGoogleMaps(key).then(()=>{if(!active||!ref.current||!window.google)return;const maps=window.google.maps;const center={lat:office.latitude,lng:office.longitude};const map=new maps.Map(ref.current,{center,zoom:18,disableDefaultUI:true,zoomControl:true,mapTypeControl:false,streetViewControl:false,fullscreenControl:false});circles.push(new maps.Circle({map,center,radius:office.radius,fillColor:"#123b2a",fillOpacity:.08,strokeColor:"#123b2a",strokeOpacity:.55,strokeWeight:1}));circles.push(new maps.Circle({map,center,radius:3,fillColor:"#123b2a",fillOpacity:1,strokeColor:"#ffffff",strokeOpacity:1,strokeWeight:2}));if(user)circles.push(new maps.Circle({map,center:{lat:user.latitude,lng:user.longitude},radius:3,fillColor:"#4768ff",fillOpacity:1,strokeColor:"#ffffff",strokeOpacity:1,strokeWeight:2}));}).catch(()=>setFailed(true));return()=>{active=false;circles.forEach(c=>c.setMap(null));};},[key,office.latitude,office.longitude,office.radius,user?.latitude,user?.longitude]);
if(!key||failed)return <div className="mapmock" style={{height}}><div className="pin"/><div className="userdot"/></div>;
return <div ref={ref} aria-label={`Peta geofence ${office.name||"office"}`} style={{height,borderRadius:16,overflow:"hidden",background:"#e7ece8"}}/>;}
