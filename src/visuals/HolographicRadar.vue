<template>
  <div class="holographic-radar" :class="{ pulsing: isPulsing }">
    <!-- SVG Radar Chart -->
    <svg :viewBox="viewBox" class="radar-svg">
      <!-- Background grid -->
      <g class="radar-grid">
        <polygon 
          v-for="level in gridLevels" 
          :key="level"
          :points="getGridPoints(level)"
          class="grid-polygon"
          :style="{ opacity: level * 0.2 }"
        />
        <!-- Axis lines -->
        <line 
          v-for="(axis, i) in axes" 
          :key="'axis-' + i"
          :x1="center" :y1="center"
          :x2="getAxisEndX(i)" :y2="getAxisEndY(i)"
          class="axis-line"
        />
      </g>
      
      <!-- Data polygon -->
      <polygon 
        :points="dataPoints"
        class="data-polygon"
        :style="polygonStyle"
      />
      
      <!-- Data points -->
      <g class="data-points">
        <circle 
          v-for="(axis, i) in axes" 
          :key="'point-' + i"
          :cx="getDataPointX(i)" :cy="getDataPointY(i)"
          :r="pointRadius"
          class="data-point"
          :style="{ fill: axis.color }"
          @mouseenter="showTooltip(axis, $event)"
          @mouseleave="hideTooltip"
        />
      </g>
      
      <!-- Labels -->
      <g class="axis-labels">
        <text 
          v-for="(axis, i) in axes" 
          :key="'label-' + i"
          :x="getLabelX(i)" :y="getLabelY(i)"
          class="axis-label"
          :fill="axis.color"
        >
          {{ axis.label }}
        </text>
      </g>
    </svg>
    
    <!-- Pulse effect overlay -->
    <div v-if="isPulsing" class="pulse-overlay" :style="pulseStyle"></div>
    
    <!-- Tooltip -->
    <div 
      v-if="tooltip.visible" 
      class="radar-tooltip"
      :style="tooltipStyle"
    >
      <div class="tooltip-label">{{ tooltip.label }}</div>
      <div class="tooltip-value">{{ (tooltip.value * 100).toFixed(1) }}%</div>
    </div>
    
    <!-- Composite Score -->
    <div class="composite-score">
      <span class="score-value">{{ compositeScore }}</span>
      <span class="score-label">DNA Score</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HolographicRadar',
  
  props: {
    // DNA metrics (0-1 normalized)
    accuracy: { type: Number, default: 0.5 },
    grit: { type: Number, default: 0.5 },
    aggression: { type: Number, default: 0.5 },
    composure: { type: Number, default: 0.5 },
    wealth: { type: Number, default: 0.5 },
    
    // Visual options
    size: { type: Number, default: 300 },
    primaryColor: { type: String, default: '#00BFFF' },
    glowColor: { type: String, default: '#00FFFF' },
    pulseOnChange: { type: Boolean, default: true },
    showLabels: { type: Boolean, default: true }
  },
  
  data() {
    return {
      isPulsing: false,
      pulseIntensity: 0,
      tooltip: {
        visible: false,
        label: '',
        value: 0,
        x: 0,
        y: 0
      },
      gridLevels: [0.2, 0.4, 0.6, 0.8, 1.0]
    };
  },
  
  computed: {
    axes() {
      return [
        { key: 'accuracy', label: 'ACC', value: this.accuracy, color: '#00BFFF', weight: 0.25 },
        { key: 'grit', label: 'GRT', value: this.grit, color: '#32CD32', weight: 0.20 },
        { key: 'aggression', label: 'AGG', value: this.aggression, color: '#FF4500', weight: 0.15 },
        { key: 'composure', label: 'CMP', value: this.composure, color: '#FF1493', weight: 0.20 },
        { key: 'wealth', label: 'WLT', value: this.wealth, color: '#FFD700', weight: 0.20 }
      ];
    },
    
    center() {
      return this.size / 2;
    },
    
    radius() {
      return (this.size / 2) - 40;
    },
    
    pointRadius() {
      return Math.max(4, this.size / 50);
    },
    
    viewBox() {
      return `0 0 ${this.size} ${this.size}`;
    },
    
    angleStep() {
      return (2 * Math.PI) / this.axes.length;
    },
    
    dataPoints() {
      return this.axes.map((axis, i) => {
        const angle = this.getAngle(i);
        const value = Math.max(0.05, axis.value); // Min 5% for visibility
        const x = this.center + this.radius * value * Math.sin(angle);
        const y = this.center - this.radius * value * Math.cos(angle);
        return `${x},${y}`;
      }).join(' ');
    },
    
    compositeScore() {
      const score = this.axes.reduce((sum, axis) => sum + axis.value * axis.weight, 0);
      return Math.round(score * 100);
    },
    
    polygonStyle() {
      return {
        fill: `${this.primaryColor}33`,
        stroke: this.primaryColor,
        filter: this.isPulsing ? `drop-shadow(0 0 ${10 + this.pulseIntensity * 20}px ${this.glowColor})` : 'none'
      };
    },
    
    pulseStyle() {
      return {
        background: `radial-gradient(circle, ${this.glowColor}22 0%, transparent 70%)`,
        opacity: this.pulseIntensity
      };
    },
    
    tooltipStyle() {
      return {
        left: `${this.tooltip.x}px`,
        top: `${this.tooltip.y}px`
      };
    }
  },
  
  watch: {
    accuracy() { this.triggerPulse(); },
    grit() { this.triggerPulse(); },
    aggression() { this.triggerPulse(); },
    composure() { this.triggerPulse(); },
    wealth() { this.triggerPulse(); }
  },
  
  methods: {
    getAngle(index) {
      return index * this.angleStep - Math.PI / 2;
    },
    
    getGridPoints(level) {
      return this.axes.map((_, i) => {
        const angle = this.getAngle(i);
        const x = this.center + this.radius * level * Math.sin(angle);
        const y = this.center - this.radius * level * Math.cos(angle);
        return `${x},${y}`;
      }).join(' ');
    },
    
    getAxisEndX(index) {
      return this.center + this.radius * Math.sin(this.getAngle(index));
    },
    
    getAxisEndY(index) {
      return this.center - this.radius * Math.cos(this.getAngle(index));
    },
    
    getDataPointX(index) {
      const angle = this.getAngle(index);
      const value = Math.max(0.05, this.axes[index].value);
      return this.center + this.radius * value * Math.sin(angle);
    },
    
    getDataPointY(index) {
      const angle = this.getAngle(index);
      const value = Math.max(0.05, this.axes[index].value);
      return this.center - this.radius * value * Math.cos(angle);
    },
    
    getLabelX(index) {
      const angle = this.getAngle(index);
      return this.center + (this.radius + 25) * Math.sin(angle);
    },
    
    getLabelY(index) {
      const angle = this.getAngle(index);
      return this.center - (this.radius + 25) * Math.cos(angle) + 5;
    },
    
    triggerPulse() {
      if (!this.pulseOnChange) return;
      
      this.isPulsing = true;
      this.pulseIntensity = 1;
      
      const decay = () => {
        this.pulseIntensity -= 0.05;
        if (this.pulseIntensity > 0) {
          requestAnimationFrame(decay);
        } else {
          this.isPulsing = false;
          this.pulseIntensity = 0;
        }
      };
      
      requestAnimationFrame(decay);
    },
    
    showTooltip(axis, event) {
      this.tooltip = {
        visible: true,
        label: axis.label,
        value: axis.value,
        x: event.offsetX + 10,
        y: event.offsetY - 30
      };
    },
    
    hideTooltip() {
      this.tooltip.visible = false;
    }
  }
};
</script>

<style scoped>
.holographic-radar {
  position: relative;
  display: inline-block;
  background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 
    0 0 30px rgba(0, 191, 255, 0.2),
    inset 0 0 60px rgba(0, 0, 0, 0.5);
}

.holographic-radar.pulsing {
  animation: holoPulse 0.5s ease-out;
}

@keyframes holoPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

.radar-svg {
  display: block;
}

.grid-polygon {
  fill: none;
  stroke: rgba(0, 191, 255, 0.2);
  stroke-width: 1;
}

.axis-line {
  stroke: rgba(0, 191, 255, 0.3);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.data-polygon {
  stroke-width: 2;
  transition: all 0.3s ease;
}

.data-point {
  stroke: #fff;
  stroke-width: 2;
  cursor: pointer;
  transition: r 0.2s ease;
}

.data-point:hover {
  r: 8;
}

.axis-label {
  font-size: 12px;
  font-weight: 600;
  text-anchor: middle;
  text-shadow: 0 0 10px currentColor;
}

.pulse-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 16px;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.radar-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid #00BFFF;
  border-radius: 8px;
  padding: 8px 12px;
  pointer-events: none;
  z-index: 100;
}

.tooltip-label {
  color: #888;
  font-size: 11px;
  text-transform: uppercase;
}

.tooltip-value {
  color: #00BFFF;
  font-size: 18px;
  font-weight: 700;
}

.composite-score {
  position: absolute;
  bottom: 10px;
  right: 10px;
  text-align: right;
}

.score-value {
  display: block;
  color: #FFD700;
  font-size: 24px;
  font-weight: 700;
  text-shadow: 0 0 10px #FFD700;
}

.score-label {
  color: #888;
  font-size: 10px;
  text-transform: uppercase;
}
</style>
