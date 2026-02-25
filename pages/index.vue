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
            <!-- CSS art: mini simulation field -->
            <div class="sim-field">
              <!-- Yard lines -->
              <div class="sim-yard-line" style="top: 20%" />
              <div class="sim-yard-line" style="top: 40%" />
              <div class="sim-yard-line" style="top: 60%" />
              <div class="sim-yard-line" style="top: 80%" />
              <!-- LOS -->
              <div class="sim-los" />
              <!-- Offense players -->
              <div class="sim-player sim-offense" style="left: 50%; top: 62%" title="QB">
                <svg class="sim-route" viewBox="0 0 40 60" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 0 L20 -30" stroke="#f97316" stroke-width="2" stroke-dasharray="4 3" fill="none" opacity="0.6" />
                </svg>
              </div>
              <div class="sim-player sim-offense" style="left: 50%; top: 55%" title="C" />
              <div class="sim-player sim-wr" style="left: 20%; top: 55%" title="WR">
                <svg class="sim-route" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
                  <path d="M30 0 L30 -40 L55 -40" stroke="#22c55e" stroke-width="2" stroke-dasharray="4 3" fill="none" opacity="0.7" />
                </svg>
              </div>
              <div class="sim-player sim-wr" style="left: 80%; top: 55%" title="WR">
                <svg class="sim-route" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
                  <path d="M30 0 L30 -50 L10 -60" stroke="#22c55e" stroke-width="2" stroke-dasharray="4 3" fill="none" opacity="0.7" />
                </svg>
              </div>
              <div class="sim-player sim-wr" style="left: 65%; top: 55%" title="WR">
                <svg class="sim-route" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
                  <path d="M30 0 L30 -25 L50 -35" stroke="#22c55e" stroke-width="2" stroke-dasharray="4 3" fill="none" opacity="0.7" />
                </svg>
              </div>
              <!-- Defense players -->
              <div class="sim-player sim-defense" style="left: 50%; top: 42%" title="RSH" />
              <div class="sim-player sim-db" style="left: 20%; top: 35%" title="DB" />
              <div class="sim-player sim-db" style="left: 80%; top: 35%" title="DB" />
              <div class="sim-player sim-db" style="left: 50%; top: 25%" title="DB" />
              <div class="sim-player sim-mlb" style="left: 50%; top: 38%" title="MLB" />
              <!-- Animated ball flight -->
              <div class="sim-ball" />
            </div>
            <!-- Timeline bar -->
            <div class="sim-timeline">
              <div class="sim-timeline-fill" />
              <div class="sim-event-dot" style="left: 15%" title="Snap" />
              <div class="sim-event-dot" style="left: 35%" title="Routes" />
              <div class="sim-event-dot" style="left: 60%" title="Throw" />
              <div class="sim-event-dot sim-event-dot-active" style="left: 82%" title="Catch" />
            </div>
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
    visual: `<svg viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="bento-svg">
      <rect x="10" y="10" width="180" height="80" rx="6" fill="#2d7a45" opacity="0.15"/>
      <line x1="10" y1="35" x2="190" y2="35" stroke="#2d7a45" stroke-width="0.5" opacity="0.3"/>
      <line x1="10" y1="60" x2="190" y2="60" stroke="#2d7a45" stroke-width="0.5" opacity="0.3"/>
      <line x1="10" y1="50" x2="190" y2="50" stroke="#f97316" stroke-width="1" opacity="0.5" stroke-dasharray="4 2"/>
      <circle cx="100" cy="62" r="4" fill="#f97316"/>
      <circle cx="100" cy="55" r="3.5" fill="#f59e0b"/>
      <circle cx="60" cy="55" r="3.5" fill="#22c55e"/>
      <circle cx="140" cy="55" r="3.5" fill="#22c55e"/>
      <circle cx="120" cy="55" r="3.5" fill="#22c55e"/>
      <path d="M60 55 L60 35 L40 28" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.7"/>
      <path d="M140 55 L140 30 L160 25" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.7"/>
      <path d="M120 55 L120 40 L140 35" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.7"/>
    </svg>`,
  },
  {
    title: 'Playbooks',
    description: 'Organize plays into playbooks. Filter by type, tag concepts, and build your game plan.',
    icon: BookOpen,
    span: 'bento-normal',
    visual: `<svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="bento-svg">
      <rect x="15" y="20" width="70" height="50" rx="4" fill="var(--color-border)" opacity="0.5"/>
      <rect x="20" y="15" width="70" height="50" rx="4" fill="var(--color-border)" opacity="0.7"/>
      <rect x="25" y="10" width="70" height="50" rx="4" fill="var(--color-card)" stroke="var(--color-border)" stroke-width="1"/>
      <line x1="33" y1="22" x2="75" y2="22" stroke="var(--color-foreground)" stroke-width="1.5" opacity="0.3"/>
      <line x1="33" y1="30" x2="87" y2="30" stroke="var(--color-foreground)" stroke-width="1" opacity="0.15"/>
      <line x1="33" y1="36" x2="80" y2="36" stroke="var(--color-foreground)" stroke-width="1" opacity="0.15"/>
      <line x1="33" y1="42" x2="70" y2="42" stroke="var(--color-foreground)" stroke-width="1" opacity="0.15"/>
    </svg>`,
  },
  {
    title: 'Squad Management',
    description: 'Full roster with positions, starters, and 40+ offensive & defensive attributes per player.',
    icon: Users,
    span: 'bento-normal',
    visual: `<svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="bento-svg">
      <circle cx="35" cy="25" r="8" fill="#f97316" opacity="0.2" stroke="#f97316" stroke-width="1"/>
      <circle cx="60" cy="25" r="8" fill="#22c55e" opacity="0.2" stroke="#22c55e" stroke-width="1"/>
      <circle cx="85" cy="25" r="8" fill="#3b82f6" opacity="0.2" stroke="#3b82f6" stroke-width="1"/>
      <text x="35" y="28" text-anchor="middle" font-size="7" fill="#f97316" font-weight="600">QB</text>
      <text x="60" y="28" text-anchor="middle" font-size="7" fill="#22c55e" font-weight="600">WR</text>
      <text x="85" y="28" text-anchor="middle" font-size="7" fill="#3b82f6" font-weight="600">DB</text>
      <rect x="20" y="44" width="30" height="4" rx="2" fill="var(--color-border)"/>
      <rect x="20" y="44" width="22" height="4" rx="2" fill="#f97316" opacity="0.6"/>
      <rect x="45" y="44" width="30" height="4" rx="2" fill="var(--color-border)"/>
      <rect x="45" y="44" width="26" height="4" rx="2" fill="#22c55e" opacity="0.6"/>
      <rect x="70" y="44" width="30" height="4" rx="2" fill="var(--color-border)"/>
      <rect x="70" y="44" width="18" height="4" rx="2" fill="#3b82f6" opacity="0.6"/>
      <rect x="20" y="52" width="30" height="4" rx="2" fill="var(--color-border)"/>
      <rect x="20" y="52" width="15" height="4" rx="2" fill="#f97316" opacity="0.4"/>
      <rect x="45" y="52" width="30" height="4" rx="2" fill="var(--color-border)"/>
      <rect x="45" y="52" width="28" height="4" rx="2" fill="#22c55e" opacity="0.4"/>
      <rect x="70" y="52" width="30" height="4" rx="2" fill="var(--color-border)"/>
      <rect x="70" y="52" width="24" height="4" rx="2" fill="#3b82f6" opacity="0.4"/>
    </svg>`,
  },
  {
    title: 'Play Simulation',
    description: 'AI-driven engine simulates QB reads, defensive AI, flag pulls, and every outcome — completions, picks, sacks, scrambles.',
    icon: FlaskConical,
    span: 'bento-wide',
    visual: `<svg viewBox="0 0 200 90" fill="none" xmlns="http://www.w3.org/2000/svg" class="bento-svg">
      <rect x="10" y="5" width="180" height="70" rx="6" fill="#2d7a45" opacity="0.12"/>
      <line x1="10" y1="40" x2="190" y2="40" stroke="#f97316" stroke-width="0.8" opacity="0.4" stroke-dasharray="4 2"/>
      <circle cx="100" cy="48" r="4" fill="#f97316" opacity="0.8"/>
      <circle cx="70" cy="42" r="3" fill="#22c55e" opacity="0.8"/>
      <circle cx="130" cy="42" r="3" fill="#22c55e" opacity="0.8"/>
      <circle cx="100" cy="30" r="3" fill="#ef4444" opacity="0.8"/>
      <circle cx="70" cy="25" r="3" fill="#ef4444" opacity="0.8"/>
      <circle cx="130" cy="25" r="3" fill="#ef4444" opacity="0.8"/>
      <path d="M100 48 Q110 35 130 42" stroke="#f97316" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.5"/>
      <circle cx="115" cy="38" r="2" fill="#f59e0b" opacity="0.8">
        <animateMotion dur="2s" repeatCount="indefinite" path="M0 0 Q10 -10 25 -5" />
      </circle>
      <rect x="10" y="80" width="180" height="4" rx="2" fill="var(--color-border)"/>
      <rect x="10" y="80" width="120" height="4" rx="2" fill="var(--color-primary)" opacity="0.5"/>
      <circle cx="30" cy="82" r="2.5" fill="var(--color-primary)"/>
      <circle cx="70" cy="82" r="2.5" fill="var(--color-primary)"/>
      <circle cx="110" cy="82" r="2.5" fill="var(--color-primary)"/>
    </svg>`,
  },
  {
    title: 'Share Plays',
    description: 'Generate public shareable links — anyone can view formations and routes without creating an account.',
    icon: Share2,
    span: 'bento-normal',
    visual: `<svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="bento-svg">
      <circle cx="60" cy="30" r="14" fill="var(--color-primary)" opacity="0.1" stroke="var(--color-primary)" stroke-width="1"/>
      <circle cx="30" cy="55" r="10" fill="var(--color-primary)" opacity="0.08" stroke="var(--color-primary)" stroke-width="0.8"/>
      <circle cx="90" cy="55" r="10" fill="var(--color-primary)" opacity="0.08" stroke="var(--color-primary)" stroke-width="0.8"/>
      <line x1="50" y1="38" x2="36" y2="49" stroke="var(--color-primary)" stroke-width="1" opacity="0.4"/>
      <line x1="70" y1="38" x2="84" y2="49" stroke="var(--color-primary)" stroke-width="1" opacity="0.4"/>
      <path d="M55 28 L65 28 L63 26 M65 28 L63 30" stroke="var(--color-primary)" stroke-width="1.5" opacity="0.6"/>
    </svg>`,
  },
  {
    title: 'AI Play Suggestions',
    description: 'Get AI-powered play recommendations based on down, distance, and your team\'s strengths.',
    icon: Sparkles,
    span: 'bento-normal',
    visual: `<svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="bento-svg">
      <path d="M60 15 L63 25 L73 25 L65 32 L68 42 L60 36 L52 42 L55 32 L47 25 L57 25 Z" fill="var(--color-primary)" opacity="0.15" stroke="var(--color-primary)" stroke-width="0.8"/>
      <path d="M30 40 L32 46 L38 46 L33 50 L35 56 L30 52 L25 56 L27 50 L22 46 L28 46 Z" fill="var(--color-primary)" opacity="0.08" stroke="var(--color-primary)" stroke-width="0.5"/>
      <path d="M90 40 L92 46 L98 46 L93 50 L95 56 L90 52 L85 56 L87 50 L82 46 L88 46 Z" fill="var(--color-primary)" opacity="0.08" stroke="var(--color-primary)" stroke-width="0.5"/>
      <rect x="30" y="62" width="60" height="6" rx="3" fill="var(--color-border)"/>
      <rect x="30" y="62" width="42" height="6" rx="3" fill="var(--color-primary)" opacity="0.3"/>
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
  max-width: 200px;
  height: auto;
}
.bento-wide .bento-svg {
  max-width: 280px;
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

.sim-field {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: linear-gradient(180deg, #2d7a45 0%, #348c4f 100%);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid color-mix(in oklch, var(--color-border) 50%, #2d7a45);
}

.sim-yard-line {
  position: absolute;
  left: 8%;
  right: 8%;
  height: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.sim-los {
  position: absolute;
  left: 5%;
  right: 5%;
  top: 52%;
  height: 0;
  border-top: 2px solid #f97316;
  opacity: 0.6;
}

.sim-player {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.sim-offense {
  background: #f97316;
  box-shadow: 0 0 6px rgba(249, 115, 22, 0.5);
}

.sim-wr {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
}

.sim-defense {
  background: #a855f7;
  box-shadow: 0 0 6px rgba(168, 85, 247, 0.5);
}

.sim-db {
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
}

.sim-mlb {
  background: #3b82f6;
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
}

.sim-route {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 80px;
  overflow: visible;
  pointer-events: none;
}

.sim-ball {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fdd835;
  box-shadow: 0 0 8px rgba(253, 216, 53, 0.6);
  left: 50%;
  top: 62%;
  transform: translate(-50%, -50%);
  animation: ballFly 3s ease-in-out infinite;
}

@keyframes ballFly {
  0%, 100% { left: 50%; top: 62%; opacity: 0; }
  10% { opacity: 1; }
  50% { left: 78%; top: 45%; opacity: 1; }
  60% { opacity: 0; }
}

.sim-timeline {
  position: relative;
  width: 100%;
  height: 20px;
  background: var(--color-card);
  border-radius: 10px;
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.sim-timeline-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 82%;
  background: linear-gradient(90deg, color-mix(in oklch, var(--color-primary) 15%, transparent), color-mix(in oklch, var(--color-primary) 30%, transparent));
  border-radius: 10px;
}

.sim-event-dot {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  opacity: 0.6;
}

.sim-event-dot-active {
  opacity: 1;
  box-shadow: 0 0 6px color-mix(in oklch, var(--color-primary) 50%, transparent);
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
