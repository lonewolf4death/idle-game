(function (Game) {
  const D=Game.D;
  Game.Symmetry={
    unlocked:function () { return !!Game.player.prestige.symmetry; },
    amount:function () { return Game.player.symmetry.amount.toNumber(); },
    reached:function (threshold) { return this.unlocked() && Game.player.symmetry.amount.add(1e-12).gte(threshold); },
    discovered:function (threshold) { return this.unlocked() && Game.player.symmetry.best.add(1e-12).gte(threshold); },
    has:function (id) { return this.unlocked() && !!Game.player.symmetry.upgrades[id]; },
    expression:function () { return this.has('perfectInteraction')?1.15:1; },
    multiplierAt:function (amount) { return D(10).pow(100*Math.pow(Math.max(0,Math.min(1,amount)),4)*this.expression()); },
    multiplier:function () { return this.unlocked()?this.multiplierAt(this.amount()):D(1); },
    intensity:function () { return this.unlocked()?Math.pow(this.amount(),6):0; },
    alignmentOwned:function () { return Game.player.symmetry.alignment.add(Game.player.symmetry.alignmentAdded); },
    alignmentEnergy:function () { return this.has('fieldResonance')?D(Game.CONFIG.SYMMETRY.alignmentEnergyBase).pow(this.alignmentOwned()):D(1); },
    energyMultiplier:function () { return this.multiplier().mul(this.has('unifiedField1')?3:1).mul(this.alignmentEnergy()); },
    quantaMultiplier:function () { return this.reached(.25)?D(2):D(1); },
    generationMultiplier:function () {
      return D(this.reached(.1)?2:1).mul(this.has('unifiedField2')?2:1).mul(this.has('quantumCoupling')?D(1+Game.player.prestige.quanta.add(1).log10()/4):1);
    },
    unitProduction:function () { return D(Game.CONFIG.SYMMETRY.production).mul(this.generationMultiplier()).mul(Game.Progression.generatorMultiplier()); },
    perSecond:function () { return this.unlocked() && !this.reached(1)?this.alignmentOwned().mul(this.unitProduction()):D(0); },
    nextMilestone:function () { return Game.CONFIG.SYMMETRY.milestones.find(function (m) { return Game.player.symmetry.amount.add(1e-12).lt(m.at); }); },
    nextEventIn:function () { const rate=this.perSecond(),next=this.nextMilestone();return rate.gt(0)&&next?Decimal.max(0,D(next.at).sub(Game.player.symmetry.amount)).div(rate):D(Infinity); },
    type:function () { let name='Indistinguishable laws';Game.CONFIG.SYMMETRY.milestones.forEach(function (m) { if(Game.Symmetry.reached(m.at)) name=m.type; });return name; },
    add:function (amount) {
      if(!this.unlocked() || D(amount).lte(0)) return;
      const p=Game.player.symmetry,before=p.best;
      p.amount=Decimal.min(1,p.amount.add(amount));
      Game.CONFIG.SYMMETRY.milestones.forEach(function (m) { if(p.amount.add(1e-12).gte(m.at) && p.amount.lt(m.at)) p.amount=D(m.at); });
      p.best=Decimal.max(p.best,p.amount);
      Game.CONFIG.SYMMETRY.milestones.forEach(function (m) {
        if(before.add(1e-12).lt(m.at) && p.best.add(1e-12).gte(m.at) && Game.Experience) Game.Experience.enqueue({kind:'Symmetry milestone',title:m.type,text:m.reward});
      });
    },
    advance:function (seconds) {
      if(this.perSecond().lte(0)) return;
      const p=Game.player.symmetry;p.pulseElapsed=p.pulseElapsed.add(seconds);this.add(this.perSecond().mul(seconds));
      if(p.pulseElapsed.gte(8)) {
        p.pulseElapsed=p.pulseElapsed.sub(p.pulseElapsed.div(8).floor().mul(8));
        if(Game.UI && !(Game.Loop && Game.Loop.catchingUp)) { if(Game.Audio) Game.Audio.play('alignment');if(Game.UI.symmetryFeedback) Game.UI.symmetryFeedback(); }
      }
    },
    // Raw counts avoid recursive feedback between derived generator effects.
    crossMultiplier:function (id) {
      if(!this.reached(.75)) return D(1);
      return Game.CONFIG.GENERATORS.reduce(function (value,gen) {
        if(gen.id===id || !Game.Challenges.produces(gen.id)) return value;
        const state=Game.player.generators[gen.id];
        return value.mul(1+.01*state.purchased.add(state.added).add(1).log10());
      },D(1));
    },
    cost:function () { return D(Game.CONFIG.SYMMETRY.baseCost).mul(D(Game.CONFIG.SYMMETRY.costScaling).pow(Game.player.symmetry.alignment)); },
    quote:function (amount) {
      if(!this.unlocked()) return {count:D(0),cost:D(0)};
      const price=this.cost(),money=Game.player.resources.energy,scale=D(Game.CONFIG.SYMMETRY.costScaling);
      let count=money.lt(price)?D(0):D(Math.floor(money.div(price).mul(scale.sub(1)).add(1).log10()/scale.log10()));
      if(amount!=='max') count=Decimal.min(count,Math.max(0,Number(amount)||0));
      let cost=count.gt(0)?price.mul(scale.pow(count).sub(1)).div(scale.sub(1)):D(0);
      while(count.gt(0) && cost.gt(money)) { count=count.sub(1);cost=count.gt(0)?price.mul(scale.pow(count).sub(1)).div(scale.sub(1)):D(0); }
      // Correct a boundary lost to logarithmic rounding.
      const limit=amount==='max'?Infinity:Math.max(0,Number(amount)||0);
      if(count.lt(limit)) { const nextCost=price.mul(scale.pow(count.add(1)).sub(1)).div(scale.sub(1));if(nextCost.lte(money)){count=count.add(1);cost=nextCost;} }
      return {count:count,cost:cost};
    },
    buy:function (amount) {
      const quote=this.quote(amount);if(quote.count.lte(0)) return false;
      Game.player.lateEnergy.highest=Decimal.max(Game.player.lateEnergy.highest,Game.player.resources.energy);Game.player.resources.energy=Game.player.resources.energy.sub(quote.cost);Game.player.symmetry.alignment=Game.player.symmetry.alignment.add(quote.count);
      if(Game.Audio) Game.Audio.play('alignment');Game.Save.save();return true;
    },
    canBuyUpgrade:function (id) {
      const rule=Game.CONFIG.SYMMETRY.upgrades[id];return !!rule && !Game.Challenges.active() && this.discovered(rule.perfect?1:.5) && !this.has(id) && Game.player.resources.energy.gte(rule.cost);
    },
    buyUpgrade:function (id) {
      if(!this.canBuyUpgrade(id)) return false;
      Game.player.lateEnergy.highest=Decimal.max(Game.player.lateEnergy.highest,Game.player.resources.energy);Game.player.resources.energy=Game.player.resources.energy.sub(Game.CONFIG.SYMMETRY.upgrades[id].cost);Game.player.symmetry.upgrades[id]=1;
      if(Game.Audio) Game.Audio.play('perk');Game.Save.save();return true;
    },
    preserve:function (old,fresh) {
      fresh.symmetry.best=old.symmetry.best;fresh.symmetry.upgrades=old.symmetry.upgrades;
      // Current Symmetry and Field Alignment reset with the Energy run.
    },
    showLore:function () {
      if(!this.unlocked() || Game.player.lore.symmetrySeen || !Game.Experience || Game.Experience.symmetryQueued) return;
      Game.Experience.symmetryQueued=true;Game.Experience.enqueue({kind:'Lore · 08',title:'Indistinguishable laws',text:Game.CONFIG.SYMMETRY.lore,symmetry:true});
    },
    averageEnergyMultiplier:function (seconds,offset,logSlope) {
      if(!this.unlocked()) return D(1);
      const rate=this.perSecond(),a=Decimal.min(1,Game.player.symmetry.amount.add(rate.mul(offset||0))).toNumber(),b=Decimal.min(1,Game.player.symmetry.amount.add(rate.mul(D(seconds).add(offset||0)))).toNumber(),power=this.expression(),slope=Number(logSlope||0)*D(seconds).toNumber();
      const start=100*Math.pow(a,4)*power,end=100*Math.pow(b,4)*power+slope,peak=Math.max(start,end);
      let average;
      if(Math.abs(end-start)<1e-6 && Math.abs(b-a)<1e-4) average=this.multiplierAt((a+b)/2).mul(D(10).pow(slope/2));
      else {
        const f=function (u) { return Math.pow(10,100*Math.pow(a+(b-a)*u,4)*power+slope*u-peak); };
        function integrate(l,r,fl,fm,fr,whole,tolerance,depth) {
          const m=(l+r)/2,lm=f((l+m)/2),rm=f((m+r)/2),left=(m-l)*(fl+4*lm+fm)/6,right=(r-m)*(fm+4*rm+fr)/6;
          if(!depth || Math.abs(left+right-whole)<15*tolerance) return left+right+(left+right-whole)/15;
          return integrate(l,m,fl,lm,fm,left,tolerance/2,depth-1)+integrate(m,r,fm,rm,fr,right,tolerance/2,depth-1);
        }
        const fl=f(0),fm=f(.5),fr=f(1);average=D(10).pow(peak).mul(integrate(0,1,fl,fm,fr,(fl+4*fm+fr)/6,1e-10,12));
      }
      return average.mul(this.has('unifiedField1')?3:1).mul(this.alignmentEnergy());
    }
  };

  Game.LateEnergy={
    start:1000,width:10,seconds:600,resistance:1000,
    anchor:function (energy,highest) { return Decimal.max(energy,D(10).pow(this.start)); },
    band:function (highest) { return Math.max(0,Math.floor((highest.log10()-this.start+1e-9)/this.width)); },
    baseRate:function (energy,highest) { return this.anchor(energy,highest).mul(Math.LN10*this.width/this.seconds/(this.band(highest)+1)); },
    compressedRate:function (raw,energy,highest) {
      const p=Game.player,e=energy||p.resources.energy,h=highest||Decimal.max(p.lateEnergy.highest,e);
      if(h.lt('1e1000')) return D(raw);
      const base=this.baseRate(e,h);return D(raw).lte(base)?D(raw):base.mul(1+(D(raw).log10()-base.log10())/this.resistance);
    },
    // Exact integration within each ten-decade band. The logarithmic soft cap
    // preserves achievement effects while preventing old exponential feedback
    // from skipping the new stage. Symmetry/Unified bonuses apply afterwards.
    preview:function (raw,seconds,boost,logSlope) {
      let e=Game.player.resources.energy,h=Decimal.max(Game.player.lateEnergy.highest,e),left=D(seconds).toNumber();
      const initial=e,r=D(raw),b=D(boost===undefined?Game.Symmetry.energyMultiplier():boost),total=left,v=Number(logSlope||0),L0=r.log10();
      if(r.lte(0) || left<=0) return {energy:e,highest:h,gain:D(0)};
      const upper=this.seconds*Math.pow(Math.max(0,(L0+b.log10()+Math.abs(v)*left-this.start)/this.width)+2,2);
      function uncapped(log,t) {
        const z=v*t*Math.LN10;
        return D(10).pow(log).mul(b).mul(t).mul(Math.abs(z)<1e-7 ? z===0?1:Math.expm1(z)/z : D(10).pow(v*t).sub(1).div(z));
      }
      function bisect(fn,until) { let l=0,r=until;for(let i=0;i<48;i++){const m=(l+r)/2;if(fn(m))r=m;else l=m;}return (l+r)/2; }
      if(b.mul(left).gt(D(upper).mul(1e10))) { const gain=uncapped(L0,left);e=e.add(gain);h=Decimal.max(h,e);return {energy:e,highest:h,gain:gain}; }
      while(left>1e-12) {
        const L=L0+v*(total-left);
        if(h.lt('1e1000')) {
          const gain=uncapped(L,left),need=D('1e1000').sub(e);
          if(gain.lte(need)) { return {energy:e.add(gain),highest:Decimal.max(h,e.add(gain)),gain:e.sub(initial).add(gain)}; }
          const until=bisect(function(t){return uncapped(L,t).gte(need);},left);
          e=D('1e1000');h=e;left=Math.max(0,left-until);continue;
        }
        const band=this.band(h),a=Math.LN10*this.width/this.seconds/(band+1),loga=Math.log10(a),target=D(10).pow(this.start+(band+1)*this.width);
        if(e.lt('1e1000')) {
          const capLog=this.start+loga,cap=D(10).pow(capLog),need=D('1e1000').sub(e);
          function anchored(t) {
            const cross=v?(capLog-L)/v:-1,points=cross>0 && cross<t?[0,cross,t]:[0,t];let gain=D(0);
            for(let i=1;i<points.length;i++) {
              const l=points[i-1],r=points[i];
              gain=gain.add(L+v*(l+r)/2<=capLog ? uncapped(L+v*l,r-l) : cap.mul(b).mul((r-l)*(1+(L-capLog)/1000)+v*(r*r-l*l)/2000));
            }return gain;
          }
          const gain=anchored(left);
          if(gain.lte(need)) return {energy:e.add(gain),highest:h,gain:e.sub(initial).add(gain)};
          const until=bisect(function(t){return anchored(t).gte(need);},left);e=D('1e1000');left=Math.max(0,left-until);continue;
        }
        const x=e.log10(),capLog=x+loga,difference=L-capLog,k=b.toNumber()/(60000*(band+1));
        const compressed=difference>1e-10 || Math.abs(difference)<=1e-10 && v>a*b.toNumber()/Math.LN10;
        if(!compressed) {
          const start=e,at=function(t){return start.add(uncapped(L,t));},end=at(left);
          let until=end.gte(target)?bisect(function(t){return at(t).gte(target);},left):left;
          if(L+v*until>at(until).log10()+loga+1e-10) until=Math.min(until,bisect(function(t){return L+v*t>at(t).log10()+loga;},until));
          const gain=uncapped(L,until);e=e.add(gain);h=Decimal.max(h,e);
          if(until>=left-1e-12) return {energy:e,highest:h,gain:start.sub(initial).add(gain)};
          left=Math.max(0,left-until);continue;
        }
        const span=1000+L-loga-x;
        const at=function(t) {
          const z=k*t,one=-Math.expm1(-z);
          const lag=Math.abs(z)<1e-4 ? t*(z/2-z*z/6+z*z*z/24) : t-one/k;
          return x+span*one+v*lag;
        };
        let until=at(left)>=target.log10()?bisect(function(t){return at(t)>=target.log10();},left):left;
        if(L+v*until<at(until)+loga-1e-10) until=Math.min(until,bisect(function(t){return L+v*t<at(t)+loga;},until));
        e=D(10).pow(at(until));h=Decimal.max(h,e);left=Math.max(0,left-until);
      }
      return {energy:e,highest:h,gain:Decimal.max(0,e.sub(initial))};
    },
    grant:function (raw,seconds,boost,logSlope) {
      const result=this.preview(raw,seconds,boost,logSlope);Game.player.lateEnergy.highest=result.highest;Game.Energy.addEnergy(result.gain);return result.gain;
    },
    grantProduction:function (raw,seconds,logSlope) {
      if(D(raw).lte(0)) return D(0);
      const delta=D(seconds).toNumber(),rate=Game.Symmetry.perSecond(),a=Game.Symmetry.amount(),end=Decimal.min(1,Game.player.symmetry.amount.add(rate.mul(seconds))).toNumber();
      const shift=Math.abs(100*(Math.pow(end,4)-Math.pow(a,4))*Game.Symmetry.expression()),boost=Game.Symmetry.averageEnergyMultiplier(seconds);
      const upper=this.seconds*Math.pow(Math.max(0,(D(raw).log10()+boost.log10()+Math.abs(logSlope||0)*delta-this.start)/this.width)+2,2);
      if(boost.mul(delta).gt(D(upper).mul(1e10))) {
        const gain=D(raw).mul(Game.Symmetry.averageEnergyMultiplier(seconds,0,logSlope)).mul(seconds);Game.Energy.addEnergy(gain);return gain;
      }
      const pieces=Math.max(1,Math.min(64,Math.ceil(shift/.0001))),step=delta/pieces;let gain=D(0);
      for(let i=0;i<pieces;i++) gain=gain.add(this.grant(D(raw).mul(D(10).pow((logSlope||0)*step*i)),step,Game.Symmetry.averageEnergyMultiplier(step,step*i),logSlope));
      return gain;
    },
    payout:function (gain,seconds) { return this.preview(D(gain).div(seconds),seconds).gain; }
  };
})(window.CosmicIdle);
