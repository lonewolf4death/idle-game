(function (Game) {
  const el=function (id) { return document.getElementById(id); };
  Game.Presentation={
    last:{},steps:{},announced:{},resetTimer:null,flairTimer:null,lastFlair:-Infinity,
    breakDuration:6000,
    animationOptions:[['production','Energy flow'],['positiveFluct','Positive Fluct'],['negativeFluct','Negative Fluct'],['quantumResonance','Quantum Resonance'],['energyResonance','Energy Resonance'],['fieldExcitation','Field Excitation waves'],['fieldOscillation','Field Oscillation'],['fieldResonance','Field Resonance'],['fieldCoupling','Field Coupling'],['alignment','Field Alignment'],['symmetry','Symmetry geometry and echoes'],['stabilize','Stabilization'],['break','Break Symmetry'],['discovery','Discovery and unlock highlights'],['background','Energy number pulse'],['pattern','Purchased pattern completion']],
    animationEnabled:function (key) {
      const settings=Game.player.settings;
      return !!settings.visuals && (!settings.animations || settings.animations[key]!==0) && (!['break','stabilize'].includes(key)||!!settings.resetVisuals);
    },
    animationDiscovered:function (key) {
      if(false || !Game.Discovery)return true;
      const gen={positiveFluct:'quantumFluctuation',negativeFluct:'quantumFluctuation',quantumResonance:'coherentEnergy',energyResonance:'coherentEnergy',fieldExcitation:'fieldExcitation',fieldOscillation:'fieldOscillation',fieldResonance:'fieldResonance',fieldCoupling:'fieldCoupling'}[key];
      if(gen)return Game.Discovery.generator(gen);
      if(key==='alignment'||key==='symmetry')return Game.Symmetry.unlocked();
      if(key==='break')return Game.Asymmetry.discovered();
      if(key==='stabilize')return Game.player.structure.stabilizations.gt(0)||Game.Discovery.generator('coherentEnergy');
      return true;
    },
    syncAnimationSettings:function () {
      if(!el('animation-all') || el('settings-view').hidden)return;
      const settings=Game.player.settings,presentation=this,values=this.animationOptions.map(function (entry) { const input=el('animation-'+entry[0]);if(input){if(input.checked!==!!settings.animations[entry[0]])input.checked=!!settings.animations[entry[0]];const label=input.closest('label'),hidden=!presentation.animationDiscovered(entry[0]);if(label.hidden!==hidden)label.hidden=hidden;}return !!settings.animations[entry[0]]; });
      values.push(!!settings.condenseVisuals,!!settings.perkVisuals,!!settings.resetVisuals,!!settings.visuals);
      const all=el('animation-all');all.checked=values.every(Boolean);all.indeterminate=!all.checked && values.some(Boolean);
      ['condenseVisuals','perkVisuals','resetVisuals'].forEach(function (key) {el('setting-'+key).checked=!!settings[key];});el('setting-visuals').value=settings.visuals;
    },
    clearAnimations:function () {
      Game.FieldWaves.clear();Game.PerkFX.clear();this.clearReset();
      el('energy-effects').replaceChildren();el('discovery-flair').hidden=true;
    },
    apply:function () {
      document.body.classList.toggle('presentation-spectral',Game.player.settings.visualTheme===1);
      const presentation=this;['background','discovery','pattern','symmetry'].forEach(function (key) { document.body.classList.toggle('animation-no-'+key,!presentation.animationEnabled(key)); });
      const reset=el('reset-presentation');if(reset && !reset.hidden && !this.animationEnabled(reset.dataset.kind))this.clearReset();
      this.syncAnimationSettings();
    },
    init:function () {
      const presentation=this;
      this.animationOptions.forEach(function (entry) {
        const label=document.createElement('label'),text=document.createElement('span'),input=document.createElement('input');text.textContent=entry[1];input.type='checkbox';input.id='animation-'+entry[0];
        input.addEventListener('change',function () {
          const settings=Game.player.settings;settings.animations[entry[0]]=Number(this.checked);
          if(this.checked){if(!settings.visuals)settings.visuals=1;if(['break','stabilize'].includes(entry[0]))settings.resetVisuals=1;}
          presentation.clearAnimations();presentation.apply();Game.Save.save();
        });label.append(text,input);el('animation-options').appendChild(label);
      });
      // Keep the existing saved preferences and expose them with the other effects.
      ['condenseVisuals','perkVisuals'].forEach(function (key) { el('animation-options').appendChild(el('setting-'+key).closest('label')); });
      el('animation-all').addEventListener('change',function () {
        const settings=Game.player.settings,value=Number(this.checked);Object.keys(settings.animations).forEach(function (key) {settings.animations[key]=value;});
        settings.condenseVisuals=value;settings.perkVisuals=value;settings.resetVisuals=value;settings.visuals=value?Math.max(1,settings.visuals):0;
        presentation.clearAnimations();presentation.apply();Game.Save.save();
      });
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
          if(this.animationEnabled('discovery')) {
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
      if(!this.animationEnabled(kind) || document.hidden || Game.Loop.catchingUp)return;
      this.clearReset();
      const layer=el('reset-presentation'),geometry=layer.querySelector('.reset-geometry'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      layer.dataset.kind=kind;layer.classList.toggle('reduced-motion',reduced);
      layer.querySelector('.reset-caption').textContent=kind==='break'?'Difference remains.':'A pattern survives.';
      let svg='<svg viewBox="0 0 1000 1000" preserveAspectRatio="none">';
      if(kind==='break') {
        svg=this.mirrorGeometry();
      } else {
        for(let i=0;i<14;i++)svg+='<ellipse cx="500" cy="500" rx="'+(90+i*34)+'" ry="'+(30+i*18)+'" style="--delay:'+i*20+'ms"/>';
        svg+='<path d="M0 500H1000M500 0V1000"/>';
      }
      geometry.innerHTML=svg+'</svg>';layer.hidden=false;
      this.resetTimer=setTimeout(function () { Game.Presentation.clearReset(); },reduced?650:kind==='break'?this.breakDuration:2000);
    },
    mirrorGeometry:function () {
      // An irregular, shared mesh keeps the cracks continuous before shards fall.
      const cx=435,cy=445,count=12,radii=[125,350,1450],angles=Array.from({length:count},function (_,i) {return i*Math.PI*2/count+.09*Math.sin(i*2.4);});
      const rings=radii.map(function (radius,ring) {return angles.map(function (angle,i) {const r=radius*(1+.16*Math.sin(i*3.1+ring));return [cx+Math.cos(angle)*r,cy+Math.sin(angle)*r];});});
      let svg='<svg viewBox="0 0 1000 1000" preserveAspectRatio="none"><defs><linearGradient id="mirror-silver" x2=".8" y2="1"><stop stop-color="#c6e4eb" stop-opacity=".19"/><stop offset=".42" stop-color="#132733" stop-opacity=".07"/><stop offset=".6" stop-color="#a6b8d7" stop-opacity=".23"/><stop offset="1" stop-color="#0b111b" stop-opacity=".1"/></linearGradient><radialGradient id="mirror-impact"><stop stop-color="#e0eaf4" stop-opacity=".8"/><stop offset="1" stop-color="#a4b9d7" stop-opacity="0"/></radialGradient><g id="mirror-reflection"><rect width="1000" height="1000" fill="url(#mirror-silver)"/>';
      for(let band=0;band<8;band++)svg+='<path d="M-100 '+(240+band*65)+'C240 '+(30+band*90)+' 590 '+(870-band*50)+' 1100 '+(330+band*48)+'" fill="none" stroke="'+(band%2?'#adcbd2':'#c3b2db')+'" stroke-width="2"/>';
      svg+='</g></defs><circle class="mirror-impact" cx="'+cx+'" cy="'+cy+'" r="160" fill="url(#mirror-impact)"/>';
      let index=0;
      rings.forEach(function (ring,level) {ring.forEach(function (point,i) {
        const next=(i+1)%count,points=(level?[rings[level-1][i],point,ring[next],rings[level-1][next]]:[[cx,cy],point,ring[next]]).map(function (p) {return p.join(',');}).join(' '),angle=(angles[i]+(next?angles[next]:Math.PI*2))/2;
        const shift=25+level*23,delay=(i%4)*55+level*85,turn=(i%2?1:-1)*(8+level*5);
        svg+='<defs><clipPath id="mirror-clip-'+index+'"><polygon points="'+points+'"/></clipPath></defs><g class="mirror-shard" style="--tx:'+Math.cos(angle)*shift+'px;--ty:'+(30+Math.sin(angle)*shift)+'px;--fall:'+(180+(i%5)*40)+'px;--turn:'+turn+'deg;--tilt:'+(i%2?24:-28)+'deg;--shard-delay:'+delay+'ms"><use href="#mirror-reflection" clip-path="url(#mirror-clip-'+index+')" class="mirror-face"/><polygon class="mirror-edge" points="'+points+'" pathLength="1"/></g>';index++;
      });});return svg;
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
