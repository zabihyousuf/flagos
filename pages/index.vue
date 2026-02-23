<template>
  <div class="landing">
    <!-- Nav -->
    <header class="landing-nav">
      <div class="landing-container flex items-center justify-between h-16">
        <span class="font-copernicus font-bold text-xl tracking-tight text-foreground">FlagOS</span>
        <div class="flex items-center gap-3">
          <NuxtLink to="/auth/login" class="nav-link">Log In</NuxtLink>
          <NuxtLink to="/auth/signup" class="nav-cta">Sign Up</NuxtLink>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="hero">
      <div class="landing-container text-center">
        <h1 class="hero-title font-copernicus">
          Your one platform for<br class="hidden sm:block" /> all things flag football
        </h1>
        <p class="hero-sub">
          Design plays, build playbooks, manage your roster, and simulate game scenarios — everything your team needs in one place.
        </p>
        <div class="flex items-center justify-center gap-3 mt-8">
          <NuxtLink to="/auth/signup" class="hero-cta-primary">Get Started</NuxtLink>
          <NuxtLink to="/auth/login" class="hero-cta-secondary">Log In</NuxtLink>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="features">
      <div class="landing-container">
        <h2 class="features-heading font-copernicus">Everything you need to win</h2>
        <div class="features-grid">
          <div v-for="feature in features" :key="feature.title" class="feature-card">
            <div class="feature-icon-wrap">
              <component :is="feature.icon" class="w-5 h-5" />
            </div>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-desc">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-section">
      <div class="landing-container text-center">
        <h2 class="cta-heading font-copernicus">Ready to level up your playbook?</h2>
        <p class="cta-sub">Join FlagOS and start designing plays in minutes.</p>
        <NuxtLink to="/auth/signup" class="hero-cta-primary mt-6">Create Free Account</NuxtLink>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="landing-container text-center">
        <p class="text-sm text-muted-foreground">&copy; {{ new Date().getFullYear() }} FlagOS. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { Pencil, BookOpen, Users, FlaskConical, Share2 } from 'lucide-vue-next'

definePageMeta({
  layout: false,
})

useHead({
  title: 'FlagOS — Your Flag Football Platform',
  meta: [
    { name: 'description', content: 'Design flag football plays, build playbooks, manage your roster, and simulate plays — all in one platform.' },
  ],
})

const features = [
  {
    title: 'Play Designer',
    description: 'Draw offensive plays and defensive coverages on an interactive canvas with routes, zones, and formations.',
    icon: Pencil,
  },
  {
    title: 'Playbooks',
    description: 'Organize your plays into playbooks. Filter by type, tag concepts, and build a game plan your team can follow.',
    icon: BookOpen,
  },
  {
    title: 'Squad Management',
    description: 'Create your roster, assign positions, set starters, and track player attributes for offense and defense.',
    icon: Users,
  },
  {
    title: 'Play Simulation',
    description: 'Run your plays against different defenses using AI-driven simulation to see how they perform in real scenarios.',
    icon: FlaskConical,
  },
  {
    title: 'Share Plays',
    description: 'Generate shareable links for any play so your team can view formations and routes without needing an account.',
    icon: Share2,
  },
]
</script>

<style scoped>
.landing {
  min-height: 100vh;
  background: var(--color-background);
  color: var(--color-foreground);
}

/* Nav */
.landing-nav {
  border-bottom: 1px solid var(--color-border);
  padding: 0 1.5rem;
}

.landing-container {
  max-width: 1080px;
  margin: 0 auto;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
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
  background: color-mix(in oklch, var(--color-primary) 90%, black);
}

/* Hero */
.hero {
  padding: 5rem 1.5rem 4rem;
}

.hero-title {
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: var(--color-foreground);
  margin: 0;
}

.hero-sub {
  font-size: 1.125rem;
  line-height: 1.6;
  color: var(--color-muted-foreground);
  max-width: 560px;
  margin: 1.25rem auto 0;
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
  transition: background 0.15s;
}

.hero-cta-primary:hover {
  background: color-mix(in oklch, var(--color-primary) 90%, black);
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
  transition: background 0.15s, border-color 0.15s;
}

.hero-cta-secondary:hover {
  background: var(--color-accent);
}

/* Features */
.features {
  padding: 3rem 1.5rem 4rem;
}

.features-heading {
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  margin: 0 0 2.5rem;
  letter-spacing: -0.01em;
}

.features-grid {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.feature-card {
  padding: 1.5rem;
  border-radius: 12px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
}

.feature-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklch, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
  margin-bottom: 0.75rem;
}

.feature-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.375rem;
}

.feature-desc {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-muted-foreground);
  margin: 0;
}

/* CTA Section */
.cta-section {
  padding: 4rem 1.5rem;
  background: color-mix(in oklch, var(--color-accent) 50%, transparent);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.cta-heading {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.01em;
}

.cta-sub {
  font-size: 1rem;
  color: var(--color-muted-foreground);
  margin: 0.75rem 0 0;
}

/* Footer */
.landing-footer {
  padding: 2rem 1.5rem;
}
</style>
