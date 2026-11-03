import {
  Activity,
  Aperture,
  Award,
  BarChart2,
  Box,
  Camera,
  Cast,
  Cloud,
  Code,
  Compass,
  Cpu,
  Crosshair,
  Eye,
  EyeOff,
  Feather,
  Film,
  Globe,
  Grid,
  Headphones,
  Layers,
  Lock,
  Mic,
  MicOff,
  Monitor,
  Navigation,
  Radio,
  Search,
  Settings,
  Shield,
  ShieldOff,
  Sliders,
  Smartphone,
  Speaker,
  Star,
  Target,
  User,
  Video,
  VideoOff,
  Volume2,
  Wifi,
  Zap,
  ZoomIn,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';

/** Same icon set as mobile PatternBackground, rendered as one tiled SVG (mobile draws 420 nodes; too heavy for the DOM). */
const ICONS: LucideIcon[] = [
  Mic,
  Video,
  Camera,
  Film,
  Monitor,
  Smartphone,
  Cpu,
  Wifi,
  Activity,
  Zap,
  Eye,
  Shield,
  Search,
  Target,
  Crosshair,
  Globe,
  Cast,
  Headphones,
  Volume2,
  Aperture,
  Layers,
  Cloud,
  AlertCircle,
  Star,
  Compass,
  Code,
  User,
  Settings,
  Sliders,
  BarChart2,
  Lock,
  Radio,
  Navigation,
  Grid,
  ZoomIn,
  Feather,
  Award,
  Box,
  MicOff,
  VideoOff,
  EyeOff,
  ShieldOff,
  Speaker,
];
const TILE = 720;
const COUNT = 90;

// Deterministic pseudo-random (same function as mobile) → identical layout on server and client.
const rng = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

const items = Array.from({ length: COUNT }, (_, i) => ({
  i,
  x: Math.round(rng(i * 3) * (TILE - 32)),
  y: Math.round(rng(i * 3 + 1) * (TILE - 32)),
  size: 18 + Math.floor(rng(i * 3 + 2) * 14),
  Icon: ICONS[Math.floor(rng(i * 7 + 5) * ICONS.length)]!,
}));

export function PatternBackground() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.055]"
    >
      <defs>
        <pattern id="pattern-bg" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
          {items.map(({ i, x, y, size, Icon }) => (
            <Icon key={i} x={x} y={y} width={size} height={size} stroke="#000" />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#pattern-bg)" />
    </svg>
  );
}
