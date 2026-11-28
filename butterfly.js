(() => {
  const template=document.querySelector('.mfv-butterfly-surface');
  if(!template)return;
  const source=template.querySelector('.mfv-butterfly');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const outingDuration=header=>header?19000+Math.random()*7000:45000+Math.random()*15000;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  let raf=0,previous=0;
  // The decorative effect follows the device's reduced-motion preference.
  try{sessionStorage.removeItem('mfv-butterfly-paused');}catch{}
  // Each green section owns its artwork and route in local section coordinates.
  const scenes=[...document.querySelectorAll('.header-band,.statement,.digital,.footer')].map((section,index)=>{
    const layer=document.createElement('div');layer.className='mfv-butterfly-surface';layer.setAttribute('aria-hidden','true');
    const art=source.cloneNode(true);layer.append(art);section.append(layer);
    art.querySelectorAll('[id]').forEach(node=>{
      const old=node.id,next=`mfv-${index}-${old}`;node.id=next;
      art.querySelectorAll(`[href="#${old}"]`).forEach(use=>use.setAttribute('href',`#${next}`));
      art.querySelectorAll('[clip-path]').forEach(use=>{if(use.getAttribute('clip-path')===`url(#${old})`)use.setAttribute('clip-path',`url(#${next})`);});
    });
    if(section.classList.contains('footer')){
      // Keep the subtle cream rendering, but occlude the divider beneath the silhouette.
      const svg=art.querySelector('svg'),ns='http://www.w3.org/2000/svg';
      const filter=document.createElementNS(ns,'filter');
      const filterId=`mfv-${index}-footer-foreground`;
      filter.setAttribute('id',filterId);
      filter.setAttribute('color-interpolation-filters','sRGB');
      filter.setAttribute('x','-25%');filter.setAttribute('y','-25%');
      filter.setAttribute('width','150%');filter.setAttribute('height','150%');
      filter.innerHTML=`<feFlood flood-color="${getComputedStyle(section).backgroundColor}" result="green"/>
        <feComposite in="green" in2="SourceAlpha" operator="in" result="silhouette"/>
        <feComponentTransfer in="SourceGraphic" result="soft-art"><feFuncA type="linear" slope="0.34"/></feComponentTransfer>
        <feComposite in="soft-art" in2="silhouette" operator="atop"/>`;
      svg.querySelector('defs').append(filter);svg.setAttribute('filter',`url(#${filterId})`);
    }
    art.classList.toggle('on-header',section.classList.contains('header-band'));
    return{section,art,layer,header:section.classList.contains('header-band'),footer:section.classList.contains('footer'),statement:section.classList.contains('statement'),digital:section.classList.contains('digital'),zoneHeight:0,point:null,heading:{x:Math.random()<.5?-1:1,y:0},bank:null,phase:Math.random()*Math.PI*2,open:.98,bob:0,flight:null,elapsed:0,width:0,height:0,obstacles:[],waypoints:[],safe:false,scale:1,outing:0,outingLimit:outingDuration(section.classList.contains('header-band')),cooldown:0,fadeOut:0};
  });
  template.remove();
  function bounds(scene){
    const right=Math.max(9,scene.width-scene.art.offsetWidth-8);
    // Both entrances and the whole flight stay in the requested right-hand area.
    const requestedLeft=scene.width>760?(scene.header&&scene.navRoute?scene.navRoute.left:scene.statement?scene.width*.6:8):8;
    const radius=scene.art.offsetWidth*.48,cy=scene.art.offsetHeight*.525;
    const top=Math.max(6,Math.ceil(radius-cy)+6);
    return{left:Math.min(right,Math.max(8,requestedLeft)),right:scene.header&&scene.navRoute?Math.min(right,scene.navRoute.right):right,top,bottom:Math.max(top+1,(scene.zoneHeight||scene.height)-cy-radius-6)};
  }
  function footprint(scene,p,padding=8,scale=1){
    const w=scene.art.offsetWidth,h=scene.art.offsetHeight;
    // Rotation-safe envelope around the thorax; flight heading can now turn freely.
    const radius=w*.48*scale+padding,cx=p.x+w*.5,cy=p.y+h*.525;
    return{left:cx-radius,right:cx+radius,top:cy-radius,bottom:cy+radius};
  }
  function clearPoint(scene,p,padding=8,scale=1){
    const a=footprint(scene,p,padding,scale);
    return !scene.obstacles.some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top);
  }
  function measureContent(scene){
    const root=scene.section.getBoundingClientRect(),rects=[];
    const add=r=>{if(r.width>0&&r.height>0)rects.push({left:r.left-root.left,right:r.right-root.left,top:r.top-root.top,bottom:r.bottom-root.top});};
    // The header crosses behind navigation labels; links remain above the decorative layer.
    if(scene.header&&scene.width>760){
      const nav=scene.section.querySelector('nav'),r=nav?.getBoundingClientRect();
      scene.navRoute=r?{left:r.left-root.left-scene.art.offsetWidth*.5,right:r.right-root.left-scene.art.offsetWidth*.5}:null;
      scene.obstacles=[];scene.safe=!!r;
      const b=bounds(scene);scene.waypoints=[{x:b.left,y:(b.top+b.bottom)/2}];scene.smallWaypoints=[];return;
    }
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
    // Prefer pockets with room in two dimensions, instead of spawning in a narrow lane.
    let chosen=points[Math.floor(Math.random()*points.length)],best=-1;
    const reach=Math.max(24,Math.min(56,scene.art.offsetWidth*.45));
    for(let i=0;i<10;i++){
      const p=points[Math.floor(Math.random()*points.length)];let score=Math.random()*.15;
      for(let j=0;j<8;j++){
        const a=j*Math.PI/4;
        if(clearPosition(scene,{x:p.x+Math.cos(a)*reach,y:p.y+Math.sin(a)*reach}))score++;
      }
      if(score>best){best=score;chosen=p;}
    }
    return{...chosen};
  }
  const angleDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  function clearPosition(scene,p){
    const b=bounds(scene);
    return p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom&&clearPoint(scene,p);
  }
  function clearDistance(scene,angle,range){
    const dx=Math.cos(angle),dy=Math.sin(angle);let clear=0;
    for(let i=1;i<=12;i++){
      const distance=range*i/12;
      if(!clearPosition(scene,{x:scene.point.x+dx*distance,y:scene.point.y+dy*distance}))break;
      clear=distance;
    }
    return clear;
  }
  function loopPattern(scene,f){
    const heading=Math.atan2(f.vy,f.vx),speed=Math.hypot(f.vx,f.vy)||f.speed;
    const radii=scene.width<=760?[38,30,23]:[70,56,44];
    const firstRadius=Math.floor(Math.random()*radii.length);
    const ordered=radii.slice(firstRadius).concat(radii.slice(0,firstRadius));
    for(const requestedRadius of ordered){
      const radius=Math.max(requestedRadius,speed/1.05);
      const first=Math.random()<.5?1:-1;
      for(const sign of [first,-first]){
        const center={x:scene.point.x-Math.sin(heading)*radius*sign,y:scene.point.y+Math.cos(heading)*radius*sign};
        const start=heading-sign*Math.PI/2;let safe=true;
        for(let i=0;i<32;i++){
          const angle=start+sign*i/32*Math.PI*2;
          if(!clearPosition(scene,{x:center.x+Math.cos(angle)*radius,y:center.y+Math.sin(angle)*radius})){safe=false;break;}
        }
        if(safe){
          const omega=Math.min(1.1,speed/radius);
          return{kind:'loop',sign,rate:sign*Math.asin(Math.min(.7,omega*.55))/.75,
            started:f.clock,lastAngle:heading,rotated:0,timeout:Math.min(19000,Math.PI*2/omega*1350)};
        }
      }
    }
    return null;
  }
  function nextFlight(scene){
    // Free steering and velocity, not an endpoint or a pre-drawn curve.
    let angle=Math.atan2(scene.heading.y,scene.heading.x),room=-1;
    for(let i=0;i<16;i++){
      const candidate=i*Math.PI/8,clear=clearDistance(scene,candidate,85);
      const score=clear+Math.random()*12;
      if(score>room){room=score;angle=candidate;}
    }
    const speed=30+Math.random()*14;
    scene.flight={vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
      turn:0,turnTarget:(Math.random()-.5)*1.1,steerTime:0,steerLimit:1400+Math.random()*1800,
      speed,speedTarget:speed,windX:0,windY:0,windTargetX:0,windTargetY:0,
      cadence:300+Math.random()*70,burst:900+Math.random()*650,coast:850+Math.random()*850,
      clock:Math.random()*500,blocked:0,pattern:null,patternNext:2400+Math.random()*2000,completedLoops:0};scene.elapsed=0;
    scene.heading={x:Math.cos(angle),y:Math.sin(angle)};
  }
  function entrance(scene){
    // Reposition only while invisible, never in response to scrolling.
    scene.scale=1;scene.point=randomPoint(scene);scene.art.classList.remove('is-perched');
    nextFlight(scene);
    if(scene.header&&scene.navRoute){const b=bounds(scene);scene.point={x:b.left,y:(b.top+b.bottom)/2};scene.flight.headerTime=0;scene.flight.headerPhase=Math.random()*.24-.12;}
    scene.bank=Math.atan2(scene.flight.vy,scene.flight.vx)*180/Math.PI+90;paint(scene);
  }
  function sizeScene(scene){
    const width=scene.section.clientWidth,height=scene.section.clientHeight;
    if(scene.header){scene.art.style.width='';const natural=scene.art.offsetWidth;scene.art.style.width=`${Math.min(natural,width<760?44:64,Math.max(42,height-18))}px`;}
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
      if(width<760)scene.art.style.width=`${Math.min(78,width*.2)}px`;
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
    // Keep the rotation-safe silhouette within its section. No scroll-coupled motion.
    const x=clamp(scene.point.x,b.left,b.right),y=clamp(scene.point.y,b.top,b.bottom);
    scene.art.style.transform=`translate3d(${x}px,${y}px,0) rotate(${scene.bank||0}deg) scale(${scene.scale||1})`;
  }
  function advance(scene,delta){
    const f=scene.flight,dt=Math.min(delta,50)/1000;
    f.clock+=delta;f.steerTime+=delta;scene.elapsed+=delta;
    if(f.steerTime>=f.steerLimit){
      f.steerTime=0;f.steerLimit=1400+Math.random()*2200;
      f.turnTarget=(Math.random()-.5)*1.35;f.speedTarget=30+Math.random()*18;
      f.windTargetX=(Math.random()-.5)*8;f.windTargetY=(Math.random()-.5)*8;
    }
    if(!f.pattern&&f.clock>=f.patternNext){
      f.pattern=Math.random()<.6?loopPattern(scene,f):null;f.patternNext=f.clock+4200+Math.random()*3500;
      if(!f.pattern)f.turnTarget=(Math.random()<.5?-1:1)*(.45+Math.random()*.3);
      if(f.pattern)scene.outingLimit=Math.min(scene.header?34000:60000,Math.max(scene.outingLimit||0,(scene.outing||0)+f.pattern.timeout+600));
    }
    if(f.pattern){
      const currentAngle=Math.atan2(f.vy,f.vx);
      f.pattern.rotated+=f.pattern.sign*angleDifference(currentAngle,f.pattern.lastAngle);
      f.pattern.lastAngle=currentAngle;
      if(f.pattern.rotated>=5.9||f.clock-f.pattern.started>f.pattern.timeout){
        if(f.pattern.rotated>=5.9)f.completedLoops++;
        f.pattern=null;f.patternNext=f.clock+4200+Math.random()*4500;
        f.turnTarget=(Math.random()-.5)*1.2;
      }else{
        // Sustained bank creates a loose loop through velocity, not a circular rail.
        const t=(f.clock-f.pattern.started)/1000;
        f.turnTarget=f.pattern.rate*(.94+.1*Math.sin(t*1.7));
      }
    }
    const drift=1-Math.exp(-dt/1.1);
    f.turn+=(f.turnTarget-f.turn)*drift;f.speed+=(f.speedTarget-f.speed)*drift;
    f.windX+=(f.windTargetX-f.windX)*drift;f.windY+=(f.windTargetY-f.windY)*drift;
    const cycle=f.burst+f.coast,cycleTime=f.clock%cycle;
    const glide=smooth((cycleTime-f.burst)/180)*(1-smooth((cycleTime-cycle+180)/180));
    scene.phase+=delta/f.cadence*Math.PI*2*(1-glide);
    if(scene.header&&scene.navRoute){
      const b=bounds(scene),span=Math.max(1,b.right-b.left);
      f.headerTime=(f.headerTime||0)+dt;
      // A broad S across the tabs, with a soft turn at each end and a shallow vertical sweep.
      const t=f.headerTime/(span/43)*Math.PI;
      const u=(1-Math.cos(t))/2;
      const amplitude=(b.bottom-b.top)*.43;
      const next={x:b.left+span*u,y:(b.top+b.bottom)/2+Math.sin(u*Math.PI*2+(f.headerPhase||0))*amplitude};
      f.vx=(next.x-scene.point.x)/Math.max(dt,.001);f.vy=(next.y-scene.point.y)/Math.max(dt,.001);
      scene.point=next;f.turn=Math.sin(u*Math.PI*2)*.22;f.pattern=null;f.blocked=0;
    }else{
    const current=Math.atan2(f.vy,f.vx),desired=current+f.turn*.75;
    const lookAhead=Math.max(32,Math.min(85,Math.hypot(f.vx,f.vy)*2.1));
    let steering=desired,best=-Infinity;
    for(const offset of [0,.32,-.32,.66,-.66,1.1,-1.1,1.65,-1.65,Math.PI]){
      const candidate=desired+offset,room=clearDistance(scene,candidate,lookAhead)/lookAhead;
      const score=room*3.5-Math.abs(angleDifference(candidate,current))*.14-Math.abs(offset)*.85;
      if(score>best){best=score;steering=candidate;}
    }
    const forward=clearDistance(scene,current,lookAhead)/lookAhead;
    const braking=.45+.55*smooth(forward/.8),speed=f.speed*(1.04-.2*glide)*braking;
    const response=1-Math.exp(-dt/.55);
    f.vx+=(Math.cos(steering)*speed+f.windX-f.vx)*response;
    f.vy+=(Math.sin(steering)*speed+f.windY-f.vy)*response;
    const next={x:scene.point.x+f.vx*dt,y:scene.point.y+f.vy*dt};
    if(clearPosition(scene,next)){
      scene.point=next;f.blocked=0;
    }else{
      // Slow and fade in a confined pocket rather than bounce off an invisible rail.
      f.vx*=.88;f.vy*=.88;f.blocked+=delta;
      if(f.blocked>350&&scene.fadeOut<=0)scene.fadeOut=1200;
    }
    }
    const velocity=Math.hypot(f.vx,f.vy);
    if(velocity>1){
      scene.heading={x:f.vx/velocity,y:f.vy/velocity};
      const target=Math.atan2(f.vy,f.vx)*180/Math.PI+90;
      if(scene.bank===null)scene.bank=target;
      const turn=angleDifference(target*Math.PI/180,scene.bank*Math.PI/180)*180/Math.PI;
      scene.bank+=turn*(1-Math.exp(-dt/.32));
    }
    const q=((scene.phase/(Math.PI*2))%1+1)%1;
    const beat=q<.56?.98-.74*smooth(q/.56):.24+.74*smooth((q-.56)/.44);
    const opening=beat*(1-glide)+.96*glide,lift=.14*(1-opening)*(1-glide);
    scene.open=opening;
    const bank=clamp(f.turn,-1,1)*.055;
    scene.art.style.setProperty('--wing-open',String(clamp(opening*(1-bank),.22,1)));
    scene.art.style.setProperty('--wing-right-open',String(clamp(opening*(1+bank)+.01*Math.sin(scene.phase)*(1-glide),.22,1)));
    scene.art.style.setProperty('--wing-lift',String(lift));
    scene.art.style.setProperty('--wing-right-lift',String(-lift));
    scene.art.style.setProperty('--hindwing-lag',`${.45*Math.sin(scene.phase-.25)*(1-glide)}deg`);
    scene.bob=0;scene.scale=1;
    scene.art.classList.toggle('is-gliding',glide>.5);
    scene.art.classList.toggle('is-looping',!!f.pattern);paint(scene);
  }
  function frame(time){
    const delta=previous?Math.min(time-previous,50):0;previous=time;
    const active=showScene();
    if(active){
      if(active.cooldown>0){active.cooldown=Math.max(0,active.cooldown-delta);if(active.cooldown===0){active.outing=0;active.outingLimit=outingDuration(active.header);entrance(active);}}
      else{
        advance(active,delta);active.outing+=delta;
        if(active.fadeOut>0){active.fadeOut-=delta;if(active.fadeOut<=0)active.cooldown=active.header?7000+Math.random()*6000:4000+Math.random()*3000;}
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
