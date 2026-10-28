(function (Game) {
  const clamp=function (n) {return Math.max(0,Math.min(1,n));},smooth=function (n) {n=clamp(n);return n*n*(3-2*n);},hash=function (n) {return ((Math.sin(n*127.1+31.7)*43758.5453)%1+1)%1;};
  Game.BreakFX={
    duration:7.5,frame:null,
    pause:function () {cancelAnimationFrame(this.frame);this.frame=null;},
    stop:function () {this.pause();if(this.context)this.context.clearRect(0,0,this.width,this.height);},
    resize:function () {
      if(!this.canvas)return;const bounds=this.canvas.parentElement.getBoundingClientRect();this.width=bounds.width;this.height=bounds.height;if(!this.width||!this.height)return;
      const ratio=Math.min(devicePixelRatio||1,1.35);this.canvas.width=Math.round(this.width*ratio);this.canvas.height=Math.round(this.height*ratio);this.context.setTransform(ratio,0,0,ratio,0,0);
    },
    start:function (layer) {
      this.pause();if(!this.canvas){this.canvas=document.createElement('canvas');this.canvas.className='mirror-depth';this.canvas.setAttribute('aria-hidden','true');layer.insertBefore(this.canvas,layer.querySelector('.reset-caption'));this.context=this.canvas.getContext('2d');window.addEventListener('resize',function(){if(Game.BreakFX.frame)Game.BreakFX.resize();});}
      this.resize();const fx=this;this.started=performance.now();this.lastDraw=-Infinity;
      const frame=function (now) {const time=(now-fx.started)/1000;if(layer.hidden)return;if(now-fx.lastDraw>=1000/30){fx.lastDraw=now;fx.draw(time);}if(time<fx.duration)fx.frame=requestAnimationFrame(frame);else fx.frame=null;};this.frame=requestAnimationFrame(frame);
    },
    glow:function (x,y,radius,color,strength) {
      if(radius<=0||strength<=0)return;const c=this.context,g=c.createRadialGradient(x,y,0,x,y,radius);g.addColorStop(0,color+strength+')');g.addColorStop(.15,color+(strength*.45)+')');g.addColorStop(1,color+'0)');c.fillStyle=g;c.fillRect(x-radius,y-radius,radius*2,radius*2);
    },
    draw:function (time) {
      if(!this.context||!this.width||!this.height)return;const c=this.context,w=this.width,h=this.height,t=clamp(time/this.duration)*this.duration,cx=w*.435,cy=h*.445,span=Math.min(w,h);
      c.clearRect(0,0,w,h);if(time>=this.duration)return;
      const stress=smooth(t/1.5),early=1-smooth((t-3.25)/1.15);
      c.globalCompositeOperation='screen';
      // A held star field bends toward the impact, then separates into glints.
      for(let i=0;i<170;i++){
        const x=hash(i+1)*w,y=hash(i+301)*h,depth=.2+hash(i+501)*.8,shift=stress*depth*12;
        c.strokeStyle='rgba(185,211,233,'+((.12+.3*hash(i+41))*early)+')';c.lineWidth=.5+depth*.5;c.beginPath();c.moveTo(x,y);c.lineTo(x+(cx-x)/w*shift,y+(cy-y)/h*shift);c.stroke();
      }
      this.glow(cx,cy,span*(.18+.09*stress),'rgba(166,147,226,',early*.15);
      for(let ring=0;ring<4;ring++){
        const r=span*(.11+ring*.055)*(1-stress*.72);c.strokeStyle='rgba(160,220,221,'+(.12*early*Math.sin(Math.PI*clamp(t/2)))+')';c.lineWidth=.6;c.beginPath();c.ellipse(cx,cy,r,r*.58,-.25,0,Math.PI*2);c.stroke();
      }
      // One impact flash, followed by small glass slivers with bounded trails.
      const flash=Math.max(0,1-Math.abs(t-1.48)/.35);this.glow(cx,cy,span*(.08+flash*.24),'rgba(220,238,248,',flash*.7);
      for(let i=0;i<80;i++){
        const birth=1.5+hash(i+71)*.9,age=t-birth;if(age<0||age>3.1)continue;
        const angle=hash(i+901)*Math.PI*2,speed=span*(.06+hash(i+151)*.23),dx=Math.cos(angle)*speed,dy=Math.sin(angle)*speed,x=cx+dx*age,y=cy+dy*age+age*age*span*.045,alpha=Math.sin(Math.PI*age/3.1)*.7;
        c.save();c.translate(x,y);c.rotate(angle+age*(hash(i+181)-.5));c.strokeStyle=(i%3===0?'rgba(226,196,152,':i%3===1?'rgba(188,162,232,':'rgba(164,220,228,')+alpha+')';c.fillStyle='rgba(190,215,234,'+alpha*.15+')';const size=2+hash(i+11)*8;c.beginPath();c.moveTo(-size,-size*.3);c.lineTo(size,size*.2);c.lineTo(-size*.3,size*.8);c.closePath();c.fill();c.stroke();c.restore();
      }
      // A narrow fault remains visible through the blackout, then a deliberately
      // unbalanced crystal replaces the perfect, mirrored field.
      const remnant=smooth((t-4.5)/.8)*(1-smooth((t-6.65)/.85)),rx=w*.5,ry=h*.44;
      this.glow(rx,ry,span*.28,'rgba(162,102,192,',remnant*.2);this.glow(rx-5,ry,span*.12,'rgba(236,170,105,',remnant*.28);
      c.strokeStyle='rgba(212,178,235,'+remnant*.6+')';c.lineWidth=1;c.beginPath();c.moveTo(rx-5,ry-span*.2);c.lineTo(rx+8,ry-span*.08);c.lineTo(rx-6,ry);c.lineTo(rx+4,ry+span*.04);c.lineTo(rx-9,ry+span*.2);c.stroke();
      if(remnant>.001){
        const size=span*.035*(.92+.08*Math.sin(t*3));c.save();c.translate(rx,ry);c.rotate(-.12);c.fillStyle='rgba(224,182,126,'+remnant*.72+')';c.strokeStyle='rgba(245,212,158,'+remnant+')';c.beginPath();c.moveTo(0,-size);c.lineTo(size*.55,size*.1);c.lineTo(-size*.18,size);c.lineTo(-size*.8,-size*.2);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(0,-size);c.lineTo(-size*.12,0);c.lineTo(-size*.18,size);c.moveTo(-size*.8,-size*.2);c.lineTo(size*.55,size*.1);c.stroke();c.restore();
        for(let i=0;i<24;i++){const a=hash(i+400)*Math.PI*2,r=span*(.07+.13*hash(i+920))+Math.sin(t+i)*4;c.fillStyle='rgba(194,176,223,'+(remnant*(.12+.3*hash(i+802)))+')';c.fillRect(rx+Math.cos(a)*r,ry+Math.sin(a)*r*.5,1,1);}
      }
      c.globalCompositeOperation='source-over';
    }
  };
  // A separate restrained score: tension, glass-like overtones, falling notes,
  // and an unresolved remnant. The original Condense score is untouched.
  Game.Audio.playBreakMusic=function () {
    const audio=this,s=Game.player.settings;if(!s.sound||!s.perkSound||!s.volume||this.shouldMute()||Game.Loop.catchingUp)return;
    this.start();if(!this.context||this.context.state!=='running'||this.voices>=Game.CONFIG.AUDIO.maxVoices)return;
    if(this.breakScore)this.breakScore.stop();const ctx=this.context,now=ctx.currentTime,bus=ctx.createGain(),filter=ctx.createBiquadFilter(),nodes=[];let remaining=0,cleaned=false;
    bus.gain.value=.55;filter.type='lowpass';filter.frequency.value=3600;filter.connect(bus);bus.connect(this.master);bus.connect(this.delay);this.voices++;
    const cleanup=function(){if(cleaned)return;cleaned=true;filter.disconnect();bus.disconnect();audio.voices--;if(audio.breakScore===score)audio.breakScore=null;};
    const note=function(freq,start,duration,peak,end){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=freq<100?'sine':'triangle';osc.frequency.setValueAtTime(freq,now+start);if(end)osc.frequency.exponentialRampToValueAtTime(end,now+start+duration);gain.gain.setValueAtTime(.0001,now+start);gain.gain.exponentialRampToValueAtTime(peak,now+start+(start<1?.15:.018));gain.gain.exponentialRampToValueAtTime(.0001,now+start+duration);osc.connect(gain);gain.connect(filter);osc.onended=function(){osc.disconnect();gain.disconnect();if(--remaining===0)cleanup();};remaining++;nodes.push(osc);osc.start(now+start);osc.stop(now+start+duration+.03);};
    const score={stop:function(){if(cleaned)return;bus.gain.setTargetAtTime(0,ctx.currentTime,.03);nodes.forEach(function(node){try{node.stop(ctx.currentTime+.15);}catch(error){}});}};this.breakScore=score;
    note(55,0,2.2,.09,77.78);[659.26,987.77,1318.51,1567.98].forEach(function(f,i){note(f,1.45+i*.045,1.7-i*.15,.032/(1+i*.4),f*.94);});
    const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.28),ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(hash(i+772)*2-1)*Math.pow(1-i/data.length,2);
    const crack=ctx.createBufferSource(),band=ctx.createBiquadFilter(),gain=ctx.createGain();crack.buffer=buffer;band.type='bandpass';band.frequency.value=2800;band.Q.value=.65;gain.gain.setValueAtTime(.0001,now+1.48);gain.gain.exponentialRampToValueAtTime(.08,now+1.485);gain.gain.exponentialRampToValueAtTime(.0001,now+1.76);crack.connect(band);band.connect(gain);gain.connect(filter);remaining++;nodes.push(crack);crack.onended=function(){crack.disconnect();band.disconnect();gain.disconnect();if(--remaining===0)cleanup();};crack.start(now+1.48);
    [440,329.63,246.94,185,138.59].forEach(function(f,i){note(f,2.3+i*.23,1.4,.025,f*.55);});[110,164.81,207.65,293.66].forEach(function(f,i){note(f,4.85+i*.065,2.4,.025/(1+i*.5));});
  };
})(window.CosmicIdle);
