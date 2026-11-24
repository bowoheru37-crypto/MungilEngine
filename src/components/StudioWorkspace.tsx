import { ArrowLeft, Play } from 'lucide-react';
import { Component, type Dispatch, type ReactNode, type SetStateAction } from 'react';

import { soundEngine } from '../engine/audio';
import { t } from '../engine/i18n';
import type {
  AiPlayMode,
  AnalyticsSummary,
  ArtStyleId,
  AuthProfile,
  Camera3DPresetId,
  DeviceProfile,
  DeviceTierId,
  GeneratedCharacterSpec,
  GeneratedGameBlueprintSpec,
  GenreTemplate,
  HudSnapshot,
  HybridRender5Mode,
  LanguageCode,
  PerspectiveConnectorId,
  PhysicsMode,
  RenderMode,
  SaveSlotId,
  SceneEntityNode,
  StudioTab,
  StyleOverrides,
  TouchControlConfig,
  VisualQualityPresetId,
  WeatherKind,
} from '../engine/types';
import { PWAInstallButton } from './PWAInstallButton';
import { StudioAgentTab } from './StudioAgentTab';
import { StudioControlsTab, StudioArtTab } from './StudioControlsArtTabs';
import { StudioGeneratorsTab } from './StudioGeneratorsTab';
import { StudioExportTab, StudioLabTab, StudioServicesTab } from './StudioLabServicesExportTabs';
import { StudioAssetsTab, StudioPlayTab } from './StudioPlayAssetsTabs';
import { StudioSceneEditorTab } from './StudioSceneEditorTab';
import { StudioSkillsTab } from './StudioSkillsTab';

class TabErrorBoundary extends Component<{ children: ReactNode; tabName: string }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; tabName: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-300">
          Failed to render {this.props.tabName}. Switch tabs or reload cleanly.
        </div>
      );
    }
    return this.props.children;
  }
}

interface StudioWorkspaceProps {
  activeTab: StudioTab;
  setActiveTab: (tab: StudioTab) => void;
  gameName: string;
  setGameName: (v: string) => void;
  activeLevel: 1 | 2 | 3;
  setActiveLevel: (lvl: 1 | 2 | 3) => void;
  requestedTier: DeviceTierId;
  onChangeTier: (tier: DeviceTierId) => void;
  powerSaveAuto: boolean;
  onChangePowerSaveAuto: (v: boolean) => void;
  deviceProfile: DeviceProfile;
  renderMode: RenderMode;
  setRenderMode: (m: RenderMode) => void;
  physicsMode: PhysicsMode;
  setPhysicsMode: (p: PhysicsMode) => void;
  weather: WeatherKind;
  setWeather: (w: WeatherKind) => void;
  practiceMode: boolean;
  setPracticeMode: (v: boolean) => void;
  physicsDebug: boolean;
  setPhysicsDebug: (v: boolean) => void;
  activeGenreId: string;
  styleId: ArtStyleId;
  setStyleId: (id: ArtStyleId) => void;
  customPalettes: Partial<Record<ArtStyleId, string[]>>;
  setCustomPalettes: (p: Partial<Record<ArtStyleId, string[]>>) => void;
  styleOverrides: StyleOverrides;
  setStyleOverrides: (o: StyleOverrides) => void;
  touchConfig: TouchControlConfig;
  setTouchConfig: (c: TouchControlConfig) => void;
  theme: 'dark' | 'light';
  setTheme: (th: 'dark' | 'light') => void;
  fontSizePx: number;
  setFontSizePx: (n: number) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  reduceShake: boolean;
  setReduceShake: (v: boolean) => void;
  lang: LanguageCode;
  setLang: (l: LanguageCode) => void;
  auth: AuthProfile;
  setAuth: (a: AuthProfile) => void;
  analytics: AnalyticsSummary;
  analyticsEnabled: boolean;
  setAnalyticsEnabled: (v: boolean) => void;
  hud: HudSnapshot;
  isOnline: boolean;
  customCharacter: GeneratedCharacterSpec | null;
  setCustomCharacter: (c: GeneratedCharacterSpec | null) => void;
  onBackToLanding: () => void;
  onBackToTitle: () => void;
  onLaunchGame: (lvl?: 1 | 2 | 3, genre?: GenreTemplate, aiModeOverride?: AiPlayMode) => void;
  onLaunchBlueprint: (bp: GeneratedGameBlueprintSpec) => void;
  onApplyLoadedSave: (level: 1 | 2 | 3, coins: number, score: number, potions: number) => void;
  onSaveProgress?: (slotId: SaveSlotId) => { ok: boolean; bytes: number; level: 1 | 2 | 3 };
  onLoadProgress?: (slotId: SaveSlotId, launchImmediately?: boolean) => { ok: boolean; level?: 1 | 2 | 3; score?: number; migrated?: boolean; checksumValid?: boolean };
  onDeleteSaveSlot?: (slotId: SaveSlotId) => void;
  saveRevision?: number;
  onAddBonusCoinsPotions: (coins: number, potions: number) => void;
  aiMode: AiPlayMode;
  setAiMode: (m: AiPlayMode) => void;
  perspectiveConnector: PerspectiveConnectorId;
  setPerspectiveConnector: (c: PerspectiveConnectorId) => void;
  cameraPreset: Camera3DPresetId;
  setCameraPreset: (c: Camera3DPresetId) => void;
  hybridMode: HybridRender5Mode;
  setHybridMode: (m: HybridRender5Mode) => void;
  activeGitHubRepoId: string;
  setActiveGitHubRepoId: (id: string) => void;
  visualQuality: VisualQualityPresetId;
  setVisualQuality: (q: VisualQualityPresetId) => void;
  sceneEntities: SceneEntityNode[];
  setSceneEntities: Dispatch<SetStateAction<SceneEntityNode[]>>;
}

export function StudioWorkspace(props: StudioWorkspaceProps) {
  const tr = t(props.lang);

  const tabs: Array<{ id: StudioTab; label: string }> = [
    { id: 'play', label: tr.tabs.play },
    { id: 'scene', label: tr.tabs.scene },
    { id: 'agent', label: tr.tabs.agent },
    { id: 'assets', label: tr.tabs.assets },
    { id: 'generators', label: tr.tabs.generators },
    { id: 'controls', label: tr.tabs.controls },
    { id: 'art', label: tr.tabs.art },
    { id: 'lab', label: tr.tabs.lab },
    { id: 'skills', label: tr.tabs.skills },
    { id: 'services', label: tr.tabs.services },
    { id: 'export', label: tr.tabs.export },
  ];

  return (
    <div className="min-h-dvh bg-(--bg) text-(--text)">
      {/* Compact Sticky Studio Bar */}
      <header className="sticky top-0 z-30 border-b border-(--border) bg-(--surface) px-3 py-2.5 sm:px-5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_click');
                props.onBackToLanding();
              }}
              className="touch-btn inline-flex items-center gap-1.5 rounded-xl border border-(--border) bg-(--surface-2) px-3 text-xs font-bold text-(--text) hover:border-(--accent)"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_click');
                props.onBackToTitle();
              }}
              className="touch-btn hidden items-center rounded-xl border border-(--border) bg-(--surface-2) px-3 text-xs font-bold text-(--text) hover:border-(--accent) sm:inline-flex"
            >
              Title
            </button>
            <div>
              <h1 className="text-sm font-extrabold leading-tight sm:text-base">{tr.appTitle} Studio</h1>
              <div className="text-[11px] font-medium text-(--muted)">
                {props.isOnline ? tr.onlineBadge : tr.offlineBadge} · {props.deviceProfile.activeTier.toUpperCase()} ·{' '}
                {props.deviceProfile.renderer}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton label={tr.installApp} compact />
            <button
              type="button"
              onClick={() => {
                soundEngine.playSfx('ui_click');
                props.onLaunchGame(props.activeLevel);
              }}
              className="touch-btn inline-flex items-center gap-1.5 rounded-xl bg-(--accent) px-4 text-xs font-extrabold text-(--accent-ink)"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>{tr.playGame}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Mobile-Friendly Tab Strip */}
        <nav className="mx-auto mt-2.5 flex max-w-6xl gap-1.5 overflow-x-auto pb-0.5">
          {tabs.map((tab) => {
            const active = props.activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundEngine.playSfx('ui_tab');
                  props.setActiveTab(tab.id);
                }}
                className={`touch-btn shrink-0 whitespace-nowrap rounded-xl px-3.5 text-xs font-bold transition ${
                  active
                    ? 'bg-(--accent) text-(--accent-ink)'
                    : 'border border-(--border) bg-(--surface-2) text-(--text) hover:border-(--accent)'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl p-3 sm:p-5">
        <TabErrorBoundary tabName={props.activeTab} key={props.activeTab}>
          {props.activeTab === 'play' && (
            <StudioPlayTab
              gameName={props.gameName}
              setGameName={props.setGameName}
              activeLevel={props.activeLevel}
              setActiveLevel={props.setActiveLevel}
              requestedTier={props.requestedTier}
              onChangeTier={props.onChangeTier}
              powerSaveAuto={props.powerSaveAuto}
              onChangePowerSaveAuto={props.onChangePowerSaveAuto}
              deviceProfile={props.deviceProfile}
              renderMode={props.renderMode}
              setRenderMode={props.setRenderMode}
              physicsMode={props.physicsMode}
              setPhysicsMode={props.setPhysicsMode}
              weather={props.weather}
              setWeather={props.setWeather}
              practiceMode={props.practiceMode}
              setPracticeMode={props.setPracticeMode}
              physicsDebug={props.physicsDebug}
              setPhysicsDebug={props.setPhysicsDebug}
              activeGenreId={props.activeGenreId}
              hud={props.hud}
              onLaunchGame={props.onLaunchGame}
            />
          )}

          {props.activeTab === 'scene' && (
            <StudioSceneEditorTab
              entities={props.sceneEntities}
              setEntities={props.setSceneEntities}
              perspectiveConnector={props.perspectiveConnector}
              activeLevel={props.activeLevel}
              onLaunchGame={() => props.onLaunchGame(props.activeLevel)}
            />
          )}

          {props.activeTab === 'agent' && (
            <StudioAgentTab
              gameName={props.gameName}
              setGameName={props.setGameName}
              activeLevel={props.activeLevel}
              setActiveLevel={props.setActiveLevel}
              activeGenreId={props.activeGenreId}
              aiMode={props.aiMode}
              setAiMode={props.setAiMode}
              perspectiveConnector={props.perspectiveConnector}
              setPerspectiveConnector={props.setPerspectiveConnector}
              cameraPreset={props.cameraPreset}
              setCameraPreset={props.setCameraPreset}
              hybridMode={props.hybridMode}
              setHybridMode={props.setHybridMode}
              activeGitHubRepoId={props.activeGitHubRepoId}
              setActiveGitHubRepoId={props.setActiveGitHubRepoId}
              visualQuality={props.visualQuality}
              setVisualQuality={props.setVisualQuality}
              renderMode={props.renderMode}
              setRenderMode={props.setRenderMode}
              physicsMode={props.physicsMode}
              setPhysicsMode={props.setPhysicsMode}
              styleId={props.styleId}
              setStyleId={props.setStyleId}
              onLaunchGame={props.onLaunchGame}
            />
          )}

          {props.activeTab === 'assets' && (
            <StudioAssetsTab
              styleId={props.styleId}
              customPalettes={props.customPalettes}
              styleOverrides={props.styleOverrides}
            />
          )}

          {props.activeTab === 'generators' && (
            <StudioGeneratorsTab
              styleId={props.styleId}
              customPalettes={props.customPalettes}
              styleOverrides={props.styleOverrides}
              customCharacter={props.customCharacter}
              onApplyCharacter={props.setCustomCharacter}
              cameraPreset={props.cameraPreset}
              setCameraPreset={props.setCameraPreset}
              activeGitHubRepoId={props.activeGitHubRepoId}
              onLaunchBlueprint={props.onLaunchBlueprint}
            />
          )}

          {props.activeTab === 'controls' && (
            <StudioControlsTab
              touchConfig={props.touchConfig}
              setTouchConfig={props.setTouchConfig}
              theme={props.theme}
              setTheme={props.setTheme}
              fontSizePx={props.fontSizePx}
              setFontSizePx={props.setFontSizePx}
              highContrast={props.highContrast}
              setHighContrast={props.setHighContrast}
              reduceShake={props.reduceShake}
              setReduceShake={props.setReduceShake}
            />
          )}

          {props.activeTab === 'art' && (
            <StudioArtTab
              styleId={props.styleId}
              setStyleId={props.setStyleId}
              customPalettes={props.customPalettes}
              setCustomPalettes={props.setCustomPalettes}
              styleOverrides={props.styleOverrides}
              setStyleOverrides={props.setStyleOverrides}
            />
          )}

          {props.activeTab === 'lab' && (
            <StudioLabTab
              gameName={props.gameName}
              styleId={props.styleId}
              buttonSize={props.touchConfig.buttonSize}
              hud={props.hud}
            />
          )}

          {props.activeTab === 'skills' && <StudioSkillsTab />}

          {props.activeTab === 'services' && (
            <StudioServicesTab
              gameName={props.gameName}
              hud={props.hud}
              styleId={props.styleId}
              lang={props.lang}
              setLang={props.setLang}
              auth={props.auth}
              setAuth={props.setAuth}
              analytics={props.analytics}
              analyticsEnabled={props.analyticsEnabled}
              setAnalyticsEnabled={props.setAnalyticsEnabled}
              onApplyLoadedSave={props.onApplyLoadedSave}
              onSaveProgress={props.onSaveProgress}
              onLoadProgress={props.onLoadProgress}
              onDeleteSaveSlot={props.onDeleteSaveSlot}
              saveRevision={props.saveRevision}
              onAddBonusCoinsPotions={props.onAddBonusCoinsPotions}
              isOnline={props.isOnline}
            />
          )}

          {props.activeTab === 'export' && (
            <StudioExportTab gameName={props.gameName} styleId={props.styleId} hud={props.hud} />
          )}
        </TabErrorBoundary>
      </main>
    </div>
  );
}
