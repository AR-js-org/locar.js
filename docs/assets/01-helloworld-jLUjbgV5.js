import"./modulepreload-polyfill-B5Qt9EMX.js";import{S as d,P as a,W as r,B as s,M as w,a as c,s as h,o as m}from"./locar.es-_3sGWtRU.js";const i=new d,n=new a(60,window.innerWidth/window.innerHeight,.001,100),e=new r;e.setSize(window.innerWidth,window.innerHeight);e.setPixelRatio(window.devicePixelRatio);document.body.appendChild(e.domElement);window.addEventListener("resize",t=>{n.aspect=window.innerWidth/window.innerHeight,n.updateProjectionMatrix(),e.setSize(window.innerWidth,window.innerHeight)});const l=new s(2,2,2),p=new w(l,new c({color:16711680})),o=new h(i,n);new m({width:1024,height:768,onVideoStarted:t=>{i.background=t}},null);o.fakeGps(-.72,51.05);o.add(p,-.72,51.0501);e.setAnimationLoop(g);function g(){e.render(i,n)}
