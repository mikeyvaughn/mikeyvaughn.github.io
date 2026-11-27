(() => {
  const template=document.querySelector('.mfv-butterfly-surface');
  const controls=document.querySelector('.butterfly-controls');
  if(!template||!controls)return;
  const source=template.querySelector('.mfv-butterfly'),toggle=controls.querySelector('[data-butterfly-toggle]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  let preference=false;
  try{preference=sessionStorage.getItem('mfv-butterfly-paused')==='true';}catch{}
  let paused=preference||reduced.matches,raf=0,previous=0,disposed=false;
  controls.hidden=reduced.matches;
  // Each green section owns its artwork and route in local section coordinates.
  const scenes=[...document.querySelectorAll('.header-band,.statement,.digital,.footer')].map((section,index)=>{
    const layer=document.createElement('div');layer.className='mfv-butterfly-surface';layer.setAttribute('aria-hidden','true');
    const art=source.cloneNode(true);layer.append(art);section.append(layer);
    art.querySelectorAll('[id]').forEach(node=>{const old=node.id,next=`mfv-${index}-${old}`;node.id=next;art.querySelectorAll(`[href="#${old}"]`).forEach(use=>use.setAttribute('href',`#${next}`));});
    art.classList.toggle('on-header',section.classList.contains('header-band'));
    return{section,art,layer,header:section.classList.contains('header-band'),footer:section.classList.contains('footer'),point:null,heading:{x:Math.random()<.5?-1:1,y:0},bank:0,phase:Math.random()*Math.PI*2,open:.98,bob:0,flight:null,elapsed:0,footerFlights:0,departAt:0,width:0,height:0};
  });
  template.remove();
  const finePointer=matchMedia('(hover: hover) and (pointer: fine)');
  scenes.forEach(scene=>{
    scene.section.addEventListener('pointermove',event=>{
      if(paused||reduced.matches||!finePointer.matches||!scene.art.classList.contains('is-perched'))return;
      const rect=scene.art.getBoundingClientRect(),distance=Math.hypot(event.clientX-(rect.left+rect.width*.5),event.clientY-(rect.top+rect.height*.68));
      if(distance<Math.max(54,rect.width*.65)&&!scene.departAt)scene.departAt=performance.now()+650;
    },{passive:true});
    scene.section.addEventListener('pointerleave',()=>{if(scene.departAt)scene.departAt=0;});
  });
  function bounds(scene){
    return{left:8,right:Math.max(9,scene.width-scene.art.offsetWidth-8),top:6,bottom:Math.max(7,scene.height-scene.art.offsetHeight-6)};
  }
  function randomPoint(scene){const b=bounds(scene);return{x:b.left+Math.random()*(b.right-b.left),y:b.top+Math.random()*(b.bottom-b.top)};}
  function landingPoint(scene){
    if(!scene.footer||scene.footerFlights++%3!==0)return null;
    const anchors=[...scene.section.querySelectorAll('.footer-bottom .brand-logo,.footer-bottom .brand-tagline')];
    if(!anchors.length)return null;
    const root=scene.section.getBoundingClientRect(),anchor=anchors[Math.floor(Math.random()*anchors.length)],r=anchor.getBoundingClientRect(),b=bounds(scene);
    let contact={x:r.left+r.width*(.32+Math.random()*.5),y:r.top+r.height*.2};
    if(anchor.classList.contains('brand-tagline')){
      const letters=[];const walker=document.createTreeWalker(anchor,NodeFilter.SHOW_TEXT);let node;
      while((node=walker.nextNode()))for(let i=0;i<node.textContent.length;i++)if(/[a-z]/i.test(node.textContent[i]))letters.push({node,index:i});
      if(letters.length){const letter=letters[Math.floor(Math.random()*letters.length)],range=document.createRange();range.setStart(letter.node,letter.index);range.setEnd(letter.node,letter.index+1);const glyph=range.getBoundingClientRect();contact={x:glyph.left+glyph.width*.5,y:glyph.top+glyph.height*.13};}
    }
    scene.art.style.setProperty('--perch-scale',String(clamp(r.width*.72/scene.art.offsetWidth,.55,.88)));
    return{x:clamp(contact.x-root.left-scene.art.offsetWidth*.5,b.left,b.right),y:clamp(contact.y-root.top-scene.art.offsetHeight*.78,b.top,b.bottom)};
  }
  function nextFlight(scene,allowLanding=true){
    const takingOff=scene.flight?.perch&&scene.elapsed>=scene.flight.duration;
    if(takingOff)scene.heading={x:Math.random()<.5?-.6:.6,y:-.8};
    scene.departAt=0;
    const b=bounds(scene),landing=allowLanding?landingPoint(scene):null,end=landing||randomPoint(scene);
    const dx=end.x-scene.point.x,dy=end.y-scene.point.y,distance=Math.hypot(dx,dy)||1,direction={x:dx/distance,y:dy/distance};
    const reach=clamp(distance*.32,25,170),bend=(Math.random()-.5)*Math.min(140,distance*.4);
    const limit=p=>({x:clamp(p.x,b.left,b.right),y:clamp(p.y,b.top,b.bottom)});
    scene.flight={start:{...scene.point},end,c1:limit({x:scene.point.x+scene.heading.x*reach,y:scene.point.y+scene.heading.y*reach}),c2:limit(landing?{x:end.x+(Math.random()-.5)*30,y:end.y-36}:{x:end.x-direction.x*reach-direction.y*bend,y:end.y-direction.y*reach+direction.x*bend}),duration:clamp(distance/(12+Math.random()*6)*1000,20000,52000),perch:!!landing,rest:landing?8000+Math.random()*4000:0,glideStart:.2+Math.random()*.3,glideLength:.1+Math.random()*.14};scene.elapsed=0;
  }
  function sizeScene(scene){
    const width=scene.section.clientWidth,height=scene.section.clientHeight;
    if(scene.header){scene.art.style.width='';const natural=scene.art.offsetWidth;scene.art.style.width=`${Math.min(natural,Math.max(42,(height-14)*5/4))}px`;}
    if(width===scene.width&&height===scene.height&&scene.point)return;
    const firstFlight=!scene.point;
    scene.width=width;scene.height=height;
    const b=bounds(scene);
    scene.point=scene.point?{x:clamp(scene.point.x,b.left,b.right),y:clamp(scene.point.y,b.top,b.bottom)}:randomPoint(scene);
    nextFlight(scene,firstFlight&&scene.footer);
  }
  function showScene(){
    // Visibility selects one scene. It never rebases any flight coordinates.
    const ranked=scenes.map(scene=>{const r=scene.section.getBoundingClientRect();return{scene,visible:Math.max(0,Math.min(innerHeight,r.bottom)-Math.max(0,r.top))};}).filter(row=>row.visible>40);
    ranked.sort((a,b)=>scrollY<100&&a.scene.header!==b.scene.header?(a.scene.header?-1:1):b.visible-a.visible);
    const active=ranked[0]?.scene;
    scenes.forEach(scene=>scene.art.classList.toggle('is-visible',scene===active&&!reduced.matches));
    return active;
  }
  function paint(scene){
    const b=bounds(scene),resting=scene.art.classList.contains('is-perched');
    // Keep the full wing silhouette inside the section, including its gentle bob.
    const x=clamp(scene.point.x,b.left,b.right),y=clamp(scene.point.y+(resting?0:scene.bob),b.top,b.bottom);
    scene.art.style.transform=`translate3d(${x}px,${y}px,0) rotate(${resting?0:scene.bank}deg)`;
  }
  function advance(scene,delta){
    if(scene.departAt&&performance.now()>=scene.departAt)nextFlight(scene,false);
    const f=scene.flight,t=Math.min(scene.elapsed/f.duration,1);
    const glide=f.perch?0:smooth((t-f.glideStart)/.035)*(1-smooth((t-f.glideStart-f.glideLength)/.035));
    scene.phase+=delta/(1300+glide*1300)*Math.PI*2;scene.elapsed+=delta*(1+.06*Math.sin(scene.phase)*(1-glide));
    const progress=Math.min(scene.elapsed/f.duration,1),u=f.perch?progress*progress*progress*(progress*(progress*6-15)+10):progress,v=1-u;
    scene.point={x:v*v*v*f.start.x+3*v*v*u*f.c1.x+3*v*u*u*f.c2.x+u*u*u*f.end.x,y:v*v*v*f.start.y+3*v*v*u*f.c1.y+3*v*u*u*f.c2.y+u*u*u*f.end.y};
    const vx=3*v*v*(f.c1.x-f.start.x)+6*v*u*(f.c2.x-f.c1.x)+3*u*u*(f.end.x-f.c2.x),vy=3*v*v*(f.c1.y-f.start.y)+6*v*u*(f.c2.y-f.c1.y)+3*u*u*(f.end.y-f.c2.y),speed=Math.hypot(vx,vy)||1;
    scene.heading={x:vx/speed,y:vy/speed};
    const landing=f.perch?1-smooth((progress-.78)/.22):1,resting=progress===1&&f.perch;
    scene.bank+=(scene.heading.x*5*landing-scene.bank)*Math.min(1,delta/850);
    const beat=.62+.36*(.5+.5*Math.cos(scene.phase)),preparing=resting&&(scene.departAt>0||scene.elapsed>f.duration+f.rest-900),opening=resting&&!preparing?.84:beat*(1-glide)+.91*glide;
    scene.open+=(opening-scene.open)*Math.min(1,delta/(resting?400:120));
    scene.art.style.setProperty('--wing-open',String(scene.open));scene.art.style.setProperty('--wing-right-open',String(clamp(scene.open+.009*Math.sin(scene.phase+.1)*(1-glide)*landing,.62,.98)));
    scene.bob=resting?0:Math.sin(scene.phase-.6)*(1.45*(1-glide)+.2*glide)*landing;
    scene.art.classList.toggle('is-perched',resting);scene.art.classList.toggle('is-gliding',glide>.5);paint(scene);
    if(scene.elapsed>=f.duration+f.rest)nextFlight(scene);
  }
  function frame(time){
    const delta=previous?Math.min(time-previous,50):0;previous=time;
    const active=showScene();if(active)advance(active,delta);
    raf=requestAnimationFrame(frame);
  }
  function update(){
    if(disposed)return;
    cancelAnimationFrame(raf);previous=0;controls.hidden=reduced.matches;
    scenes.forEach(scene=>{scene.art.hidden=reduced.matches;paint(scene);});
    toggle.textContent=reduced.matches?'Motion Reduced':paused?'Play Butterfly':'Pause Butterfly';toggle.disabled=reduced.matches;toggle.setAttribute('aria-pressed',String(!paused&&!reduced.matches));showScene();
    if(!paused&&!reduced.matches&&!document.hidden)raf=requestAnimationFrame(frame);
  }
  const resizeObserver=new ResizeObserver(entries=>{for(const entry of entries){const scene=scenes.find(s=>s.section===entry.target);if(scene){sizeScene(scene);paint(scene);}}});
  scenes.forEach(scene=>{sizeScene(scene);paint(scene);resizeObserver.observe(scene.section);});
  toggle.addEventListener('click',()=>{paused=!paused;preference=paused;try{sessionStorage.setItem('mfv-butterfly-paused',String(paused));}catch{}update();});
  controls.querySelector('[data-butterfly-hide]')?.addEventListener('click',()=>{disposed=true;cancelAnimationFrame(raf);resizeObserver.disconnect();scenes.forEach(s=>s.layer.remove());controls.remove();});
  reduced.addEventListener('change',()=>{paused=preference||reduced.matches;update();});document.addEventListener('visibilitychange',update);
  addEventListener('scroll',()=>{if(paused&&!disposed)showScene();},{passive:true});
  addEventListener('resize',()=>{if(!disposed){scenes.forEach(s=>{sizeScene(s);paint(s);});showScene();}});
  update();
})();
