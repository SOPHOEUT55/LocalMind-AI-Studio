import cyberImage from '../assets/images/diffusion_showcase_cyber_1790910889824.jpg';
import natureImage from '../assets/images/diffusion_showcase_nature_1790910902908.jpg';
import avatarImage from '../assets/images/local_agent_avatar_1790910880265.jpg';

export interface SamplePrompt {
  id: string;
  category: 'agent' | 'code' | 'image' | 'video';
  title: string;
  prompt: string;
  badge: string;
  previewImage?: string;
  tags: string[];
}

export const SAMPLE_PROMPTS: SamplePrompt[] = [
  {
    id: 'sample_arcade_agent',
    category: 'agent',
    title: 'Arcade Space Game Suite',
    prompt: 'Build a retro cyber racer arcade mini-game with HTML5 canvas physics, synthesize the racing ship sprite texture, and generate a 24-frame high-speed warp teaser video.',
    badge: 'Multi-Modal Agent',
    previewImage: cyberImage,
    tags: ['HTML5 Canvas', 'Game Loop', 'Sprite Art', '24fps Video'],
  },
  {
    id: 'sample_weather_ui',
    category: 'code',
    title: 'Atmospheric Weather Console',
    prompt: 'Create a clean dark-mode weather telemetry widget with Celsius/Fahrenheit toggle, wind compass, hourly forecast list, and Lucide icons.',
    badge: 'React Component',
    tags: ['React 19', 'TypeScript', 'Tailwind', 'Telemetry'],
  },
  {
    id: 'sample_python_attention',
    category: 'code',
    title: 'On-Device Attention Kernel',
    prompt: 'Implement a standalone Scaled Dot-Product Multi-Head Attention kernel in Python with softmax normalization and test verification driver.',
    badge: 'Python Algorithm',
    tags: ['Transformer', 'Matrix Math', 'Softmax', 'Attention'],
  },
  {
    id: 'sample_biolum_nature',
    category: 'image',
    title: 'Bioluminescent Spore Grove',
    prompt: 'Bioluminescent mushroom forest with soft spore particles floating in midnight atmosphere, macro botanical photography, 8k depth of field',
    badge: 'Neural Diffusion',
    previewImage: natureImage,
    tags: ['16:9 Aspect', 'Botanical', 'Euler-A', 'Denoised'],
  },
  {
    id: 'sample_cyber_artisan',
    category: 'image',
    title: 'Cyberpunk Crystal Artisan',
    prompt: 'Futuristic humanoid robot artisan carving an illuminated quartz crystal in dark laboratory, volumetric amber and cyan lighting',
    badge: 'Neural Diffusion',
    previewImage: cyberImage,
    tags: ['Volumetric', 'Macro', 'High Contrast', 'Cyberpunk'],
  },
  {
    id: 'sample_warp_video',
    category: 'video',
    title: 'Hyperspace Core Orbit',
    prompt: 'Glowing quantum energy orb pulsing in a cybernetic grid tunnel with orbiting particle rings',
    badge: 'Temporal Motion',
    tags: ['24 FPS', 'Zoom-In Camera', 'MediaRecorder WebM', 'Looping'],
  },
];

export { avatarImage, cyberImage, natureImage };
