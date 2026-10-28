(function (Game) {
  const el=function (id) { return document.getElementById(id); };
  Game.Presentation={
    last:{},steps:{},announced:{},resetTimer:null,flairTimer:null,lastFlair:-Infinity,
    apply:function () {
      document.body.classList.toggle('presentation-spectral',Game.player.settings.visualTheme===1);
      if(!Game.player.settings.visuals || !Game.player.settings.resetVisuals) this.clearReset();
    },
    init:function () {
      const presentation=this;
      ['audioTheme','visualTheme','resetVisuals'].forEach(function (key) {
        el('setting-'+key).addEventListener('change',function () {
          Game.player.settings[key]=Number(this.type==='checkbox'?this.checked:this.value);
          Game.FieldWaves.clear();presentation.apply();Game.Save.save();
        });
      });
      el('preview-direction').addEventListener('click',function () {
        const stop=el('stop-direction-preview'),status=el('direction-preview-status');
        Game.AudioDirections.stopPreview();
        const token=(presentation.previewDirectionToken||0)+1;presentation.previewDirectionToken=token;
        if(!Game.player.settings.sound || !Game.player.settings.volume) { status.textContent='Enable Sound and raise the volume to hear the preview.';return; }
        stop.hidden=false;status.textContent='Playing '+Game.AudioDirections.names[Game.player.settings.audioTheme]+' · same event sequence for each direction';
        Game.AudioDirections.previewSelected(function () { if(token!==presentation.previewDirectionToken)return;stop.hidden=true;status.textContent='Preview stopped. Choose another direction to compare.'; });
      });
      el('stop-direction-preview').addEventListener('click',function () { Game.AudioDirections.stopPreview(); });
      el('setting-audioTheme').addEventListener('change',function () { Game.AudioDirections.stopPreview(); });
      el('setting-sound').addEventListener('change',function () { Game.AudioDirections.stopPreview(); });
      const acknowledge=function (event) {
        let target=event.target.closest('[data-attention]'),changed=false;
        while(target) {
          target.dataset.attention.split(' ').forEach(function (key) {
            const pending=presentation.targets && presentation.targets[key];if(!pending || !pending.pending)return;
            const version=Number(target.getAttribute('data-attention-'+key.replace(/[^a-z0-9]/gi,'-'))||1);
            Game.player.ui.attention[key]=version;changed=true;
          });
          target.classList.remove('is-new-unlock');target=target.parentElement && target.parentElement.closest('[data-attention]');
        }
        if(changed)Game.Save.save();
      };
      document.addEventListener('pointerdown',acknowledge,true);document.addEventListener('focusin',acknowledge,true);
      // A newly unlocked feature is announced through the existing sound bus.
      // No independent ambient audio loop or full-screen animation loop is added.
      this.apply();
    },
    mark:function (node,key,available,version) {
      if(!node)return;
      version=version||1;
      const keys=(node.dataset.attention||'').split(' ').filter(Boolean);if(!keys.includes(key)) { keys.push(key);node.dataset.attention=keys.join(' '); }
      const attribute='data-attention-'+key.replace(/[^a-z0-9]/gi,'-');if(node.getAttribute(attribute)!==String(version))node.setAttribute(attribute,String(version));
      this.targets[key]={node:node,pending:!!available && (Game.player.ui.attention[key]||0)<version};
      if(available && (Game.player.ui.attention[key]||0)<version && !this.announced[key+':'+version]) {
        this.announced[key+':'+version]=true;
        const now=performance.now();
        if(now-this.lastFlair>2500 && !(Game.Offline && Game.Offline.busy)) {
          this.lastFlair=now;if(Game.player.settings.perkSound)this.playTone('discovery');
          if(Game.player.settings.visuals && Game.player.settings.perkVisuals) {
            const flair=el('discovery-flair');flair.textContent='New possibility · '+(node.getAttribute('data-discovery-name')||node.textContent.trim().slice(0,48));flair.hidden=false;
            clearTimeout(this.flairTimer);this.flairTimer=setTimeout(function () { flair.hidden=true; },3500);
          }
        }
      }
    },
    sync:function () {
      const p=Game.player,ui=this;this.targets={};
      this.mark(el('prestige-tab'),'prestige',p.prestige.times.gt(0));
      this.mark(el('prestige-tab'),'perfect',Game.Symmetry.discovered(.9));
      const buyers=Game.Automation.definitions(),buyerCount=buyers.filter(function (buyer) { return Game.Automation.unlocked(buyer.id); }).length;
      const challengeCount=Game.CONFIG.AUTOMATION.buyers.filter(function (_,index) { return Game.Discovery.challenge(index+1); }).length;
      this.mark(el('automation-tab'),'automation',buyerCount>0,buyerCount);
      this.mark(el('challenges-tab'),'challenges',challengeCount>0,challengeCount);
      this.mark(el('layer-symmetry'),'symmetry',Game.Symmetry.unlocked());
      this.mark(el('unified-interaction'),'unified',Game.Symmetry.discovered(.5));
      this.mark(el('break-symmetry'),'breaking',Game.Asymmetry.discovered());
      this.mark(el('asymmetry-tab'),'asymmetry',Game.Asymmetry.discovered());
      this.mark(el('open-stabilization'),'stabilize',!el('stabilization-panel').hidden);
      const achievements=Object.values(p.achievements).filter(Boolean).length;
      this.mark(el('achievements-tab'),'achievements',achievements>0,achievements);
      const lore=el('lore-entries').childElementCount;this.mark(el('lore-tab'),'lore',lore>1,lore);
      Game.CONFIG.GENERATORS.forEach(function (gen) { const node=Game.UI.generatorNodes[gen.id].card;ui.mark(node,'gen:'+gen.id,Game.Discovery.generator(gen.id)); });
      Object.keys(Game.PrestigeUI.nodes).forEach(function (id) { ui.mark(Game.PrestigeUI.nodes[id],'skill:'+id,Game.Discovery.skill(id)); });
      Object.keys(Game.SymmetryUI.upgrades).forEach(function (id) { ui.mark(Game.SymmetryUI.upgrades[id],'unified:'+id,Game.Symmetry.discovered(Game.CONFIG.SYMMETRY.upgrades[id].perfect?1:.5)); });
      buyers.forEach(function (buyer) { ui.mark(Game.AutomationUI.rows[buyer.id],'auto:'+buyer.id,Game.Automation.unlocked(buyer.id),Game.Automation.advanced(buyer.id)?2:1); });
      Game.CONFIG.AUTOMATION.buyers.forEach(function (buyer,index) { ui.mark(Game.AutomationUI.tracks[buyer.id],'track:'+buyer.id,Game.Discovery.challenge(index+1)); });
      Object.keys(Game.AsymmetryUI.cards).forEach(function (id) { ui.mark(Game.AsymmetryUI.cards[id],'asym:'+id,Game.Asymmetry.discovered()); });
      const pendingByNode=new Map();Object.values(this.targets).forEach(function (target) { pendingByNode.set(target.node,!!(pendingByNode.get(target.node)||target.pending)); });
      pendingByNode.forEach(function (pending,node) { if(node.classList.contains('is-new-unlock')!==pending)node.classList.toggle('is-new-unlock',pending); });
    },
    playTone:function (kind) {
      if(Game.player.settings.audioTheme>=2 && Game.AudioDirections) { Game.AudioDirections.play(kind);return; }
      const audio=Game.Audio,p=Game.player,settings=p.settings;
      if(!settings.sound || !settings.volume || audio.shouldMute() || Game.Loop.catchingUp)return;
      if((kind==='discovery'||kind==='break') && !settings.perkSound)return;
      audio.start();if(!audio.context || audio.context.state!=='running' || audio.voices>=Game.CONFIG.AUDIO.maxVoices)return;
      const ctx=audio.context,now=ctx.currentTime,important=['discovery','break','stabilize','preview'].includes(kind);
      if(now-(this.last[kind]===undefined?-10:this.last[kind])<(important?1:.32))return;
      this.last[kind]=now;
      const step=this.steps[kind]||0;this.steps[kind]=step+1;
      const stage=audio.musicStage(),chord=Math.floor(p.time.realPlayed/16)%4,roots=[0,-4,3,-2],scale=[0,2,3,7,10,12,14,15];
      const support=['fieldExcitation','fieldCoupling','fieldOscillation','energyResonance'].includes(kind),bright=['fluctuation','quantumResonance','alignment'].includes(kind);
      const motif=[0,2,1,4,3,2,5,4],semitone=important?0:scale[(motif[step%motif.length]+(bright?2:0))%scale.length];
      const rate=audio.fluctRate(),base=110*Math.pow(2,(roots[chord]+semitone)/12)*(support?.5:bright?2:1)*rate;
      const symmetry=Game.Symmetry.intensity(),notes=kind==='break'?[0,1,7,13,-12]:important?[0,7,12,15,19]:stage>=3?[0,7,12]:[0,12];
      const bus=ctx.createGain(),filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=important?2400:bright?1600:850;filter.Q.value=.45;
      bus.gain.value=important?.095:.035;filter.connect(bus);bus.connect(audio.master);bus.connect(audio.delay);
      const duration=(kind==='break'?3:important?2.4:support?1.9:1.3)/rate,voices=[];let ended=0;
      audio.voices++;
      notes.forEach(function (note,index) {
        const osc=ctx.createOscillator(),gain=ctx.createGain(),pan=ctx.createStereoPanner();
        const start=now+(important?index*.09:index*.012),frequency=base*Math.pow(2,note/12);
        osc.type=index===0?'triangle':'sine';osc.frequency.setValueAtTime(frequency,start);
        if(kind==='break')osc.frequency.exponentialRampToValueAtTime(Math.max(24,frequency*.42),start+duration);
        const peak=index===0?.5:.22/(index+1);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(peak,start+.045);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
        pan.pan.value=(index%2?1:-1)*.26*(1-symmetry);osc.connect(gain);gain.connect(pan);pan.connect(filter);
        osc.onended=function () { osc.disconnect();gain.disconnect();pan.disconnect();if(++ended===notes.length) { filter.disconnect();bus.disconnect();audio.voices--; } };
        osc.start(start);osc.stop(start+duration+.03);voices.push(osc);
      });
    },
    clearReset:function () { clearTimeout(this.resetTimer);const layer=el('reset-presentation');if(layer) { layer.hidden=true;layer.removeAttribute('data-kind'); } },
    reset:function (kind) {
      if(kind==='break')this.playTone('break');
      if(!Game.player.settings.resetVisuals || !Game.player.settings.visuals || document.hidden || Game.Loop.catchingUp)return;
      this.clearReset();
      const layer=el('reset-presentation'),geometry=layer.querySelector('.reset-geometry'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      layer.dataset.kind=kind;layer.classList.toggle('reduced-motion',reduced);
      layer.querySelector('.reset-caption').textContent=kind==='break'?'Difference remains.':'A pattern survives.';
      let svg='<svg viewBox="0 0 1000 1000" preserveAspectRatio="none">';
      if(kind==='break') {
        for(let i=0;i<14;i++) {
          const a=i*Math.PI*2/14,b=(i+1)*Math.PI*2/14,x=500+Math.cos(a)*1300,y=500+Math.sin(a)*1300,x2=500+Math.cos(b)*1300,y2=500+Math.sin(b)*1300;
          svg+='<polygon points="500,500 '+x+','+y+' '+x2+','+y2+'" style="--tx:'+Math.cos((a+b)/2)*50+'px;--ty:'+Math.sin((a+b)/2)*50+'px;--turn:'+(i%2?1:-1)*3+'deg"/>';
        }
      } else {
        for(let i=0;i<14;i++)svg+='<ellipse cx="500" cy="500" rx="'+(90+i*34)+'" ry="'+(30+i*18)+'" style="--delay:'+i*20+'ms"/>';
        svg+='<path d="M0 500H1000M500 0V1000"/>';
      }
      geometry.innerHTML=svg+'</svg>';layer.hidden=false;
      this.resetTimer=setTimeout(function () { Game.Presentation.clearReset(); },reduced?650:kind==='break'?3300:2000);
    },
    drawWaves:function (waves,now) {
      const ctx=waves.context,w=waves.width,h=waves.height,symmetry=Game.Symmetry.intensity();
      ctx.setTransform(waves.dpr,0,0,waves.dpr,0,0);ctx.clearRect(0,0,w,h);ctx.lineWidth=.8;
      waves.waves.slice(-8).forEach(function (wave,index) {
        const age=(now-wave.started)/(Game.CONFIG.FIELD_EXCITATION.waveDuration*1000),t=waves.reducedMotion.matches?.4:age;
        const opacity=Math.max(0,Math.sin(Math.PI*age))*.32/Math.sqrt(Math.max(1,waves.waves.length/4));
        const cx=(wave.x*(1-symmetry)+.5*symmetry)*w,cy=(wave.y*(1-symmetry)+.5*symmetry)*h,span=Math.min(w*.65,300)*(wave.scale||1);
        for(let band=0;band<3;band++) {
          ctx.strokeStyle=band===0?'#97e9df':band===1?'#bca0ed':'#e9c68d';ctx.globalAlpha=opacity*(1-band*.22);ctx.beginPath();
          for(let i=0;i<=90;i++) { const u=i/90,a=u*Math.PI*2,r=span*(.27+.05*Math.sin(a*3+t*5*(1-symmetry)+index));const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*(r*.32+band*7)+Math.cos(a*4+t*3)*9*(1-symmetry);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y); }
          ctx.closePath();ctx.stroke();
        }
      });ctx.globalAlpha=1;
    }
  };
  const init=Game.UI.init,render=Game.UI.render;
  Game.UI.init=function () { init.call(this);Game.Presentation.init(); };
  Game.UI.render=function () { if(Game.Offline && Game.Offline.processing)return;render.call(this);Game.Presentation.apply();Game.Presentation.sync(); };
})(window.CosmicIdle);
