import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Satoshi', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        verified: {
          DEFAULT: "hsl(var(--verified))",
          foreground: "hsl(var(--verified-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
      },
      /** SejaLocador: revelação ao scroll (mobile) — curva longa e suave. */
      transitionDuration: {
        reveal: "880ms",
      },
      transitionTimingFunction: {
        reveal: "cubic-bezier(0.22, 1, 0.32, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        /** Explorar: pílula “Buscar e filtrar” — entrada com leve overshoot */
        "explore-pill-in": {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.82)" },
          "65%": { opacity: "1", transform: "translateY(-2px) scale(1.04)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "explore-pill-out": {
          "0%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(8px) scale(0.88)" },
        },
        /**
         * SejaLocador: iate em translate3d (GPU) — evita subpixels de `left` que “borram” o PNG.
         * `left:0` no elemento; só o transform anima.
         */
        "seja-locador-boat-once": {
          "0%": { transform: "translate3d(23vw, 0, 0)" },
          "100%": { transform: "translate3d(118vw, 0, 0)" },
        },
        /** Leve flutuação — iate permanece visível na hero. */
        "seja-locador-boat-float": {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -10px, 0)" },
        },
        /** BoatCard: opcionais em letreiro (faixa duplicada → -50%). */
        "boat-card-optionals-marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "bbq-kit-collapsible-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-collapsible-content-height)", opacity: "1" },
        },
        "bbq-kit-collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "bbq-kit-row-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "favorite-pop": {
          "0%": { transform: "scale(1)" },
          "45%": { transform: "scale(1.32)" },
          "100%": { transform: "scale(1)" },
        },
        "page-enter": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "stagger-fade-in": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "home-enter": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out forwards",
        "explore-pill-in": "explore-pill-in 0.36s cubic-bezier(0.4, 0, 0.2, 1) both",
        "explore-pill-out": "explore-pill-out 0.28s cubic-bezier(0.4, 0, 0.2, 1) both",
        /** 110s bem lenta; linear = velocidade constante; 2.5s antes de começar a mover. */
        "seja-locador-boat-once":
          "seja-locador-boat-once 110s linear 2.5s both",
        "seja-locador-boat-float":
          "seja-locador-boat-float 7s ease-in-out infinite",
        "boat-card-optionals-marquee":
          "boat-card-optionals-marquee 16s linear infinite",
        "bbq-kit-collapsible-down":
          "bbq-kit-collapsible-down 0.38s cubic-bezier(0.22, 1, 0.32, 1) forwards",
        "bbq-kit-collapsible-up":
          "bbq-kit-collapsible-up 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "bbq-kit-row-in": "bbq-kit-row-in 0.32s cubic-bezier(0.22, 1, 0.32, 1) both",
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "favorite-pop": "favorite-pop 0.38s cubic-bezier(0.22, 1, 0.32, 1)",
        "page-enter": "page-enter 0.32s cubic-bezier(0.22, 1, 0.32, 1) both",
        "stagger-fade-in": "stagger-fade-in 0.45s cubic-bezier(0.22, 1, 0.32, 1) both",
        "home-enter": "home-enter 0.55s cubic-bezier(0.22, 1, 0.32, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
