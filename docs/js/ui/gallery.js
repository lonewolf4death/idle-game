(function (Game) {
  const el=id=>document.getElementById(id);
  const effects=[
    {id:'condense',name:'Condense Energy',duration:6.8,text:'The original inward compression, particle trails and Primordial Quanta core. Plays the original Condense score.'},
    {id:'stabilize',name:'Stabilization',duration:2,text:'Field rings align into a retained pattern, then fade.'},
    {id:'break',name:'Break Symmetry',duration:3.3,text:'The field fractures into separate facets, blacks out, and returns.'},
    {id:'field',name:'Field Excitation',duration:6,text:'The current field-wave renderer. Switch visual directions to compare contour drift and spectral orbital traces.'},
    {id:'production',name:'Energy flow',duration:2,text:'Fading generator-production signals, using the actual in-game effect styles.'},
    {id:'fluct-positive',name:'Positive Fluct',duration:2,text:'The positive Quantum Fluctuation pulse and its audio cue.'},
    {id:'fluct-negative',name:'Negative Fluct',duration:2,text:'The negative fluctuation treatment. Notes become slower and lower, as in the game.'},
    {id:'quantumResonance',name:'Quantum Resonance',duration:2.2,text:'A Quantum Resonance production pulse.'},
    {id:'energyResonance',name:'Energy Resonance',duration:2.2,text:'An Energy Resonance production pulse.'},
    {id:'fieldOscillation',name:'Field Oscillation',duration:2.2,text:'The Field Oscillation event pulse.'},
    {id:'fieldResonance',name:'Field Resonance',duration:2.2,text:'The Field Resonance event pulse.'},
    {id:'fieldCoupling',name:'Field Coupling',duration:2.2,text:'The Field Coupling event pulse.'},
    {id:'perk',name:'Skill purchase',duration:1.1,text:'The current perk awakening, expanding ring and ten gold flecks.'},
    {id:'discovery',name:'New discovery',duration:3.5,text:'The new-possibility banner and persistent unlock highlight.'},
    {id:'symmetry',name:'Symmetry buildup',duration:12,text:'Scrub from 0% to 100% to inspect the increasingly symmetric field and Perfect Symmetry geometry.'}
  ];
  Game.Gallery={
    effect:effects[0],time:0,playing:false,frame:null,lastDraw:-Infinity,serial:0,animations:[],baseWaves:[],lastBeat:-1,
    init:function () {
      // A disposable preview model; save, simulation and main modules are absent.
      Game.Loop={catchingUp:false};Game.Offline={busy:false};
      const p=Game.player;p.settings.audioTheme=2;p.settings.visualTheme=1;p.settings.muteUnfocused=0;p.settings.sound=1;p.settings.visuals=1;p.settings.resetVisuals=1;
      p.prestige.symmetry=1;p.symmetry.amount=Game.D(.6);p.symmetry.best=Game.D(1);p.resources.energy=Game.D('1e1000');p.stats.generatorsBought=Game.D(30);
      p.generators.energyDisturbance.purchased=Game.D(25);p.generators.quantumFluctuation.purchased=Game.D(1);p.generators.coherentEnergy.purchased=Game.D(1);p.generators.fieldExcitation.purchased=Game.D(1);p.unlocks.fieldExcitation=1;
      Game.PrestigeUI={nodes:{preview:el('gallery-perk')}};
      Game.FieldWaves.init();document.body.classList.add('has-symmetry');const gallery=this;
      effects.forEach(effect=>{const button=document.createElement('button');button.type='button';button.dataset.effect=effect.id;button.textContent=effect.name;button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>gallery.select(effect.id,true));el('gallery-effects').appendChild(button);});
      Game.AudioDirections.names.forEach((name,index)=>{
        const card=document.createElement('article');card.className='gallery-audio-card';card.dataset.audioCard=index;
        const badge=document.createElement('span');badge.className='gallery-new';badge.textContent=index>=2?'NEW DIRECTION':index===0?'ORIGINAL':'ALTERNATIVE';
        const heading=document.createElement('h3');heading.textContent=name;const paragraph=document.createElement('p');paragraph.textContent=Game.AudioDirections.descriptions[index];
        const button=document.createElement('button');button.type='button';button.dataset.sample=index;button.textContent='Play sample';button.addEventListener('click',()=>gallery.sample(index));card.append(badge,heading,paragraph,button);el('gallery-audio-cards').appendChild(card);
      });
      el('gallery-play').addEventListener('click',()=>gallery.playing?gallery.pause(true):gallery.play());
      el('gallery-replay').addEventListener('click',()=>{gallery.time=0;gallery.play();});
      el('gallery-stop-audio').addEventListener('click',()=>gallery.stopAudio());
      el('gallery-timeline').addEventListener('input',function () {gallery.pause(true);gallery.time=Number(this.value);gallery.draw();});
      el('gallery-audio').addEventListener('change',function () {gallery.stopAudio();p.settings.audioTheme=Number(this.value);});
      el('gallery-visual').addEventListener('change',function () {const time=gallery.time;gallery.pause(true);p.settings.visualTheme=Number(this.value);gallery.prepare();gallery.time=time;gallery.draw();});
      el('gallery-volume').addEventListener('input',function () {p.settings.volume=Number(this.value);Game.Audio.updateVolume();});
      el('gallery-sound').addEventListener('change',function () {p.settings.sound=Number(this.checked);if(!this.checked)gallery.stopAudio();Game.Audio.updateVolume();});
      el('gallery-fullscreen').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen();else if(el('preview-stage').requestFullscreen)el('preview-stage').requestFullscreen().catch(()=>{});});
      document.addEventListener('visibilitychange',()=>{if(document.hidden)gallery.pause(true);});window.addEventListener('pagehide',()=>gallery.pause(true));
      new ResizeObserver(()=>{gallery.resize();gallery.draw();}).observe(el('preview-stage'));this.select('condense',false);
    },
    stopAudio:function () {
      Game.AudioDirections.stopPreview();if(Game.Audio.condenseScore)Game.Audio.condenseScore.stop();
      if(Game.Audio.context)Game.Audio.master.gain.setTargetAtTime(0,Game.Audio.context.currentTime,.025);
      document.querySelectorAll('.gallery-audio-card').forEach(card=>card.classList.remove('is-playing'));
    },
    pause:function (sound) {this.serial++;this.playing=false;cancelAnimationFrame(this.frame);this.frame=null;el('gallery-play').textContent='Play animation';if(sound)this.stopAudio();},
    select:function (id,autoplay) {
      this.pause(true);this.effect=effects.find(effect=>effect.id===id)||effects[0];this.time=0;
      document.querySelectorAll('[data-effect]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.effect===id)));
      el('gallery-effect-title').textContent=this.effect.name;el('gallery-effect-description').textContent=this.effect.text;this.prepare();this.draw();if(autoplay)this.play();
    },
    resize:function () {
      const stage=el('preview-stage'),width=stage.clientWidth,height=stage.clientHeight,ratio=Math.min(devicePixelRatio||1,1.5),canvas=el('condense-canvas');if(!width||!height)return;
      if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}
      Game.CondenseFX.canvas=canvas;Game.CondenseFX.context=canvas.getContext('2d');Game.CondenseFX.context.setTransform(ratio,0,0,ratio,0,0);Game.CondenseFX.width=width;Game.CondenseFX.height=height;
      if(this.width&&this.height)el('energy-effects').querySelectorAll('.energy-spark').forEach(spark=>{spark.style.left=parseFloat(spark.style.left)*width/this.width+'px';spark.style.top=parseFloat(spark.style.top)*height/this.height+'px';});
      this.width=width;this.height=height;Game.FieldWaves.resize();
    },
    prepare:function () {
      const id=this.effect.id,p=Game.player,muted=p.settings.sound;p.settings.sound=0;
      Game.Presentation.clearReset();Game.PerkFX.clear();Game.FieldWaves.clear();el('energy-effects').replaceChildren();el('gallery-perk').hidden=true;el('gallery-perk').classList.remove('is-new-unlock');el('discovery-flair').hidden=true;
      Game.Presentation.apply();p.fluctuation.positive=Number(id!=='fluct-negative');p.symmetry.amount=Game.D(.6);el('condense-preview').hidden=id!=='condense';el('energy-view').hidden=id==='condense';
      this.duration=matchMedia('(prefers-reduced-motion: reduce)').matches?(id==='condense'?2.2:['break','stabilize'].includes(id)?.65:this.effect.duration):this.effect.duration;this.resize();
      if(id==='break'||id==='stabilize'){Game.Presentation.reset(id);clearTimeout(Game.Presentation.resetTimer);}
      else if(id==='perk'){
        el('gallery-perk').hidden=false;Game.PerkFX.play('preview');clearTimeout(Game.PerkFX.timer);
        const layer=Game.PerkFX.layer;if(layer){el('preview-stage').appendChild(layer);const bounds=el('preview-stage').getBoundingClientRect();layer.querySelectorAll('span,i').forEach(part=>{part.style.left=parseFloat(part.style.left)-bounds.left+'px';part.style.top=parseFloat(part.style.top)-bounds.top+'px';});}
      }else if(id==='discovery'){el('gallery-perk').hidden=false;el('gallery-perk').classList.add('is-new-unlock');el('discovery-flair').hidden=false;}
      else if(!['field','symmetry','condense'].includes(id)){
        const event={generator:true};if(id==='production')event.production=true;else if(id.startsWith('fluct-'))event.fluctuation=true;else if(id.endsWith('Resonance')&&!id.startsWith('field'))event.resonance=id;else event.dynamics=id;
        // Real effect nodes, cloned to retain their frames while the timeline is paused.
        const field=el('energy-effects');for(let i=0;i<(id==='production'?3:1);i++)Game.UI.flashEnergy(event);Array.from(field.children).forEach(node=>{field.appendChild(node.cloneNode(true));node.remove();});
      }
      this.baseWaves=[{started:0,x:.3,y:.35,scale:1,phase:.7},{started:900,x:.68,y:.6,scale:.9,phase:2.1},{started:1800,x:.42,y:.72,scale:1.1,phase:4.2}];p.settings.sound=muted;
      el('preview-stage').getBoundingClientRect();this.animations=el('preview-stage').getAnimations({subtree:true});this.animations.forEach(animation=>{animation.pause();animation.currentTime=0;});el('gallery-timeline').max=this.duration;this.lastBeat=-1;
    },
    draw:function () {
      const id=this.effect.id,time=Math.min(this.duration,Math.max(0,this.time));this.animations.forEach(animation=>{animation.currentTime=time*1000;});
      if(id==='condense')Game.CondenseFX.draw(matchMedia('(prefers-reduced-motion: reduce)').matches?6.2:time);
      else{
        if(id==='symmetry')Game.player.symmetry.amount=Game.D(Math.min(1,time/this.duration));
        const amount=Game.Symmetry.amount();el('energy-field').style.setProperty('--symmetry-strength',String(Game.Symmetry.intensity()));el('energy-field').style.setProperty('--symmetry-hue',String(268-110*amount));el('gallery-symmetry').textContent=(amount*100).toFixed(3)+'%';el('gallery-symmetry-type').textContent=Game.Symmetry.type();
        if(id==='field'||id==='symmetry'){const ms=time*1000;Game.FieldWaves.waves=this.baseWaves.filter(wave=>ms>=wave.started&&ms-wave.started<Game.CONFIG.FIELD_EXCITATION.waveDuration*1000);Game.FieldWaves.color='#a8c6d3';Game.FieldWaves.draw(ms);}
      }
      el('gallery-timeline').value=time;el('gallery-time').textContent=time.toFixed(1)+' / '+this.duration.toFixed(1)+'s';
    },
    play:async function () {
      this.pause(true);if(this.time>=this.duration-.005)this.time=0;const serial=this.serial;
      if(Game.player.settings.sound){Game.Audio.start(true);try{if(Game.Audio.context&&Game.Audio.context.state==='suspended')await Game.Audio.context.resume();}catch(error){}Game.Audio.updateVolume();}
      if(serial!==this.serial)return;this.playing=true;el('gallery-play').textContent='Pause';this.lastBeat=-1;const start=performance.now()-this.time*1000,gallery=this;this.lastDraw=-Infinity;
      if(this.effect.id==='condense'&&Game.player.settings.sound)Game.Audio.playCondenseMusic();
      const frame=function (now){if(!gallery.playing)return;gallery.time=Math.min(gallery.duration,(now-start)/1000);if(now-gallery.lastDraw>=25){gallery.lastDraw=now;gallery.draw();gallery.cue();}if(gallery.time>=gallery.duration){gallery.pause(false);gallery.draw();return;}gallery.frame=requestAnimationFrame(frame);};this.frame=requestAnimationFrame(frame);
    },
    cue:function () {
      const id=this.effect.id;if(id==='condense'||!Game.player.settings.sound)return;
      const repeated=['production','field','symmetry','fluct-positive','fluct-negative'].includes(id),beat=Math.floor(this.time/(id==='fluct-negative'?1.2:.9));if(this.lastBeat===beat||!repeated&&this.lastBeat>=0)return;this.lastBeat=beat;
      const kind=id==='production'?'generator':id==='field'?'fieldExcitation':id==='symmetry'?'alignment':id.startsWith('fluct-')?'fluctuation':id;if(kind==='break'||kind==='discovery')Game.Presentation.playTone(kind);else Game.Audio.play(kind);
    },
    sample:async function (index) {
      this.pause(true);const token=(this.sampleToken||0)+1;this.sampleToken=token;Game.player.settings.audioTheme=index;el('gallery-audio').value=index;if(!Game.player.settings.sound||!Game.player.settings.volume){el('gallery-status').textContent='Enable Sound and raise the volume to hear a sample.';return;}
      Game.Audio.updateVolume();el('gallery-status').textContent='Playing '+Game.AudioDirections.names[index]+' · press Stop audio to stop.';const card=document.querySelector('[data-audio-card="'+index+'"]');card.classList.add('is-playing');
      await Game.AudioDirections.previewSelected(()=>{if(token!==this.sampleToken)return;card.classList.remove('is-playing');el('gallery-status').textContent='Sample stopped. Choose another direction to compare.';});
    }
  };
  Game.Gallery.init();
})(window.CosmicIdle);
