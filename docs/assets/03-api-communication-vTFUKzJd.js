import"./modulepreload-polyfill-B5Qt9EMX.js";import{P as w,W as p,S as l,B as m,M as u,a as h}from"./three.module-YNhpf6Xm.js";import{s as f,a as g,o as y,r as b}from"./locar.es-BSHqnLqA.js";const n=new w(80,window.innerWidth/window.innerHeight,.001,1e3),t=new p;t.setSize(window.innerWidth,window.innerHeight);const a=new l;document.body.appendChild(t.domElement);window.addEventListener("resize",e=>{t.setSize(window.innerWidth,window.innerHeight),n.aspect=window.innerWidth/window.innerHeight,n.updateProjectionMatrix()});const s=new f(a,n),k=new g(n),E=new y(t);let r=!0;const d={},G=new m(20,20,20),L=new b(t);s.on("gpsupdate",async(e,c)=>{(r||c>100)&&((await(await fetch(`https://hikar.org/webapp/map?bbox=${e.coords.longitude-.02},${e.coords.latitude-.02},${e.coords.longitude+.02},${e.coords.latitude+.02}&layers=poi&outProj=4326`)).json()).features.forEach(o=>{if(!d[o.properties.osm_id]){const i=new u(G,new h({color:16711680}));s.add(i,o.geometry.coordinates[0],o.geometry.coordinates[1],0,o.properties),d[o.properties.osm_id]=i}}),r=!1)});document.getElementById("setFakeLoc").addEventListener("click",e=>{alert("Using fake input GPS, not real GPS location"),s.stopGps(),s.fakeGps(parseFloat(document.getElementById("fakeLon").value),parseFloat(document.getElementById("fakeLat").value))});s.startGps();t.setAnimationLoop(P);function P(){E.update(),k.update();const e=L.raycast(n,a);e.length&&alert(`This is ${e[0].object.properties.name}`),t.render(a,n)}
