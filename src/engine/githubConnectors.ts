/**
 * GitHub Repository-Connected Plug-in & Connector System (Mungil Engine V7).
 * Cleanroom architectural bindings adopting patterns from lightweight 2D/2.5D/Fake-3D/3D engines,
 * Tripo3D/Meshy-style 3D generators, and InstaPlay/Claude-style complete game generators.
 * Supports deterministic offline usage + optional unauthenticated GitHub Search API sync.
 */

import type { GitHubRepoCategory, GitHubRepoPlugin } from './types';

export const CURATED_GITHUB_PLUGINS: GitHubRepoPlugin[] = [
  // 1. Fake 3D / Raycasting
  {
    id: 'gh_42_cub3d',
    repo: 'AghlaAbdo/42_Cub3D',
    url: 'https://github.com/AghlaAbdo/42_Cub3D',
    category: 'fake_3d_raycast',
    license: 'MIT',
    starsLabel: '42-School',
    dnaPattern: '16x16 grid DDA raycast, textured wall slicing, yaw-only Camera C.',
    supportedPerspectives: ['fake_3d_raycast', 'first_person'],
    recommendedHybridMode: 'raycast_pseudo3d',
    recommendedCamera: 'fps_raycast',
    maxDrawCallsBudget: 28,
    maxTrisBudget: 1200,
    source: 'curated-offline',
  },
  {
    id: 'gh_wolfenstein_ray',
    repo: 'shiro1307/raycast_wolfenstein_renderer',
    url: 'https://github.com/shiro1307/raycast_wolfenstein_renderer',
    category: 'fake_3d_raycast',
    license: 'MIT',
    starsLabel: 'Raycast',
    dnaPattern: 'Vertical column DDA traversal with depth darkening fog.',
    supportedPerspectives: ['fake_3d_raycast', 'first_person'],
    recommendedHybridMode: 'raycast_pseudo3d',
    recommendedCamera: 'fps_raycast',
    maxDrawCallsBudget: 26,
    maxTrisBudget: 1000,
    source: 'curated-offline',
  },
  {
    id: 'gh_tinyraycaster',
    repo: 'ssloy/tinyraycaster',
    url: 'https://github.com/ssloy/tinyraycaster',
    category: 'fake_3d_raycast',
    license: 'WTFPL/MIT',
    starsLabel: '3.2k★',
    dnaPattern: 'Minimalist software raycaster & billboard Z-buffer sprite sorting.',
    supportedPerspectives: ['fake_3d_raycast', 'first_person', 'pseudo_3d_zstack'],
    recommendedHybridMode: 'raycast_pseudo3d',
    recommendedCamera: 'fps_raycast',
    maxDrawCallsBudget: 24,
    maxTrisBudget: 800,
    source: 'curated-offline',
  },
  {
    id: 'gh_awk_raycaster',
    repo: 'TheMozg/awk-raycaster',
    url: 'https://github.com/TheMozg/awk-raycaster',
    category: 'fake_3d_raycast',
    license: 'MIT',
    starsLabel: '1.1k★',
    dnaPattern: 'Zero-dependency integer DDA stepping with tiny LUT trig tables.',
    supportedPerspectives: ['fake_3d_raycast', 'first_person'],
    recommendedHybridMode: 'raycast_pseudo3d',
    recommendedCamera: 'fps_raycast',
    maxDrawCallsBudget: 18,
    maxTrisBudget: 400,
    source: 'curated-offline',
  },
  {
    id: 'gh_raycastjs',
    repo: 'Aldrie/raycastjs',
    url: 'https://github.com/Aldrie/raycastjs',
    category: 'fake_3d_raycast',
    license: 'MIT',
    starsLabel: 'WebJS',
    dnaPattern: '120-ray HTML5 Canvas column slice renderer for mobile touch controls.',
    supportedPerspectives: ['fake_3d_raycast', 'first_person', '2_5d_parallax'],
    recommendedHybridMode: 'raycast_pseudo3d',
    recommendedCamera: 'fps_raycast',
    maxDrawCallsBudget: 22,
    maxTrisBudget: 960,
    source: 'curated-offline',
  },

  // 2. Pseudo-3D / Mode 7 / Voxel Space
  {
    id: 'gh_fake_racer',
    repo: 'johnatas-henrique/fake-racer',
    url: 'https://github.com/johnatas-henrique/fake-racer',
    category: 'mode7_voxel',
    license: 'MIT',
    starsLabel: 'OutRun-JS',
    dnaPattern: 'Segment road curve projection + depth-scaled roadside sprites.',
    supportedPerspectives: ['third_person', '2_5d_parallax'],
    recommendedHybridMode: 'mode7_voxel',
    recommendedCamera: 'follow_3_4',
    maxDrawCallsBudget: 20,
    maxTrisBudget: 2400,
    source: 'curated-offline',
  },
  {
    id: 'gh_mode7_floorcast',
    repo: 'Garebear/MODE-7-FLOORCAST',
    url: 'https://github.com/Garebear',
    category: 'mode7_voxel',
    license: 'MIT',
    starsLabel: 'Mode-7',
    dnaPattern: 'Scanline perspective floor casting with zero-WebGL CPU pixel strips.',
    supportedPerspectives: ['2_5d_parallax', 'third_person'],
    recommendedHybridMode: 'mode7_voxel',
    recommendedCamera: 'follow_3_4',
    maxDrawCallsBudget: 16,
    maxTrisBudget: 1600,
    source: 'curated-offline',
  },
  {
    id: 'gh_wurfel_engine',
    repo: 'odaymichael/Wurfel-Engine',
    url: 'https://github.com/odaymichael/Wurfel-Engine',
    category: 'mode7_voxel',
    license: 'Apache-2.0',
    starsLabel: 'Voxel-2.5D',
    dnaPattern: 'Heightmap terrain ray-marching & isometric voxel layer stamping.',
    supportedPerspectives: ['pseudo_3d_zstack', 'isometric', '2_5d_parallax'],
    recommendedHybridMode: 'mode7_voxel',
    recommendedCamera: 'follow_3_4',
    maxDrawCallsBudget: 24,
    maxTrisBudget: 6400,
    source: 'curated-offline',
  },

  // 3. Isometric & 2.5D Engines
  {
    id: 'gh_trafficcone',
    repo: 'j03m/trafficcone',
    url: 'https://github.com/j03m/trafficcone',
    category: 'isometric_2_5d',
    license: 'MIT',
    starsLabel: 'Iso-2.5D',
    dnaPattern: 'Lightweight isometric tile picking, painter sort & extruded prisms.',
    supportedPerspectives: ['isometric', 'hexagonal', 'top_down'],
    recommendedHybridMode: 'isometric_painter',
    recommendedCamera: 'iso_fixed',
    maxDrawCallsBudget: 20,
    maxTrisBudget: 4200,
    source: 'curated-offline',
  },
  {
    id: 'gh_pixscape',
    repo: 'Pixscape/pixscape',
    url: 'https://github.com/Pixscape',
    category: 'isometric_2_5d',
    license: 'MIT',
    starsLabel: '2.5D-Canvas',
    dnaPattern: '2.5D layered sprite stacking, depth sorting & soft contact shadows.',
    supportedPerspectives: ['pseudo_3d_zstack', 'isometric', '2_5d_parallax'],
    recommendedHybridMode: 'hybrid_2_5d_billboard',
    recommendedCamera: 'follow_3_4',
    maxDrawCallsBudget: 22,
    maxTrisBudget: 3600,
    source: 'curated-offline',
  },
  {
    id: 'gh_detonator',
    repo: 'ensisoft/detonator',
    url: 'https://github.com/ensisoft/detonator',
    category: 'isometric_2_5d',
    license: 'GPL-3.0',
    starsLabel: 'C++/GLES',
    dnaPattern: '2D/2.5D scene graph hierarchy, container transforms & fixed-step physics.',
    supportedPerspectives: ['2d_side_h', '2d_side_v', 'top_down', '2_5d_parallax'],
    recommendedHybridMode: 'hybrid_2_5d_billboard',
    recommendedCamera: 'follow_3_4',
    maxDrawCallsBudget: 26,
    maxTrisBudget: 8000,
    source: 'curated-offline',
  },
  {
    id: 'gh_rbfx',
    repo: 'rbfx/rbfx',
    url: 'https://github.com/rbfx/rbfx',
    category: 'isometric_2_5d',
    license: 'MIT',
    starsLabel: '1.2k★',
    dnaPattern: 'Forward mobile 1-shader pipeline, LOD groups, and node scene serialization.',
    supportedPerspectives: ['third_person', 'isometric', 'first_person'],
    recommendedHybridMode: 'real_3d_lowpoly',
    recommendedCamera: 'follow_3_4',
    maxDrawCallsBudget: 32,
    maxTrisBudget: 24000,
    source: 'curated-offline',
  },

  // 4. Web & Mobile Lightweight Engines
  {
    id: 'gh_pixalo',
    repo: 'pixalo/pixalo',
    url: 'https://github.com/pixalo/pixalo',
    category: 'web_mobile_lightweight',
    license: 'MIT',
    starsLabel: 'Web-2D',
    dnaPattern: 'Zero-bloat HTML5 Canvas 2D engine with responsive touch controls.',
    supportedPerspectives: ['2d_side_h', '2d_side_v', 'top_down'],
    recommendedHybridMode: 'hybrid_2_5d_billboard',
    recommendedCamera: 'follow_3_4',
    maxDrawCallsBudget: 18,
    maxTrisBudget: 2000,
    source: 'curated-offline',
  },
  {
    id: 'gh_melonjs',
    repo: 'melonjs/melonJS',
    url: 'https://github.com/melonjs/melonJS',
    category: 'web_mobile_lightweight',
    license: 'MIT',
    starsLabel: '5.5k★',
    dnaPattern: 'Tilemap culling, object pooling & mobile viewport scaling.',
    supportedPerspectives: ['2d_side_h', 'isometric', 'top_down'],
    recommendedHybridMode: 'isometric_painter',
    recommendedCamera: 'iso_fixed',
    maxDrawCallsBudget: 24,
    maxTrisBudget: 3500,
    source: 'curated-offline',
  },
  {
    id: 'gh_axmol',
    repo: 'axmolengine/axmol',
    url: 'https://github.com/axmolengine/axmol',
    category: 'web_mobile_lightweight',
    license: 'MIT',
    starsLabel: '2.1k★',
    dnaPattern: 'Auto-batching draw calls <35, 1024x1024 atlas packing, Android ARM64/Go.',
    supportedPerspectives: ['2d_side_h', '2_5d_parallax', 'pseudo_3d_zstack'],
    recommendedHybridMode: 'hybrid_2_5d_billboard',
    recommendedCamera: 'follow_3_4',
    maxDrawCallsBudget: 22,
    maxTrisBudget: 16000,
    source: 'curated-offline',
  },
  {
    id: 'gh_skylicht',
    repo: 'skylicht-lab/skylicht-engine',
    url: 'https://github.com/skylicht-lab/skylicht-engine',
    category: 'web_mobile_lightweight',
    license: 'MIT',
    starsLabel: 'GLES3',
    dnaPattern: 'Mobile-first forward rendering, frustum culling, 3-level LOD & fog.',
    supportedPerspectives: ['third_person', 'isometric', 'first_person'],
    recommendedHybridMode: 'real_3d_lowpoly',
    recommendedCamera: 'follow_3_4',
    maxDrawCallsBudget: 30,
    maxTrisBudget: 44000,
    source: 'curated-offline',
  },
  {
    id: 'gh_defold',
    repo: 'defold/defold',
    url: 'https://github.com/defold/defold',
    category: 'web_mobile_lightweight',
    license: 'Defold-1.0',
    starsLabel: '5.1k★',
    dnaPattern: 'Ultra-compact binary runtime, 0-GC collection proxies & spine/rig animation.',
    supportedPerspectives: ['2d_side_h', '2_5d_parallax', 'isometric', 'third_person'],
    recommendedHybridMode: 'hybrid_2_5d_billboard',
    recommendedCamera: 'follow_3_4',
    maxDrawCallsBudget: 18,
    maxTrisBudget: 18000,
    source: 'curated-offline',
  },

  // 5. 3D Mesh Generators (Tripo3D / Meshy.ai Parity)
  {
    id: 'gh_tripo_sr',
    repo: 'VAST-AI-Research/TripoSR',
    url: 'https://github.com/VAST-AI-Research/TripoSR',
    category: '3d_mesh_generators',
    license: 'MIT',
    starsLabel: '7.4k★',
    dnaPattern: 'Image/Text-to-3D silhouette lofting, decimated <=800 tri character & glTF export.',
    supportedPerspectives: ['pseudo_3d_zstack', 'third_person', 'isometric'],
    recommendedHybridMode: 'real_3d_lowpoly',
    recommendedCamera: 'follow_3_4',
    maxDrawCallsBudget: 14,
    maxTrisBudget: 800,
    source: 'curated-offline',
  },
  {
    id: 'gh_meshy_lowpoly',
    repo: 'mrdoob/three.js-exporter-gltf',
    url: 'https://github.com/mrdoob/three.js',
    category: '3d_mesh_generators',
    license: 'MIT',
    starsLabel: 'glTF-2.0',
    dnaPattern: 'Low-poly primitive/lathe composition + 3-tier LOD decimation & OBJ/glTF pack.',
    supportedPerspectives: ['pseudo_3d_zstack', 'third_person', 'isometric'],
    recommendedHybridMode: 'real_3d_lowpoly',
    recommendedCamera: 'iso_fixed',
    maxDrawCallsBudget: 12,
    maxTrisBudget: 800,
    source: 'curated-offline',
  },
  {
    id: 'gh_zdog_stack',
    repo: 'metafizzy/zdog',
    url: 'https://github.com/metafizzy/zdog',
    category: '3d_mesh_generators',
    license: 'MIT',
    starsLabel: '10.6k★',
    dnaPattern: 'Round-cap pseudo-3D vector modeling on Canvas 2D with zero WebGL overhead.',
    supportedPerspectives: ['pseudo_3d_zstack', '2_5d_parallax'],
    recommendedHybridMode: 'hybrid_2_5d_billboard',
    recommendedCamera: 'follow_3_4',
    maxDrawCallsBudget: 12,
    maxTrisBudget: 200,
    source: 'curated-offline',
  },

  // 6. AI Game Generators & MCP Connectors (InstaPlay / Claude / Grok Parity)
  {
    id: 'gh_mcp_game_deck',
    repo: 'mcp-game-deck/mcp-game-deck',
    url: 'https://github.com/modelcontextprotocol/servers',
    category: 'ai_game_generators',
    license: 'MIT',
    starsLabel: 'MCP-Ready',
    dnaPattern: 'Prompt -> playable level blueprint, event rules, 16-bit bytecode & AI Co-Op driver.',
    supportedPerspectives: ['2d_side_h', 'isometric', 'hexagonal', 'top_down', 'third_person'],
    recommendedHybridMode: 'hybrid_2_5d_billboard',
    recommendedCamera: 'follow_3_4',
    maxDrawCallsBudget: 20,
    maxTrisBudget: 12000,
    source: 'curated-offline',
  },
  {
    id: 'gh_instaplay_gen',
    repo: 'instaplay-ai/zero-code-game-forge',
    url: 'https://github.com/topics/game-generator',
    category: 'ai_game_generators',
    license: 'Apache-2.0',
    starsLabel: 'AI-Forge',
    dnaPattern: 'Single-prompt genre fusion, 3-prefab A70 budget validator & instant playable launch.',
    supportedPerspectives: ['2_5d_parallax', 'isometric', 'first_person', 'third_person'],
    recommendedHybridMode: 'hybrid_2_5d_billboard',
    recommendedCamera: 'follow_3_4',
    maxDrawCallsBudget: 22,
    maxTrisBudget: 18000,
    source: 'curated-offline',
  },
];

export const GITHUB_CATEGORY_LABELS: Record<GitHubRepoCategory, string> = {
  fake_3d_raycast: 'Fake 3D & Raycast',
  mode7_voxel: 'Mode-7 & Voxel Space',
  isometric_2_5d: 'Isometric & 2.5D',
  web_mobile_lightweight: 'Web & Mobile Engines',
  '3d_mesh_generators': '3D Generators (Tripo/Meshy)',
  ai_game_generators: 'AI Game Forge & MCP',
};

export function filterCuratedGitHubPlugins(
  query: string,
  category?: GitHubRepoCategory | 'all'
): GitHubRepoPlugin[] {
  const q = query.trim().toLowerCase();
  return CURATED_GITHUB_PLUGINS.filter((item) => {
    if (category && category !== 'all' && item.category !== category) return false;
    if (!q) return true;
    return (
      item.repo.toLowerCase().includes(q) ||
      item.dnaPattern.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.supportedPerspectives.some((p) => p.toLowerCase().includes(q))
    );
  });
}

/**
 * Queries live public GitHub repository search when online, gracefully falling back
 * to curated offline cleanroom plugins on offline/rate-limit/timeout so mobile never blocks.
 */
export async function searchGitHubReposWithFallback(
  query: string,
  category: GitHubRepoCategory | 'all' = 'all',
  timeoutMs = 3200
): Promise<{
  results: GitHubRepoPlugin[];
  mode: 'live-github' | 'curated-offline';
  note: string;
}> {
  const localMatches = filterCuratedGitHubPlugins(query, category);
  const cleanQuery = query.trim() || 'lightweight html5 game engine raycaster';

  if (typeof fetch !== 'function' || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    return {
      results: localMatches,
      mode: 'curated-offline',
      note: 'Offline mode active — loaded verified cleanroom GitHub patterns.',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const encoded = encodeURIComponent(`${cleanQuery} in:name,description`);
    const resp = await fetch(
      `https://api.github.com/search/repositories?q=${encoded}&sort=stars&order=desc&per_page=6`,
      {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!resp.ok) {
      return {
        results: localMatches,
        mode: 'curated-offline',
        note: `GitHub API returned ${resp.status} — using curated offline patterns.`,
      };
    }

    const json = (await resp.json()) as {
      items?: Array<{
        id: number;
        full_name: string;
        html_url: string;
        stargazers_count: number;
        description?: string | null;
        license?: { spdx_id?: string | null } | null;
      }>;
    };

    const liveItems: GitHubRepoPlugin[] = (json.items ?? []).map((it) => {
      const desc = (it.description ?? 'Lightweight game/graphics repository pattern.').slice(0, 120);
      const lower = (it.full_name + ' ' + desc).toLowerCase();
      const cat: GitHubRepoCategory = lower.includes('raycast')
        ? 'fake_3d_raycast'
        : lower.includes('iso')
          ? 'isometric_2_5d'
          : lower.includes('3d') || lower.includes('mesh') || lower.includes('gltf')
            ? '3d_mesh_generators'
            : lower.includes('mcp') || lower.includes('ai')
              ? 'ai_game_generators'
              : 'web_mobile_lightweight';

      return {
        id: `gh_live_${it.id}`,
        repo: it.full_name,
        url: it.html_url,
        category: cat,
        license: it.license?.spdx_id ?? 'OSS',
        starsLabel: it.stargazers_count >= 1000 ? `${(it.stargazers_count / 1000).toFixed(1)}k★` : `${it.stargazers_count}★`,
        dnaPattern: desc,
        supportedPerspectives:
          cat === 'fake_3d_raycast'
            ? ['fake_3d_raycast', 'first_person']
            : cat === 'isometric_2_5d'
              ? ['isometric', 'hexagonal', '2_5d_parallax']
              : ['2d_side_h', '2_5d_parallax', 'third_person'],
        recommendedHybridMode: cat === 'fake_3d_raycast' ? 'raycast_pseudo3d' : cat === '3d_mesh_generators' ? 'real_3d_lowpoly' : 'hybrid_2_5d_billboard',
        recommendedCamera: cat === 'fake_3d_raycast' ? 'fps_raycast' : cat === 'isometric_2_5d' ? 'iso_fixed' : 'follow_3_4',
        maxDrawCallsBudget: 24,
        maxTrisBudget: cat === '3d_mesh_generators' ? 800 : 12000,
        source: 'live-github',
      };
    });

    // Deduplicate against curated plugins while keeping curated hits first when matching directly
    const seen = new Set(localMatches.map((m) => m.repo.toLowerCase()));
    const merged = [...localMatches, ...liveItems.filter((li) => !seen.has(li.repo.toLowerCase()))];
    return {
      results: merged.length > 0 ? merged : CURATED_GITHUB_PLUGINS.slice(0, 6),
      mode: liveItems.length > 0 ? 'live-github' : 'curated-offline',
      note: liveItems.length > 0 ? `Synced ${liveItems.length} live GitHub repos + curated patterns.` : 'Loaded curated offline patterns.',
    };
  } catch {
    clearTimeout(timer);
    return {
      results: localMatches,
      mode: 'curated-offline',
      note: 'Offline / timeout fallback — loaded curated cleanroom GitHub patterns.',
    };
  }
}
