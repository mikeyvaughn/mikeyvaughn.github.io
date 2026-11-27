(() => {
  const template=document.querySelector('.mfv-butterfly-surface');
  if(!template)return;
  const source=template.querySelector('.mfv-butterfly');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  let raf=0,previous=0;
  // The decorative effect follows the device's reduced-motion preference.
  try{sessionStorage.removeItem('mfv-butterfly-paused');}catch{}
  // Each green section owns its artwork and route in local section coordinates.
  const scenes=[...document.querySelectorAll('.header-band,.statement,.digital,.footer')].map((section,index)=>{
    const layer=document.createElement('div');layer.className='mfv-butterfly-surface';layer.setAttribute('aria-hidden','true');
    const art=source.cloneNode(true);layer.append(art);section.append(layer);
    art.querySelectorAll('[id]').forEach(node=>{const old=node.id,next=`mfv-${index}-${old}`;node.id=next;art.querySelectorAll(`[href="#${old}"]`).forEach(use=>use.setAttribute('href',`#${next}`));});
    art.classList.toggle('on-header',section.classList.contains('header-band'));
    return{section,art,layer,header:section.classList.contains('header-band'),footer:section.classList.contains('footer'),statement:section.classList.contains('statement'),digital:section.classList.contains('digital'),zoneHeight:0,point:null,heading:{x:Math.random()<.5?-1:1,y:0},bank:0,phase:Math.random()*Math.PI*2,open:.98,bob:0,flight:null,elapsed:0,width:0,height:0,obstacles:[],waypoints:[],safe:false,scale:1,outing:0,outingLimit:19000+Math.random()*7000,cooldown:0,fadeOut:0};
  });
  template.remove();
  function bounds(scene){
    const right=Math.max(9,scene.width-scene.art.offsetWidth-8);
    // Both entrances and the whole flight stay in the requested right-hand area.
    const requestedLeft=scene.header?scene.width*.72:scene.statement?scene.width*(scene.width>760?.6:.56):8;
    return{left:Math.min(right,Math.max(8,requestedLeft)),right,top:6,bottom:Math.max(7,(scene.zoneHeight||scene.height)-scene.art.offsetHeight-6)};
  }
  function footprint(scene,p,padding=8,scale=1){
    const w=scene.art.offsetWidth,h=scene.art.offsetHeight;
    // SVG ink bounds plus space for bank, bob and comfortable text clearance.
    return{left:p.x+w*.5-w*.44*scale-padding,right:p.x+w*.5+w*.44*scale+padding,top:p.y+h*.78-h*.68*scale-padding,bottom:p.y+h*.78+h*.03*scale+padding};
  }
  function clearPoint(scene,p,padding=8,scale=1){
    const a=footprint(scene,p,padding,scale);
    return !scene.obstacles.some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top);
  }
  function measureContent(scene){
    const root=scene.section.getBoundingClientRect(),rects=[];
    const add=r=>{if(r.width>0&&r.height>0)rects.push({left:r.left-root.left,right:r.right-root.left,top:r.top-root.top,bottom:r.bottom-root.top});};
    const walker=document.createTreeWalker(scene.section,NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode())){
      if(!node.textContent.trim()||node.parentElement.closest('.mfv-butterfly-surface,script,style'))continue;
      const range=document.createRange();range.selectNodeContents(node);for(const rect of range.getClientRects())add(rect);
    }
    scene.section.querySelectorAll('img,svg,button').forEach(e=>{if(e.closest('.mfv-butterfly-surface'))return;const r=e.getBoundingClientRect();if(e.matches('.footer-bottom .brand-logo img'))add({left:r.left,right:r.right,top:r.top+r.height*.16,bottom:r.bottom,width:r.width,height:r.height*.84});else add(r);});
    scene.obstacles=rects;
    const b=bounds(scene),step=Math.max(20,Math.min(45,scene.art.offsetWidth*.27));scene.waypoints=[];
    for(let y=b.top;y<=b.bottom;y+=step)for(let x=b.left;x<=b.right;x+=step)if(clearPoint(scene,{x,y}))scene.waypoints.push({x,y});
    scene.smallWaypoints=[];
    for(let y=b.top;y<=b.bottom;y+=step)for(let x=b.left;x<=b.right;x+=step)if(clearPoint(scene,{x,y},8,.72))scene.smallWaypoints.push({x,y});
    scene.safe=scene.waypoints.length>0;
  }
  function randomPoint(scene,scale=1){
    const points=scale<1&&scene.smallWaypoints.length?scene.smallWaypoints:scene.waypoints;
    if(!points.length)return{x:bounds(scene).left,y:bounds(scene).top};
    return{...points[Math.floor(Math.random()*points.length)]};
  }
  function curvePoint(f,u){const v=1-u;return{x:v*v*v*f.start.x+3*v*v*u*f.c1.x+3*v*u*u*f.c2.x+u*u*u*f.end.x,y:v*v*v*f.start.y+3*v*v*u*f.c1.y+3*v*u*u*f.c2.y+u*u*u*f.end.y};}
  function flightScale(f,u){return f.startScale+((f.endScale??1)-f.startScale)*smooth((u-.4)/.35);}
  function clearCurve(scene,f){
    const length=Math.hypot(f.c1.x-f.start.x,f.c1.y-f.start.y)+Math.hypot(f.c2.x-f.c1.x,f.c2.y-f.c1.y)+Math.hypot(f.end.x-f.c2.x,f.end.y-f.c2.y);
    const steps=Math.max(24,Math.min(180,Math.ceil(length/7)));
    for(let i=0;i<=steps;i++)if(!clearPoint(scene,curvePoint(f,i/steps),8,flightScale(f,i/steps)))return false;
    return true;
  }
  function nextFlight(scene){
    const b=bounds(scene),limit=p=>({x:clamp(p.x,b.left,b.right),y:clamp(p.y,b.top,b.bottom)});
    let chosen=null;
    // Free flight only. No footer perch, stationary rest or text target.
    for(let attempt=0;attempt<100;attempt++){
      const end=randomPoint(scene),dx=end.x-scene.point.x,dy=end.y-scene.point.y;
      const distance=Math.hypot(dx,dy)||1,direction={x:dx/distance,y:dy/distance};
      const reach=clamp(distance*.3,14,140),bend=(Math.random()-.5)*Math.min(90,distance*.26);
      const f={start:{...scene.point},startScale:scene.scale||1,endScale:1,end,
        c1:limit({x:scene.point.x+scene.heading.x*reach,y:scene.point.y+scene.heading.y*reach}),
        c2:limit({x:end.x-direction.x*reach-direction.y*bend,y:end.y-direction.y*reach+direction.x*bend}),
        duration:clamp(distance/(22+Math.random()*8)*1000,7000,28000),perch:false,takeoff:false,cadence:680+Math.random()*240,rest:0,
        glideStart:.22+Math.random()*.16,glideLength:.08+Math.random()*.07,secondGlide:.65+Math.random()*.12};
      if(clearCurve(scene,f)){chosen=f;break;}
    }
    scene.flight=chosen||{start:{...scene.point},startScale:1,endScale:1,end:{...scene.point},c1:{...scene.point},c2:{...scene.point},duration:3500,perch:false,takeoff:false,rest:0,glideStart:.15,glideLength:.6};scene.elapsed=0;
  }
  function entrance(scene){
    // Reposition only while invisible, never in response to scrolling.
    scene.scale=1;scene.point=randomPoint(scene);scene.art.classList.remove('is-perched');
    nextFlight(scene);paint(scene);
  }
  function sizeScene(scene){
    const width=scene.section.clientWidth,height=scene.section.clientHeight;
    if(scene.header){scene.art.style.width='';const natural=scene.art.offsetWidth;scene.art.style.width=`${Math.min(natural,width<760?44:natural,Math.max(42,(height-14)*5/4))}px`;}
    if(width===scene.width&&height===scene.height&&scene.point)return;
    const firstFlight=!scene.point;
    scene.width=width;scene.height=height;
    if(!scene.header)scene.art.style.width='';
    scene.zoneHeight=height;
    if(scene.digital){
      // Keep this tall section's route near its introduction, rather than below it.
      const root=scene.section.getBoundingClientRect();
      const paragraph=scene.section.querySelector('.digital-intro>p:not(.eyebrow)');
      scene.zoneHeight=width<760&&paragraph?paragraph.getBoundingClientRect().top-root.top:Math.min(height,600);
      if(width<760)scene.art.style.width='80px';
    }
    measureContent(scene);
    if(!scene.header||width>760){
      let attempts=0;while(!scene.safe&&scene.art.offsetWidth>58&&attempts++<3){scene.art.style.width=`${Math.max(56,scene.art.offsetWidth*.8)}px`;measureContent(scene);}
    }
    const b=bounds(scene);
    const resizedPoint=scene.point?{x:clamp(scene.point.x,b.left,b.right),y:clamp(scene.point.y,b.top,b.bottom)}:null;
    scene.point=resizedPoint&&clearPoint(scene,resizedPoint)?resizedPoint:randomPoint(scene);
    if(firstFlight)entrance(scene);else nextFlight(scene);
  }
  function showScene(){
    // Visibility selects one scene. It never rebases any flight coordinates.
    const ranked=scenes.map(scene=>{const r=scene.section.getBoundingClientRect();return{scene,visible:Math.max(0,Math.min(innerHeight,r.bottom)-Math.max(0,r.top))};}).filter(row=>row.visible>40&&row.scene.safe&&!(row.scene.header&&innerWidth<=760));
    ranked.sort((a,b)=>scrollY<100&&a.scene.header!==b.scene.header?(a.scene.header?-1:1):b.visible-a.visible);
    const active=ranked[0]?.scene;
    scenes.forEach(scene=>scene.art.classList.toggle('is-visible',scene===active&&!reduced.matches&&scene.cooldown<=0&&scene.fadeOut<=0));
    return active;
  }
  function paint(scene){
    const b=bounds(scene);
    // Keep the full wing silhouette inside the section, including its gentle bob.
    const x=clamp(scene.point.x,b.left,b.right),y=clamp(scene.point.y+scene.bob,b.top,b.bottom);
    scene.art.style.transform=`translate3d(${x}px,${y}px,0) rotate(${scene.bank}deg) scale(${scene.scale||1})`;
  }
  function advance(scene,delta){
    const f=scene.flight,t=Math.min(scene.elapsed/f.duration,1);
    const window=(start,length)=>smooth((t-start)/.035)*(1-smooth((t-start-length)/.035));
    const glide=Math.max(window(f.glideStart,f.glideLength),window(f.secondGlide||.74,.065));
    const cadence=(f.cadence||800)*(1+.13*Math.sin(scene.phase*.27))+glide*1050;
    scene.phase+=delta/cadence*Math.PI*2;scene.elapsed+=delta*(1+.06*Math.sin(scene.phase)*(1-glide));
    const progress=Math.min(scene.elapsed/f.duration,1),u=progress,v=1-u;
    scene.point={x:v*v*v*f.start.x+3*v*v*u*f.c1.x+3*v*u*u*f.c2.x+u*u*u*f.end.x,y:v*v*v*f.start.y+3*v*v*u*f.c1.y+3*v*u*u*f.c2.y+u*u*u*f.end.y};
    const vx=3*v*v*(f.c1.x-f.start.x)+6*v*u*(f.c2.x-f.c1.x)+3*u*u*(f.end.x-f.c2.x),vy=3*v*v*(f.c1.y-f.start.y)+6*v*u*(f.c2.y-f.c1.y)+3*u*u*(f.end.y-f.c2.y),speed=Math.hypot(vx,vy)||1;
    scene.heading={x:vx/speed,y:vy/speed};
    scene.bank+=(scene.heading.x*5-scene.bank)*Math.min(1,delta/850);
    const beat=.6+.38*(.5+.5*Math.cos(scene.phase)),opening=beat*(1-glide)+.94*glide;
    scene.open+=(opening-scene.open)*Math.min(1,delta/120);
    scene.art.style.setProperty('--wing-open',String(scene.open));scene.art.style.setProperty('--wing-right-open',String(clamp(scene.open+.009*Math.sin(scene.phase+.1)*(1-glide),.45,.99)));
    scene.bob=Math.sin(scene.phase-.6)*(1.45*(1-glide)+.2*glide);
    scene.scale=flightScale(f,u);
    scene.art.classList.toggle('is-gliding',glide>.5);paint(scene);
    if(scene.elapsed>=f.duration)nextFlight(scene);
  }
  function frame(time){
    const delta=previous?Math.min(time-previous,50):0;previous=time;
    const active=showScene();
    if(active){
      if(active.cooldown>0){active.cooldown=Math.max(0,active.cooldown-delta);if(active.cooldown===0){active.outing=0;active.outingLimit=19000+Math.random()*7000;entrance(active);}}
      else{
        advance(active,delta);active.outing+=delta;
        if(active.fadeOut>0){active.fadeOut-=delta;if(active.fadeOut<=0)active.cooldown=7000+Math.random()*6000;}
        else if(active.outing>active.outingLimit)active.fadeOut=1400;
      }
    }
    raf=requestAnimationFrame(frame);
  }
  function update(){
    cancelAnimationFrame(raf);previous=0;
    scenes.forEach(scene=>{scene.art.hidden=reduced.matches;paint(scene);});
    showScene();
    if(!reduced.matches&&!document.hidden)raf=requestAnimationFrame(frame);
  }
  document.fonts?.ready.then(()=>{scenes.forEach(scene=>{scene.width=0;sizeScene(scene);paint(scene);});});
  const resizeObserver=new ResizeObserver(entries=>{for(const entry of entries){const scene=scenes.find(s=>s.section===entry.target);if(scene){sizeScene(scene);paint(scene);}}});
  scenes.forEach(scene=>{sizeScene(scene);paint(scene);resizeObserver.observe(scene.section);});
  reduced.addEventListener('change',update);document.addEventListener('visibilitychange',update);
  addEventListener('scroll',()=>{if(reduced.matches)showScene();},{passive:true});
  addEventListener('resize',()=>{scenes.forEach(s=>{sizeScene(s);paint(s);});showScene();});
  update();
})();
