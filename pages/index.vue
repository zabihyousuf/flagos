<template>
  <div class="landing">
    <!-- 1. Sticky Glassmorphic Navbar -->
    <header class="landing-nav">
      <div class="landing-container flex items-center justify-between h-16">
        <NuxtLink to="/" class="font-copernicus font-bold text-xl tracking-tight text-foreground">FlagLab</NuxtLink>
        <div class="flex items-center gap-3">
          <NuxtLink to="/auth/login" class="nav-link">Log In</NuxtLink>
          <NuxtLink to="/auth/signup" class="nav-cta">Sign Up</NuxtLink>
        </div>
      </div>
    </header>

    <!-- 2. Hero -->
    <section class="hero">
      <div class="hero-glow" />
      <div class="landing-container text-center relative">
        <Badge variant="secondary" class="hero-badge">
          <Zap class="w-3.5 h-3.5 mr-1.5" />
          Flag Football, Reimagined
        </Badge>
        <h1 class="hero-title font-copernicus">
          Design plays.<br class="hidden sm:block" />
          <span class="hero-gradient">Simulate outcomes.</span><br class="hidden sm:block" />
          Win on game day.
        </h1>
        <p class="hero-sub">
          The all-in-one platform for flag football teams — play designer, playbooks, roster management, AI-powered simulation, and instant sharing.
        </p>
        <div class="flex items-center justify-center gap-3 mt-8">
          <NuxtLink to="/auth/signup" class="hero-cta-primary">
            Get Started Free
            <ArrowRight class="w-4 h-4 ml-1.5" />
          </NuxtLink>
          <a href="#how-it-works" class="hero-cta-secondary" @click.prevent="scrollToSection('how-it-works')">
            See How It Works
          </a>
        </div>
      </div>
    </section>

    <!-- 3. Bento Feature Grid -->
    <section class="features-section">
      <div class="landing-container">
        <h2 class="section-heading font-copernicus">Everything your team needs</h2>
        <p class="section-sub">From drawing your first play to simulating the perfect game plan.</p>
        <div class="bento-grid">
          <div
            v-for="(feature, i) in features"
            :key="feature.title"
            ref="featureCards"
            class="bento-card reveal"
            :class="feature.span"
            :style="{ transitionDelay: `${i * 80}ms` }"
          >
            <div class="bento-content">
              <div class="bento-icon-wrap">
                <component :is="feature.icon" class="w-5 h-5" />
              </div>
              <h3 class="bento-title">{{ feature.title }}</h3>
              <p class="bento-desc">{{ feature.description }}</p>
            </div>
            <div class="bento-visual" v-html="feature.visual" />
          </div>
        </div>
      </div>
    </section>

    <!-- 4. How It Works -->
    <section id="how-it-works" class="how-section">
      <div class="landing-container">
        <h2 class="section-heading font-copernicus">How it works</h2>
        <p class="section-sub">Three steps to a smarter playbook.</p>
        <div class="steps-row">
          <div
            v-for="(step, i) in steps"
            :key="step.title"
            ref="stepCards"
            class="step-card reveal"
            :style="{ transitionDelay: `${i * 120}ms` }"
          >
            <div class="step-number">{{ i + 1 }}</div>
            <div class="step-icon-wrap">
              <component :is="step.icon" class="w-5 h-5" />
            </div>
            <h3 class="step-title">{{ step.title }}</h3>
            <p class="step-desc">{{ step.description }}</p>
          </div>
          <!-- Connecting dashed lines (between steps, desktop only) -->
          <div class="step-connector step-connector-1" />
          <div class="step-connector step-connector-2" />
        </div>
      </div>
    </section>

    <!-- 5. Simulation Deep Dive -->
    <section class="sim-section">
      <div class="landing-container">
        <div class="sim-grid reveal" ref="simSection">
          <div class="sim-text">
            <h2 class="section-heading font-copernicus text-left">Test your plays before game day</h2>
            <p class="sim-desc">
              Our AI-driven simulation engine runs your plays against real defensive schemes. Watch QB decision-making unfold in real time with play-by-play event logs.
            </p>
            <ul class="sim-checks">
              <li><Check class="w-4 h-4 text-primary" /> QB reads & progression logic</li>
              <li><Check class="w-4 h-4 text-primary" /> Defensive AI — zones, coverage & rush</li>
              <li><Check class="w-4 h-4 text-primary" /> Catch, incompletion, interception, sack & scramble outcomes</li>
              <li><Check class="w-4 h-4 text-primary" /> Configurable playback speed (0.1x–3x)</li>
              <li><Check class="w-4 h-4 text-primary" /> Real-time event log</li>
            </ul>
          </div>
          <div class="sim-visual">
            <svg viewBox="0 0 340 280" fill="none" xmlns="http://www.w3.org/2000/svg" class="sim-svg">
              <!-- Field -->
              <rect x="0" y="0" width="340" height="248" rx="12" fill="#fafbfc" stroke="var(--color-border)" stroke-width="1"/>
              <!-- Yard lines -->
              <line x1="16" y1="50" x2="324" y2="50" stroke="rgba(59,130,246,0.18)" stroke-width="1"/>
              <line x1="16" y1="100" x2="324" y2="100" stroke="rgba(59,130,246,0.18)" stroke-width="1"/>
              <line x1="16" y1="150" x2="324" y2="150" stroke="rgba(59,130,246,0.18)" stroke-width="1"/>
              <line x1="16" y1="200" x2="324" y2="200" stroke="rgba(59,130,246,0.18)" stroke-width="1"/>
              <!-- LOS -->
              <line x1="10" y1="155" x2="330" y2="155" stroke="rgba(59,130,246,0.65)" stroke-width="2" stroke-dasharray="8 4"/>
              <!-- Offense players -->
              <circle cx="170" cy="185" r="8" fill="#f97316" stroke="white" stroke-width="2.5"/>
              <circle cx="170" cy="152" r="7" fill="#f59e0b" stroke="white" stroke-width="2"/>
              <circle cx="60" cy="152" r="7" fill="#22c55e" stroke="white" stroke-width="2"/>
              <circle cx="280" cy="142" r="7" fill="#22c55e" stroke="white" stroke-width="2"/>
              <circle cx="225" cy="146" r="7" fill="#22c55e" stroke="white" stroke-width="2"/>
              <!-- WR routes (smooth curves) -->
              <path d="M60 152 C60 120, 60 105, 35 80" stroke="#22c55e" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.7"/>
              <polygon points="32,83 39,80 35,74" fill="#22c55e" opacity="0.7"/>
              <path d="M280 142 C280 110, 280 95, 310 70" stroke="#22c55e" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.7"/>
              <polygon points="312,73 306,70 310,64" fill="#22c55e" opacity="0.7"/>
              <path d="M225 146 C225 120, 225 110, 260 90" stroke="#22c55e" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.7"/>
              <polygon points="262,93 256,90 260,84" fill="#22c55e" opacity="0.7"/>
              <!-- Defense players -->
              <circle cx="60" cy="95" r="7" fill="#ef4444" stroke="white" stroke-width="2"/>
              <circle cx="280" cy="80" r="7" fill="#ef4444" stroke="white" stroke-width="2"/>
              <circle cx="170" cy="60" r="7" fill="#ef4444" stroke="white" stroke-width="2"/>
              <circle cx="130" cy="148" r="7" fill="#a855f7" stroke="white" stroke-width="2"/>
              <circle cx="215" cy="110" r="7" fill="#3b82f6" stroke="white" stroke-width="2"/>
              <!-- Throw arc (dashed orange) -->
              <path d="M170 185 Q200 130 280 142" stroke="#f97316" stroke-width="2" stroke-dasharray="6 4" fill="none" opacity="0.5"/>
              <!-- Animated ball -->
              <defs><path id="deepDiveBallPath" d="M170,185 Q200,130 280,142"/></defs>
              <circle r="5" fill="#fdd835">
                <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.05;0.55;0.65;1" dur="3s" repeatCount="indefinite"/>
                <animateMotion dur="3s" repeatCount="indefinite" keyPoints="0;0;1;1;1" keyTimes="0;0.05;0.6;0.65;1" calcMode="linear">
                  <mpath href="#deepDiveBallPath"/>
                </animateMotion>
              </circle>
              <!-- Timeline bar -->
              <rect x="0" y="256" width="340" height="20" rx="10" fill="var(--color-card)" stroke="var(--color-border)" stroke-width="1"/>
              <rect x="0" y="256" width="280" height="20" rx="10" fill="var(--color-primary)" opacity="0.1"/>
              <circle cx="50" cy="266" r="5" fill="#3b82f6"/>
              <circle cx="120" cy="266" r="5" fill="#3b82f6"/>
              <circle cx="200" cy="266" r="5" fill="#f97316"/>
              <circle cx="270" cy="266" r="5" fill="#22c55e" stroke="var(--color-card)" stroke-width="2"/>
            </svg>
          </div>
        </div>
      </div>
    </section>

    <!-- 6. Stats / Social Proof -->
    <section class="stats-section">
      <div class="landing-container">
        <div class="stats-row" ref="statsRow">
          <div v-for="stat in stats" :key="stat.label" class="stat-item reveal" :style="{ transitionDelay: `${stats.indexOf(stat) * 100}ms` }">
            <div class="stat-number">
              <template v-if="stat.countUp">
                <span ref="statNumbers" :data-target="stat.value">0</span>{{ stat.suffix }}
              </template>
              <template v-else>
                {{ stat.display }}
              </template>
            </div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 7. Final CTA -->
    <section class="final-cta">
      <div class="landing-container text-center">
        <h2 class="final-cta-heading font-copernicus">Ready to elevate your playbook?</h2>
        <p class="final-cta-sub">Start designing plays and running simulations in minutes — completely free.</p>
        <NuxtLink to="/auth/signup" class="hero-cta-primary mt-6">
          Create Free Account
          <ArrowRight class="w-4 h-4 ml-1.5" />
        </NuxtLink>
      </div>
    </section>

    <!-- 8. Footer -->
    <footer class="landing-footer">
      <div class="landing-container footer-inner">
        <span class="font-copernicus font-bold text-sm tracking-tight text-foreground">FlagLab</span>
        <p class="text-sm text-muted-foreground">&copy; {{ new Date().getFullYear() }} FlagLab. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { Pencil, BookOpen, Users, FlaskConical, Share2, Sparkles, ArrowRight, Check, Zap } from 'lucide-vue-next'
import Badge from '~/components/ui/badge/Badge.vue'

definePageMeta({
  layout: false,
})

useHead({
  title: 'FlagLab — Your Flag Football Platform',
  meta: [
    { name: 'description', content: 'Design flag football plays, build playbooks, manage your roster, and simulate plays with AI — all in one platform.' },
  ],
})

// ── Feature data ──
const features = [
  {
    title: 'Play Designer',
    description: 'Interactive canvas with drag-and-drop routes, formations, zones, and motion paths for offense and defense.',
    icon: Pencil,
    span: 'bento-wide',
    visual: `<svg viewBox="0 0 260 140" fill="none" xmlns="http://www.w3.org/2000/svg" class="bento-svg">
      <!-- Toolbar chrome -->
      <rect x="8" y="6" width="244" height="128" rx="8" fill="var(--color-card)" stroke="var(--color-border)" stroke-width="1"/>
      <rect x="8" y="6" width="244" height="22" rx="8" fill="var(--color-accent)"/>
      <rect x="8" y="20" width="244" height="8" fill="var(--color-accent)"/>
      <circle cx="20" cy="17" r="3" fill="#ef4444" opacity="0.7"/><circle cx="29" cy="17" r="3" fill="#f59e0b" opacity="0.7"/><circle cx="38" cy="17" r="3" fill="#22c55e" opacity="0.7"/>
      <rect x="100" y="13" width="60" height="8" rx="4" fill="var(--color-border)" opacity="0.5"/>
      <!-- View toggle pills -->
      <rect x="200" y="12" width="22" height="10" rx="5" fill="var(--color-primary)" opacity="0.8"/><rect x="224" y="12" width="22" height="10" rx="5" fill="var(--color-border)" opacity="0.5"/>
      <!-- Field canvas -->
      <rect x="14" y="32" width="232" height="96" rx="4" fill="#fafbfc" stroke="var(--color-border)" stroke-width="0.5"/>
      <!-- Yard lines -->
      <line x1="14" y1="56" x2="246" y2="56" stroke="rgba(59,130,246,0.18)" stroke-width="0.75"/>
      <line x1="14" y1="80" x2="246" y2="80" stroke="rgba(59,130,246,0.18)" stroke-width="0.75"/>
      <line x1="14" y1="104" x2="246" y2="104" stroke="rgba(59,130,246,0.18)" stroke-width="0.75"/>
      <!-- LOS -->
      <line x1="14" y1="90" x2="246" y2="90" stroke="rgba(59,130,246,0.65)" stroke-width="1.5" stroke-dasharray="6 3"/>
      <!-- Offense players -->
      <circle cx="130" cy="100" r="5" fill="#f97316" stroke="white" stroke-width="2"/>
      <circle cx="130" cy="88" r="4.5" fill="#f59e0b" stroke="white" stroke-width="2"/>
      <circle cx="60" cy="88" r="4.5" fill="#22c55e" stroke="white" stroke-width="2"/>
      <circle cx="200" cy="88" r="4.5" fill="#22c55e" stroke="white" stroke-width="2"/>
      <circle cx="165" cy="88" r="4.5" fill="#22c55e" stroke="white" stroke-width="2"/>
      <!-- Routes (smooth curves with arrowheads) -->
      <path d="M60 88 C60 68, 60 62, 38 52" stroke="#22c55e" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <polygon points="36,54 42,52 38,47" fill="#22c55e"/>
      <path d="M200 88 C200 68, 200 58, 222 48" stroke="#22c55e" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <polygon points="224,50 218,48 222,43" fill="#22c55e"/>
      <path d="M165 88 C165 72, 165 66, 185 56" stroke="#22c55e" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <polygon points="187,58 181,56 185,51" fill="#22c55e"/>
    </svg>`,
  },
  {
    title: 'Playbooks',
    description: 'Organize plays into playbooks. Filter by type, tag concepts, and build your game plan.',
    icon: BookOpen,
    span: 'bento-normal',
    visual: `<svg viewBox="0 0 160 110" fill="none" xmlns="http://www.w3.org/2000/svg" class="bento-svg">
      <!-- Tab bar -->
      <rect x="8" y="6" width="144" height="98" rx="8" fill="var(--color-card)" stroke="var(--color-border)" stroke-width="1"/>
      <rect x="14" y="12" width="28" height="12" rx="6" fill="var(--color-primary)" opacity="0.9"/><text x="28" y="21" text-anchor="middle" font-size="7" fill="white" font-weight="600">All</text>
      <rect x="46" y="12" width="38" height="12" rx="6" fill="var(--color-border)" opacity="0.5"/><text x="65" y="21" text-anchor="middle" font-size="7" fill="var(--color-muted-foreground)">Offense</text>
      <rect x="88" y="12" width="42" height="12" rx="6" fill="var(--color-border)" opacity="0.5"/><text x="109" y="21" text-anchor="middle" font-size="7" fill="var(--color-muted-foreground)">Defense</text>
      <!-- 2x2 play card grid -->
      <!-- Card 1 - offense -->
      <rect x="14" y="30" width="62" height="30" rx="4" fill="#fafbfc" stroke="var(--color-border)" stroke-width="0.75"/>
      <circle cx="28" cy="40" r="2.5" fill="#f97316" stroke="white" stroke-width="1"/><circle cx="36" cy="40" r="2.5" fill="#22c55e" stroke="white" stroke-width="1"/><circle cx="44" cy="40" r="2.5" fill="#22c55e" stroke="white" stroke-width="1"/><circle cx="36" cy="44" r="2.5" fill="#f59e0b" stroke="white" stroke-width="1"/>
      <rect x="14" y="53" width="40" height="4" rx="2" fill="var(--color-foreground)" opacity="0.12"/>
      <!-- Card 2 - offense -->
      <rect x="84" y="30" width="62" height="30" rx="4" fill="#fafbfc" stroke="var(--color-border)" stroke-width="0.75"/>
      <circle cx="98" cy="40" r="2.5" fill="#f97316" stroke="white" stroke-width="1"/><circle cx="106" cy="44" r="2.5" fill="#22c55e" stroke="white" stroke-width="1"/><circle cx="114" cy="40" r="2.5" fill="#22c55e" stroke="white" stroke-width="1"/><circle cx="106" cy="40" r="2.5" fill="#f59e0b" stroke="white" stroke-width="1"/>
      <rect x="84" y="53" width="36" height="4" rx="2" fill="var(--color-foreground)" opacity="0.12"/>
      <!-- Card 3 - defense -->
      <rect x="14" y="66" width="62" height="30" rx="4" fill="#fafbfc" stroke="var(--color-border)" stroke-width="0.75"/>
      <circle cx="28" cy="76" r="2.5" fill="#ef4444" stroke="white" stroke-width="1"/><circle cx="36" cy="76" r="2.5" fill="#ef4444" stroke="white" stroke-width="1"/><circle cx="44" cy="76" r="2.5" fill="#ef4444" stroke="white" stroke-width="1"/><circle cx="36" cy="80" r="2.5" fill="#a855f7" stroke="white" stroke-width="1"/>
      <rect x="14" y="89" width="44" height="4" rx="2" fill="var(--color-foreground)" opacity="0.12"/>
      <!-- Card 4 - offense -->
      <rect x="84" y="66" width="62" height="30" rx="4" fill="#fafbfc" stroke="var(--color-border)" stroke-width="0.75"/>
      <circle cx="98" cy="76" r="2.5" fill="#f97316" stroke="white" stroke-width="1"/><circle cx="106" cy="76" r="2.5" fill="#22c55e" stroke="white" stroke-width="1"/><circle cx="114" cy="80" r="2.5" fill="#22c55e" stroke="white" stroke-width="1"/><circle cx="106" cy="80" r="2.5" fill="#f59e0b" stroke="white" stroke-width="1"/>
      <rect x="84" y="89" width="38" height="4" rx="2" fill="var(--color-foreground)" opacity="0.12"/>
    </svg>`,
  },
  {
    title: 'Squad Management',
    description: 'Full roster with positions, starters, and 40+ offensive & defensive attributes per player.',
    icon: Users,
    span: 'bento-normal',
    visual: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="bento-svg">
      <rect x="8" y="6" width="144" height="108" rx="8" fill="var(--color-card)" stroke="var(--color-border)" stroke-width="1"/>
      <!-- Player identity row -->
      <circle cx="30" cy="24" r="12" fill="#f97316" stroke="white" stroke-width="2"/>
      <text x="30" y="27" text-anchor="middle" font-size="8" fill="white" font-weight="700">QB</text>
      <rect x="48" y="17" width="52" height="6" rx="3" fill="var(--color-foreground)" opacity="0.2"/>
      <text x="48" y="30" font-size="7" fill="var(--color-muted-foreground)">#7</text>
      <!-- Starter badge -->
      <rect x="108" y="17" width="34" height="12" rx="6" fill="#22c55e" opacity="0.15" stroke="#22c55e" stroke-width="0.75"/>
      <text x="125" y="26" text-anchor="middle" font-size="7" fill="#22c55e" font-weight="600">Starter</text>
      <!-- Attribute bars -->
      <text x="16" y="52" font-size="7" fill="var(--color-muted-foreground)">Speed</text>
      <rect x="56" y="46" width="88" height="6" rx="3" fill="var(--color-border)" opacity="0.5"/>
      <rect x="56" y="46" width="75" height="6" rx="3" fill="#f97316" opacity="0.7"/>
      <text x="16" y="66" font-size="7" fill="var(--color-muted-foreground)">Arm Str</text>
      <rect x="56" y="60" width="88" height="6" rx="3" fill="var(--color-border)" opacity="0.5"/>
      <rect x="56" y="60" width="62" height="6" rx="3" fill="#f97316" opacity="0.7"/>
      <text x="16" y="80" font-size="7" fill="var(--color-muted-foreground)">Accuracy</text>
      <rect x="56" y="74" width="88" height="6" rx="3" fill="var(--color-border)" opacity="0.5"/>
      <rect x="56" y="74" width="79" height="6" rx="3" fill="#f97316" opacity="0.7"/>
      <text x="16" y="94" font-size="7" fill="var(--color-muted-foreground)">Throw OTR</text>
      <rect x="56" y="88" width="88" height="6" rx="3" fill="var(--color-border)" opacity="0.5"/>
      <rect x="56" y="88" width="40" height="6" rx="3" fill="#f97316" opacity="0.7"/>
    </svg>`,
  },
  {
    title: 'Play Simulation',
    description: 'AI-driven engine simulates QB reads, defensive AI, flag pulls, and every outcome — completions, picks, sacks, scrambles.',
    icon: FlaskConical,
    span: 'bento-wide',
    visual: `<svg viewBox="0 0 260 130" fill="none" xmlns="http://www.w3.org/2000/svg" class="bento-svg">
      <!-- Field -->
      <rect x="8" y="6" width="244" height="100" rx="8" fill="#fafbfc" stroke="var(--color-border)" stroke-width="1"/>
      <!-- Yard lines -->
      <line x1="8" y1="30" x2="252" y2="30" stroke="rgba(59,130,246,0.18)" stroke-width="0.75"/>
      <line x1="8" y1="56" x2="252" y2="56" stroke="rgba(59,130,246,0.18)" stroke-width="0.75"/>
      <line x1="8" y1="82" x2="252" y2="82" stroke="rgba(59,130,246,0.18)" stroke-width="0.75"/>
      <!-- LOS -->
      <line x1="8" y1="66" x2="252" y2="66" stroke="rgba(59,130,246,0.65)" stroke-width="1.5" stroke-dasharray="6 3"/>
      <!-- Offense (moved from LOS) -->
      <circle cx="130" cy="78" r="5" fill="#f97316" stroke="white" stroke-width="2"/>
      <circle cx="130" cy="64" r="4" fill="#f59e0b" stroke="white" stroke-width="2"/>
      <circle cx="60" cy="64" r="4" fill="#22c55e" stroke="white" stroke-width="2"/>
      <circle cx="200" cy="58" r="4" fill="#22c55e" stroke="white" stroke-width="2"/>
      <circle cx="165" cy="60" r="4" fill="#22c55e" stroke="white" stroke-width="2"/>
      <!-- Defense -->
      <circle cx="60" cy="38" r="4" fill="#ef4444" stroke="white" stroke-width="2"/>
      <circle cx="200" cy="32" r="4" fill="#ef4444" stroke="white" stroke-width="2"/>
      <circle cx="130" cy="26" r="4" fill="#ef4444" stroke="white" stroke-width="2"/>
      <circle cx="110" cy="62" r="4" fill="#a855f7" stroke="white" stroke-width="2"/>
      <circle cx="160" cy="44" r="4" fill="#3b82f6" stroke="white" stroke-width="2"/>
      <!-- Throw arc (dashed) -->
      <path d="M130 78 Q145 50 200 58" stroke="#f97316" stroke-width="1.5" stroke-dasharray="4 3" fill="none" opacity="0.6"/>
      <!-- Animated ball -->
      <circle r="3.5" fill="#fdd835" opacity="0.9">
        <animateMotion dur="2.5s" repeatCount="indefinite" path="M130,78 Q145,50 200,58" keyPoints="0;1;1" keyTimes="0;0.6;1" calcMode="linear">
          <mpath href="#simBallPath"/>
        </animateMotion>
      </circle>
      <defs><path id="simBallPath" d="M130,78 Q145,50 200,58"/></defs>
      <circle r="3.5" fill="#fdd835">
        <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.05;0.55;0.65;1" dur="2.5s" repeatCount="indefinite"/>
        <animateMotion dur="2.5s" repeatCount="indefinite" keyPoints="0;0;1;1;1" keyTimes="0;0.01;0.6;0.65;1" calcMode="linear">
          <mpath href="#simBallPath"/>
        </animateMotion>
      </circle>
      <!-- Timeline bar -->
      <rect x="8" y="112" width="244" height="12" rx="6" fill="var(--color-card)" stroke="var(--color-border)" stroke-width="0.75"/>
      <rect x="8" y="112" width="200" height="12" rx="6" fill="var(--color-primary)" opacity="0.12"/>
      <circle cx="44" cy="118" r="3.5" fill="#3b82f6"/><circle cx="100" cy="118" r="3.5" fill="#3b82f6"/>
      <circle cx="156" cy="118" r="3.5" fill="#f97316"/><circle cx="210" cy="118" r="3.5" fill="#22c55e"/>
    </svg>`,
  },
  {
    title: 'Share Plays',
    description: 'Generate public shareable links — anyone can view formations and routes without creating an account.',
    icon: Share2,
    span: 'bento-normal',
    visual: `<svg viewBox="0 0 160 110" fill="none" xmlns="http://www.w3.org/2000/svg" class="bento-svg">
      <!-- Browser frame -->
      <rect x="8" y="6" width="144" height="98" rx="8" fill="var(--color-card)" stroke="var(--color-border)" stroke-width="1"/>
      <!-- URL bar -->
      <rect x="14" y="12" width="132" height="16" rx="4" fill="var(--color-accent)" stroke="var(--color-border)" stroke-width="0.5"/>
      <!-- Lock icon (simple) -->
      <rect x="20" y="17" width="5" height="4" rx="1" fill="var(--color-muted-foreground)" opacity="0.4"/>
      <path d="M21 17 V15.5 A1.5 1.5 0 0 1 24 15.5 V17" stroke="var(--color-muted-foreground)" stroke-width="0.75" fill="none" opacity="0.4"/>
      <text x="30" y="23" font-size="6.5" fill="var(--color-muted-foreground)" opacity="0.7">flaglab.app/s/a3f8...</text>
      <!-- Mini play preview -->
      <rect x="20" y="34" width="120" height="46" rx="4" fill="#fafbfc" stroke="var(--color-border)" stroke-width="0.5"/>
      <line x1="20" y1="50" x2="140" y2="50" stroke="rgba(59,130,246,0.18)" stroke-width="0.5"/>
      <line x1="20" y1="60" x2="140" y2="60" stroke="rgba(59,130,246,0.65)" stroke-width="1" stroke-dasharray="4 2"/>
      <circle cx="80" cy="68" r="3" fill="#f97316" stroke="white" stroke-width="1.5"/>
      <circle cx="80" cy="58" r="2.5" fill="#f59e0b" stroke="white" stroke-width="1"/>
      <circle cx="52" cy="58" r="2.5" fill="#22c55e" stroke="white" stroke-width="1"/>
      <circle cx="108" cy="58" r="2.5" fill="#22c55e" stroke="white" stroke-width="1"/>
      <path d="M52 58 C52 48, 52 44, 40 40" stroke="#22c55e" stroke-width="1" fill="none"/>
      <path d="M108 58 C108 48, 108 44, 120 40" stroke="#22c55e" stroke-width="1" fill="none"/>
      <!-- Action buttons -->
      <rect x="30" y="86" width="48" height="12" rx="6" fill="var(--color-primary)" opacity="0.9"/>
      <text x="54" y="94" text-anchor="middle" font-size="6.5" fill="white" font-weight="600">Copy Link</text>
      <rect x="84" y="86" width="40" height="12" rx="6" fill="var(--color-border)" opacity="0.6"/>
      <text x="104" y="94" text-anchor="middle" font-size="6.5" fill="var(--color-foreground)" opacity="0.7">Share</text>
    </svg>`,
  },
  {
    title: 'AI Play Suggestions',
    description: 'Get AI-powered play recommendations based on down, distance, and your team\'s strengths.',
    icon: Sparkles,
    span: 'bento-normal',
    visual: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="bento-svg">
      <rect x="8" y="6" width="144" height="108" rx="8" fill="var(--color-card)" stroke="var(--color-border)" stroke-width="1"/>
      <!-- Sparkle icon + header badge -->
      <rect x="14" y="12" width="76" height="14" rx="7" fill="var(--color-primary)" opacity="0.1" stroke="var(--color-primary)" stroke-width="0.5"/>
      <path d="M22 19 L23 16 L24 19 L27 20 L24 21 L23 24 L22 21 L19 20Z" fill="var(--color-primary)" opacity="0.8"/>
      <text x="32" y="22" font-size="7" fill="var(--color-primary)" font-weight="600">AI Suggestion</text>
      <!-- Down-distance pill -->
      <rect x="14" y="32" width="38" height="12" rx="6" fill="var(--color-accent)" stroke="var(--color-border)" stroke-width="0.5"/>
      <text x="33" y="41" text-anchor="middle" font-size="7" fill="var(--color-foreground)" opacity="0.7">2nd &amp; 5</text>
      <!-- Play name -->
      <text x="14" y="58" font-size="10" fill="var(--color-foreground)" font-weight="700">Slant Concept</text>
      <!-- Mini formation dots -->
      <circle cx="28" cy="78" r="3.5" fill="#f97316" stroke="white" stroke-width="1.5"/>
      <circle cx="28" cy="68" r="3" fill="#f59e0b" stroke="white" stroke-width="1"/>
      <circle cx="52" cy="68" r="3" fill="#22c55e" stroke="white" stroke-width="1"/>
      <circle cx="76" cy="68" r="3" fill="#22c55e" stroke="white" stroke-width="1"/>
      <circle cx="100" cy="68" r="3" fill="#22c55e" stroke="white" stroke-width="1"/>
      <!-- Route hints -->
      <path d="M52 68 C52 60, 62 56, 66 54" stroke="#22c55e" stroke-width="1" fill="none" opacity="0.5"/>
      <path d="M76 68 C76 60, 86 56, 90 54" stroke="#22c55e" stroke-width="1" fill="none" opacity="0.5"/>
      <!-- Confidence bar -->
      <text x="14" y="96" font-size="7" fill="var(--color-muted-foreground)">87% match</text>
      <rect x="14" y="100" width="132" height="6" rx="3" fill="var(--color-border)" opacity="0.5"/>
      <rect x="14" y="100" width="115" height="6" rx="3" fill="#22c55e" opacity="0.6"/>
      <!-- Sparkle decorations -->
      <path d="M134 14 L135 12 L136 14 L138 15 L136 16 L135 18 L134 16 L132 15Z" fill="var(--color-primary)" opacity="0.25"/>
      <path d="M140 28 L140.7 26.5 L141.4 28 L143 28.7 L141.4 29.4 L140.7 31 L140 29.4 L138.4 28.7Z" fill="var(--color-primary)" opacity="0.15"/>
    </svg>`,
  },
]

const steps = [
  {
    title: 'Build your squad',
    description: 'Create your roster, assign positions, and set player attributes for offense and defense.',
    icon: Users,
  },
  {
    title: 'Design your plays',
    description: 'Draw routes, set formations, and organize everything into your team playbook.',
    icon: Pencil,
  },
  {
    title: 'Simulate & share',
    description: 'Run AI simulations against different defenses, then share plays with your whole team.',
    icon: FlaskConical,
  },
]

const stats = [
  { label: 'Positions', value: 6, suffix: '', countUp: true, display: '' },
  { label: 'Player Attributes', value: 40, suffix: '+', countUp: true, display: '' },
  { label: 'AI Simulation', value: 0, suffix: '', countUp: false, display: 'Real-time' },
  { label: 'Sharing', value: 0, suffix: '', countUp: false, display: 'Instant' },
]

// ── Scroll to section ──
function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

// ── Intersection Observer for scroll reveals ──
const featureCards = ref<HTMLElement[]>([])
const stepCards = ref<HTMLElement[]>([])
const simSection = ref<HTMLElement | null>(null)
const statsRow = ref<HTMLElement | null>(null)
const statNumbers = ref<HTMLElement[]>([])

onMounted(() => {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          revealObserver.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.15 }
  )

  // Observe all reveal elements
  document.querySelectorAll('.reveal').forEach((el) => {
    revealObserver.observe(el)
  })

  // Count-up observer for stats
  const statsObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCountUp()
          statsObserver.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.3 }
  )

  if (statsRow.value) {
    statsObserver.observe(statsRow.value)
  }
})

function animateCountUp() {
  const els = statNumbers.value
  if (!els?.length) return
  els.forEach((el) => {
    const target = parseInt(el.dataset.target || '0', 10)
    if (target === 0) return
    const duration = 1200
    const start = performance.now()
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      el.textContent = String(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}
</script>

<style scoped>
.landing {
  min-height: 100vh;
  background: var(--color-background);
  color: var(--color-foreground);
  overflow-x: hidden;
}

/* ── Scroll reveal ── */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.reveal.visible {
  opacity: 1;
  transform: none;
}

/* ── Container ── */
.landing-container {
  max-width: 1120px;
  margin: 0 auto;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

/* ── 1. Nav ── */
.landing-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: color-mix(in oklch, var(--color-background) 80%, transparent);
  border-bottom: 1px solid color-mix(in oklch, var(--color-border) 60%, transparent);
  padding: 0 1.5rem;
}

.nav-link {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-muted-foreground);
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  transition: color 0.15s;
}
.nav-link:hover {
  color: var(--color-foreground);
}

.nav-cta {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-primary-foreground);
  background: var(--color-primary);
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.15s;
}
.nav-cta:hover {
  background: color-mix(in oklch, var(--color-primary) 88%, black);
}

/* ── 2. Hero ── */
.hero {
  position: relative;
  padding: 6rem 1.5rem 5rem;
}

.hero-glow {
  position: absolute;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(ellipse, color-mix(in oklch, var(--color-primary) 8%, transparent) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.hero-badge {
  margin-bottom: 1.5rem;
}

.hero-title {
  font-size: clamp(2.25rem, 5.5vw, 3.75rem);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.025em;
  color: var(--color-foreground);
  margin: 0;
}

.hero-gradient {
  background: linear-gradient(135deg, var(--color-primary), oklch(0.65 0.2 200));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-sub {
  font-size: 1.125rem;
  line-height: 1.65;
  color: var(--color-muted-foreground);
  max-width: 580px;
  margin: 1.5rem auto 0;
}

.hero-cta-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-primary-foreground);
  background: var(--color-primary);
  padding: 0.75rem 1.75rem;
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.15s, transform 0.15s;
}
.hero-cta-primary:hover {
  background: color-mix(in oklch, var(--color-primary) 88%, black);
  transform: translateY(-1px);
}

.hero-cta-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-foreground);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  padding: 0.75rem 1.75rem;
  border-radius: 8px;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.hero-cta-secondary:hover {
  background: var(--color-accent);
}

/* ── Section headings ── */
.section-heading {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 700;
  text-align: center;
  margin: 0;
  letter-spacing: -0.015em;
}

.section-sub {
  font-size: 1.0625rem;
  color: var(--color-muted-foreground);
  text-align: center;
  margin: 0.75rem 0 0;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
}

/* ── 3. Bento Grid ── */
.features-section {
  padding: 5rem 1.5rem;
}

.bento-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
  margin-top: 3rem;
}

@media (min-width: 640px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .bento-wide {
    grid-column: span 2;
  }
}

@media (min-width: 1024px) {
  .bento-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  .bento-wide {
    grid-column: span 2;
  }
  .bento-normal {
    grid-column: span 2;
  }
}

.bento-card {
  padding: 1.5rem;
  border-radius: 14px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s, opacity 0.6s ease, transform 0.6s ease;
}
.bento-card:hover {
  border-color: color-mix(in oklch, var(--color-primary) 30%, var(--color-border));
  box-shadow: 0 4px 24px color-mix(in oklch, var(--color-primary) 6%, transparent);
}

.bento-content {
  flex: 1;
}

.bento-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklch, var(--color-primary) 10%, transparent);
  color: var(--color-primary);
  margin-bottom: 0.875rem;
}

.bento-title {
  font-size: 1.0625rem;
  font-weight: 600;
  margin: 0 0 0.375rem;
}

.bento-desc {
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--color-muted-foreground);
  margin: 0;
}

.bento-visual {
  margin-top: 1.25rem;
  display: flex;
  justify-content: center;
}

.bento-svg {
  width: 100%;
  max-width: 260px;
  height: auto;
}
.bento-wide .bento-svg {
  max-width: 340px;
}

/* ── 4. How It Works ── */
.how-section {
  padding: 5rem 1.5rem;
  background: color-mix(in oklch, var(--color-accent) 40%, transparent);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.steps-row {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-top: 3rem;
  position: relative;
  align-items: center;
}

@media (min-width: 768px) {
  .steps-row {
    flex-direction: row;
    gap: 2.5rem;
    align-items: flex-start;
    justify-content: center;
  }
}

.step-card {
  text-align: center;
  max-width: 280px;
  flex: 1;
  position: relative;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  font-weight: 700;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.75rem;
}

.step-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  color: var(--color-primary);
  margin: 0 auto 0.75rem;
}

.step-title {
  font-size: 1.0625rem;
  font-weight: 600;
  margin: 0 0 0.375rem;
}

.step-desc {
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--color-muted-foreground);
  margin: 0;
}

/* Connectors (desktop only) */
.step-connector {
  display: none;
}

@media (min-width: 768px) {
  .step-connector {
    display: block;
    position: absolute;
    top: 16px;
    height: 0;
    border-top: 2px dashed var(--color-border);
    z-index: 0;
  }
  .step-connector-1 {
    left: calc(33.33% + 16px);
    width: calc(33.33% - 32px - 2.5rem);
  }
  .step-connector-2 {
    left: calc(66.66% + 16px);
    width: calc(33.33% - 32px - 2.5rem);
  }
}

/* ── 5. Simulation Deep Dive ── */
.sim-section {
  padding: 5rem 1.5rem;
}

.sim-grid {
  display: grid;
  gap: 3rem;
  grid-template-columns: 1fr;
  align-items: center;
}

@media (min-width: 1024px) {
  .sim-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.sim-text .section-heading {
  text-align: left;
}

.sim-desc {
  font-size: 1rem;
  line-height: 1.65;
  color: var(--color-muted-foreground);
  margin: 1rem 0 1.5rem;
}

.sim-checks {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.sim-checks li {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.9375rem;
  color: var(--color-foreground);
}

/* Simulation visual */
.sim-visual {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sim-svg {
  width: 100%;
  height: auto;
  border-radius: 12px;
}

/* ── 6. Stats ── */
.stats-section {
  padding: 4rem 1.5rem;
  background: color-mix(in oklch, var(--color-accent) 40%, transparent);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  text-align: center;
}

@media (min-width: 640px) {
  .stats-row {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-number {
  font-family: 'Copernicus', sans-serif;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-foreground);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-muted-foreground);
  font-weight: 500;
}

/* ── 7. Final CTA ── */
.final-cta {
  padding: 5rem 1.5rem;
  background: linear-gradient(135deg, color-mix(in oklch, var(--color-primary) 8%, var(--color-background)), color-mix(in oklch, oklch(0.65 0.2 200) 6%, var(--color-background)));
}

.final-cta-heading {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.015em;
}

.final-cta-sub {
  font-size: 1.0625rem;
  color: var(--color-muted-foreground);
  margin: 0.75rem 0 0;
  max-width: 460px;
  margin-left: auto;
  margin-right: auto;
}

/* ── 8. Footer ── */
.landing-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--color-border);
}

.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
