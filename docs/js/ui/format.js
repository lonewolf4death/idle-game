(function (Game) {
  const numberFormatters = new Map();
  const energyFormatters = new Map();
  Game.Format = {
    energy: function (value, characters) {
      const d=Game.D(value);
      if(!(Number.isFinite(d.mantissa) && Number.isFinite(d.exponent))) return '∞';
      if(d.exponent>=-2 && d.exponent<25 || d.eq(0)) {
        const small=d.abs().lt(1000),key=small?'small':'large';
        let formatter=energyFormatters.get(key);
        if(!formatter) {
          formatter=new Intl.NumberFormat(undefined,small?{minimumFractionDigits:2,maximumFractionDigits:2}:{maximumSignificantDigits:15});
          energyFormatters.set(key,formatter);
        }
        const plain=formatter.format(d.toNumber());
        return plain;
      }
      return d.toExponential(2).replace('+','').replace(/(\.\d*?[1-9])0+e/,'$1e').replace(/\.0+e/,'e');
    },
    number: function (value, decimals) {
      const d = Game.D(value);
      const places = decimals === undefined ? 2 : decimals;
      if (!(Number.isFinite(d.mantissa) && Number.isFinite(d.exponent))) return "∞";
      if (d.eq(0)) return "0";
      if (d.abs().lt(1000)) {
        let formatter = numberFormatters.get(places);
        if (!formatter) { formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: places });numberFormatters.set(places, formatter); }
        return formatter.format(d.toNumber());
      }
      return d.toExponential(places).replace("+", "");
    },

    quantaRate: function (value) { return value===null ? "—" : Game.D(value).gt(0) && Game.D(value).lt(.001) ? Game.D(value).toExponential(2).replace("+","") : this.number(value,3); },
    runDuration: function (seconds) {
      if (seconds>=1e12) return this.duration(seconds);
      const rounded=Math.round(seconds*10)/10, hours=Math.floor(rounded/3600), minutes=Math.floor(rounded%3600/60), remainder=Number((rounded%60).toFixed(1));
      return (hours?hours+"h ":"")+(minutes?minutes+"m ":"")+this.number(remainder,1)+"s";
    },
    duration: function (seconds) {
      const numeric = seconds instanceof Decimal ? seconds.toNumber() : Number(seconds);
      if (!Number.isFinite(numeric) || numeric >= 1e12) return this.number(seconds) + "s";
      if (numeric < 60) return Math.floor(numeric) + "s";
      if (numeric < 3600) return Math.floor(numeric / 60) + "m " + Math.floor(numeric % 60) + "s";
      return Math.floor(numeric / 3600) + "h " + Math.floor((numeric % 3600) / 60) + "m";
    }
  };

  Game.EnergyDisplay = {
    dirty: true, key: '', metrics: null,
    measure: function () {
      if(!this.observer && window.ResizeObserver) {
        const display=this;
        this.observer=new ResizeObserver(function () { display.dirty=true; });
        this.observer.observe(document.querySelector('.header-energy'));
        this.observer.observe(document.getElementById('energy-field'));
      }
      const field=document.getElementById('energy-field');
      const key=innerWidth+':'+innerHeight+':'+document.body.className+':'+field.className;
      if(!this.dirty && key===this.key) return;
      this.key=key;this.dirty=false;
      const canvas=this.canvas || (this.canvas=document.createElement('canvas')),context=canvas.getContext('2d');
      this.metrics=['energy-display','center-energy'].map(function (id) {
        const node=document.getElementById(id);node.style.removeProperty('font-size');
        const style=getComputedStyle(node),center=id==='center-energy';
        const parent=center?node.parentElement:document.querySelector('.header-energy');
        const padding=getComputedStyle(parent);
        const width=(center?field.clientWidth*(document.body.classList.contains('has-symmetry')?.9:1):parent.clientWidth)-parseFloat(padding.paddingLeft)-parseFloat(padding.paddingRight)-12;
        context.font=style.fontSize+' '+style.fontFamily;
        const letterSpacing=parseFloat(style.letterSpacing)||0;
        return {node:node,font:context.font,fontSize:parseFloat(style.fontSize),spacing:letterSpacing,width:width};
      });
    },
    render: function (value) {
      this.measure();
      const context=this.canvas.getContext('2d');
      this.metrics.forEach(function (metric) {
        if(metric.width<=0) return;
        const result=Game.Format.energy(value);
        context.font=metric.font;
        const extent=context.measureText(result).width+metric.spacing*(result.length-1);
        const size=(metric.fontSize*Math.min(1,metric.width/Math.max(1,extent))).toFixed(2)+'px';
        if(metric.node.style.fontSize!==size) metric.node.style.fontSize=size;
        if(metric.node.textContent!==result) metric.node.textContent=result;
      });
    }
  };
})(window.CosmicIdle);

