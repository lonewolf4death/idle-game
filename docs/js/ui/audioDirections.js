(function (Game) {
  Game.AudioDirections={
    names:['Eventide','Celestial score','Glass observatory','Redshift'],
    descriptions:[
      'Original Eventide: spacious, restrained tones that become more musical as the field develops.',
      'Celestial score: evolving harmonic motifs, soft chords and luminous discovery cues.',
      'Glass observatory: crystalline bells, airy pentatonic phrases and light, lingering echoes.',
      'Redshift: warm analog pulses, low orbital bass and darker cinematic chord changes.'
    ],
    steps:{},last:{},preview:null,previewSerial:0,
    play:function (kind) {
      const audio=Game.Audio,settings=Game.player.settings,theme=settings.audioTheme;
      if(theme<2 || !settings.sound || !settings.volume || audio.shouldMute() || Game.Loop.catchingUp)return;
      if((kind==='discovery'||kind==='break') && !settings.perkSound)return;
      audio.start();if(!audio.context || audio.context.state!=='running' || audio.voices>=Game.CONFIG.AUDIO.maxVoices)return;
      const ctx=audio.context,now=ctx.currentTime,key=theme+':'+kind,important=['discovery','break','stabilize','preview','perk'].includes(kind);
      if(now-(this.last[key]===undefined?-10:this.last[key])<(important?.8:.4))return;
      this.last[key]=now;const step=this.steps[key]||0;this.steps[key]=step+1;
      const glass=theme===2,stage=audio.musicStage(),rate=audio.fluctRate(),symmetry=Game.Symmetry.intensity();
      const support=['generator','fieldExcitation','energyResonance','fieldCoupling','fieldOscillation'].includes(kind),bright=['fluctuation','quantumResonance','alignment'].includes(kind);
      const scale=glass?[0,2,4,7,9,12,16]:[0,3,5,7,10,12,15],motif=glass?[0,2,1,4,3,5,4,2]:[0,3,1,4,2,5,3,1];
      const movement=Math.floor(Game.player.time.realPlayed/(glass?24:20))%4,roots=glass?[0,-5,-2,0]:[0,-2,-5,-7];
      const semitone=important?0:scale[(motif[step%8]+(bright?2:0))%scale.length];
      const base=(glass?146.8324:65.4064)*Math.pow(2,(roots[movement]+semitone)/12)*(important?1:support?glass?1:.5:bright?2:1)*rate;
      const intervals=kind==='break'?[0,1,7,-12]:important?(glass?[0,7,14,19]:[0,3,7,14]):stage>=3?(glass?[0,12]:[0,7]):[0];
      const bus=ctx.createGain(),filter=ctx.createBiquadFilter(),send=ctx.createGain();
      bus.gain.value=(important?(glass?.10:.11):(glass?.055:.05))*(glass?2.5:3);send.gain.value=glass?.32:.19;
      filter.type='lowpass';filter.Q.value=glass?.35:.65;
      filter.frequency.setValueAtTime(glass?4800:important?1600:900,now);
      if(!glass)filter.frequency.exponentialRampToValueAtTime(250,now+2.5/rate);
      filter.connect(bus);bus.connect(audio.master);bus.connect(send);send.connect(audio.delay);
      const duration=(kind==='break'?3.6:important?glass?2.8:3.1:support?glass?1.8:2.1:glass?2.2:1.7)/rate;
      let ended=0;const cleanups=[];audio.voices++;
      intervals.forEach(function (interval,index) {
        const carrier=ctx.createOscillator(),partial=ctx.createOscillator(),gain=ctx.createGain(),detail=ctx.createGain(),pan=ctx.createStereoPanner();
        const start=now+index*(glass?.14:.11),frequency=base*Math.pow(2,interval/12),attack=glass?.009:important?.065:.025;
        carrier.type=glass?'sine':'triangle';carrier.frequency.setValueAtTime(frequency*(glass?1:1.025),start);
        if(kind==='break')carrier.frequency.exponentialRampToValueAtTime(Math.max(22,frequency*.48),start+duration);
        else if(!glass)carrier.frequency.exponentialRampToValueAtTime(frequency,start+.12/rate);
        partial.type=glass?'sine':'sawtooth';partial.frequency.setValueAtTime(frequency*(glass?2.003:1.003),start);
        detail.gain.setValueAtTime(glass?frequency*.68:.055,start);
        detail.gain.exponentialRampToValueAtTime(glass?frequency*.004:.008,start+(glass?.65:1.3)/rate);
        partial.connect(detail);if(glass)detail.connect(carrier.frequency);else detail.connect(gain);
        const peak=(index===0?.46:.32)/(index+1);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(peak,start+attack/rate);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
        pan.pan.value=(index%2?1:-1)*(glass?.36:.22)*(1-symmetry);carrier.connect(gain);gain.connect(pan);pan.connect(filter);
        cleanups.push(function () { carrier.disconnect();partial.disconnect();detail.disconnect();gain.disconnect();pan.disconnect(); });
        carrier.onended=function () { if(++ended===intervals.length) { cleanups.forEach(function (cleanup) { cleanup(); });filter.disconnect();bus.disconnect();send.disconnect();audio.voices--; } };
        partial.start(start);carrier.start(start);partial.stop(start+duration+.02);carrier.stop(start+duration+.04);
      });
    },
    stopPreview:function () {
      this.previewSerial++;const preview=this.preview;if(!preview)return;
      this.preview=null;preview.timers.forEach(clearTimeout);
      preview.bus.gain.cancelScheduledValues(preview.context.currentTime);preview.bus.gain.setTargetAtTime(0,preview.context.currentTime,.015);
      setTimeout(function () { preview.bus.disconnect();preview.delay.disconnect();preview.echo.disconnect(); },6500);
      if(preview.done)preview.done(false);
    },
    previewSelected:async function (done) {
      this.stopPreview();const serial=this.previewSerial,audio=Game.Audio;
      audio.start(true);if(!audio.context) { if(done)done(false);return false; }
      try { if(audio.context.state==='suspended')await audio.context.resume(); } catch(error) { if(done)done(false);return false; }
      if(serial!==this.previewSerial){if(done)done(false);return false;}
      const context=audio.context,bus=context.createGain(),delay=context.createDelay(1),echo=context.createGain();
      bus.gain.value=1;bus.connect(audio.master);delay.delayTime.value=Game.player.settings.audioTheme===2?.27:.38;echo.gain.value=.17;delay.connect(echo);echo.connect(bus);
      const preview={context:context,bus:bus,delay:delay,echo:echo,timers:[],done:done,audioSteps:{},audioLast:{},scoreSteps:{},scoreLast:{},directionSteps:{},directionLast:{}};this.preview=preview;
      const directions=this;
      [[0,'generator'],[.75,'generator'],[1.5,'fluctuation'],[2.25,'quantumResonance'],[3,'energyResonance'],[3.75,'fieldExcitation'],[4.5,'fieldOscillation'],[5.25,'alignment'],[6,'perk']].forEach(function (entry) {
        preview.timers.push(setTimeout(function () {
          if(directions.preview!==preview)return;
          const prior={master:audio.master,delay:audio.delay,steps:audio.steps,last:audio.last,scoreSteps:Game.Presentation.steps,scoreLast:Game.Presentation.last,directionSteps:directions.steps,directionLast:directions.last};
          audio.master=bus;audio.delay=delay;audio.steps=preview.audioSteps;audio.last=preview.audioLast;Game.Presentation.steps=preview.scoreSteps;Game.Presentation.last=preview.scoreLast;directions.steps=preview.directionSteps;directions.last=preview.directionLast;
          try { Game.Audio.play(entry[1]); } finally { audio.master=prior.master;audio.delay=prior.delay;audio.steps=prior.steps;audio.last=prior.last;Game.Presentation.steps=prior.scoreSteps;Game.Presentation.last=prior.scoreLast;directions.steps=prior.directionSteps;directions.last=prior.directionLast; }
        },entry[0]*1000));
      });
      preview.timers.push(setTimeout(function () { if(directions.preview===preview)directions.stopPreview(); },11000));return true;
    }
  };
})(window.CosmicIdle);
