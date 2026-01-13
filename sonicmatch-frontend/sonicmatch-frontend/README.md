# SonicMatch Frontend

A premium, production-ready frontend for an AI-powered headphone recommendation platform. Built with Next.js 14, Tailwind CSS, Framer Motion, and Zustand.

## 🎯 Design Philosophy

**Aesthetic Direction**: Dark, premium audio-tech with neon pink accents. Inspired by Spotify's personalization, Apple's polish, and Linear's performance.

- **Dark Mode Default**: Deep blacks (#0A0A0B) with carefully crafted opacity layers
- **Neon Accent**: Sonic pink (#FF2D55) to coral gradient for energy and audio vibes
- **Glassmorphism**: Subtle frosted glass effects with noise texture overlays
- **Fluid Motion**: Spring-based animations with staggered reveals

## 🏗️ Architecture

```
sonicmatch-frontend/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page with parallax hero
│   ├── wizard/page.tsx    # Multi-step preference wizard
│   ├── results/page.tsx   # Recommendation results
│   ├── compare/page.tsx   # Side-by-side comparison
│   ├── layout.tsx         # Root layout with fonts
│   └── providers.tsx      # Client-side providers
├── components/
│   ├── landing/           # Landing page sections
│   │   ├── AudioWaveform.tsx
│   │   ├── FeatureGrid.tsx
│   │   ├── HowItWorks.tsx
│   │   └── Testimonials.tsx
│   ├── wizard/            # Wizard components
│   │   ├── WizardProgress.tsx
│   │   └── steps/
│   │       ├── GenreStep.tsx
│   │       ├── ArtistStep.tsx
│   │       ├── SoundStep.tsx
│   │       ├── UseCaseStep.tsx
│   │       ├── BudgetStep.tsx
│   │       └── FeaturesStep.tsx
│   ├── results/           # Results components
│   │   ├── HeadphoneCard.tsx
│   │   ├── SoundProfileChart.tsx
│   │   └── ResultsSkeleton.tsx
│   └── layout/            # Layout components
│       ├── Navigation.tsx
│       └── Footer.tsx
├── stores/                # Zustand state management
│   └── index.ts
├── styles/
│   └── globals.css        # Global styles & CSS variables
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
└── public/                # Static assets
```

## 🎨 Design System

### Colors
```css
--sonic-black: #0A0A0B      /* Primary background */
--sonic-dark: #111113       /* Secondary background */
--sonic-pink: #FF2D55       /* Primary accent */
--sonic-red: #FF4566        /* Secondary accent */
--sonic-coral: #FF6B8A      /* Tertiary accent */
```

### Typography
- **Display**: Clash Display (headings)
- **Body**: Satoshi (body text)
- **Mono**: JetBrains Mono (code/numbers)

### Animation Principles
1. **Spring-based motion**: Natural, physics-based animations
2. **Staggered reveals**: Sequential element appearances
3. **Micro-interactions**: Hover states, button feedback
4. **Page transitions**: Smooth route changes

## 📱 Pages

### Landing Page (`/`)
- Animated gradient background with floating orbs
- Parallax hero section with scroll-based effects
- Audio waveform visualization
- Feature grid with hover glows
- Step-by-step "How it Works"
- Testimonial cards
- Final CTA with glassmorphism

### Wizard (`/wizard`)
- 6-step preference collection flow
- Animated step transitions (slide + fade)
- Progress indicator with step icons
- Keyboard navigation (←/→ arrows, Enter)
- Genre chip selection with quick presets
- Artist search with autocomplete
- Interactive EQ visualization
- Dual-handle budget slider
- Feature toggles

### Results (`/results`)
- Skeleton loading state with waveform animation
- Top pick highlight card
- Score breakdown visualizations
- Expandable explanation sections
- Compare list management
- Floating compare bar

### Compare (`/compare`)
- Side-by-side table layout
- Score bar comparisons
- Feature-by-feature breakdown
- Remove/clear functionality

## 🔧 State Management

Using **Zustand** with three stores:

### `useWizardStore`
- Current step tracking
- User preferences object
- Genre/artist/sound management
- Budget range handling

### `useRecommendationsStore`
- Session management
- Recommendation results
- Compare list (max 4 items)
- Loading/error states

### `useUIStore`
- Mobile menu state
- Modal management
- Toast notifications

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check
```

## ♿ Accessibility

- **ARIA labels** on all interactive elements
- **Keyboard navigation** throughout wizard
- **Focus states** with visible outlines
- **Reduced motion** support
- **Semantic HTML** structure
- **Color contrast** meeting WCAG AA

## 🎬 Animation Details

### Landing Page
- Hero opacity/scale fade on scroll
- Floating gradient orbs (20s/25s cycles)
- Staggered feature card reveals
- Progress indicator on scroll

### Wizard
- Step content slide + scale transitions
- Genre chips with spring animations
- Sound sliders with real-time visualization
- Budget thumbs with drag feedback

### Results
- Staggered card appearance
- Score bars with delayed fills
- Expandable sections with height animation
- Compare bar slide-in

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| next | React framework |
| framer-motion | Animation library |
| zustand | State management |
| recharts | Charts (optional) |
| tailwind-merge | Class merging utility |
| clsx | Conditional classes |

## 🔮 Future Enhancements

- [ ] Spotify OAuth integration
- [ ] Real-time artist search API
- [ ] Sound profile visualization with D3
- [ ] Headphone detail modal
- [ ] Save/share recommendations
- [ ] Dark/light theme toggle
