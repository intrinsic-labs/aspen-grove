import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { CreateDialogueLoomTreeUseCase, SendDialogueTurnUseCase } from '@application/use-cases';
import { OpenRouterAdapter } from '@infrastructure/llm';
import { runStartupOrchestrator } from '@infrastructure/bootstrap';
import database from '@infrastructure/persistence/watermelon/index.native';
import {
  WatermelonAgentRepository,
  WatermelonEdgeRepository,
  WatermelonGroveRepository,
  WatermelonLoomTreeRepository,
  WatermelonNodeRepository,
  WatermelonPathRepository,
  WatermelonPathStateRepository,
  WatermelonRawApiResponseRepository,
  WatermelonUserPreferencesRepository,
} from '@infrastructure/persistence/watermelon/repositories';
import { ExpoSecureCredentialStore } from '@infrastructure/security';
import { parseULID, type ULID } from '@domain/value-objects';
import { useThemeColors } from '@interface/hooks/useThemeColors';
import { AppText } from '@interface/ui/system';

type AppServices = {
  readonly repositories: {
    readonly agentRepo: WatermelonAgentRepository;
    readonly edgeRepo: WatermelonEdgeRepository;
    readonly groveRepo: WatermelonGroveRepository;
    readonly treeRepo: WatermelonLoomTreeRepository;
    readonly nodeRepo: WatermelonNodeRepository;
    readonly pathRepo: WatermelonPathRepository;
    readonly pathStateRepo: WatermelonPathStateRepository;
    readonly rawApiResponseRepo: WatermelonRawApiResponseRepository;
    readonly userPreferencesRepo: WatermelonUserPreferencesRepository;
  };
  readonly adapters: {
    readonly openRouterProvider: OpenRouterAdapter;
    readonly credentialStore: ExpoSecureCredentialStore;
  };
  readonly useCases: {
    readonly createDialogueLoomTreeUseCase: CreateDialogueLoomTreeUseCase;
    readonly sendDialogueTurnUseCase: SendDialogueTurnUseCase;
  };
};

export type AppBootstrapResult = {
  readonly userPreferencesId: ULID;
  readonly ownerAgentId: ULID;
  readonly groveId: ULID;
  readonly createdSmokeTreeId?: ULID;
  readonly existingTreeCount?: number;
};

type AppBootstrapState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly result: AppBootstrapResult };

type AppCompositionContextValue = {
  readonly services: AppServices;
  readonly bootstrap: AppBootstrapState;
};

const AppCompositionContext = createContext<AppCompositionContextValue | null>(null);

const buildAppServices = (): AppServices => {
  const repositories = {
    agentRepo: new WatermelonAgentRepository(database),
    edgeRepo: new WatermelonEdgeRepository(database),
    groveRepo: new WatermelonGroveRepository(database),
    treeRepo: new WatermelonLoomTreeRepository(database),
    nodeRepo: new WatermelonNodeRepository(database),
    pathRepo: new WatermelonPathRepository(database),
    pathStateRepo: new WatermelonPathStateRepository(database),
    rawApiResponseRepo: new WatermelonRawApiResponseRepository(database),
    userPreferencesRepo: new WatermelonUserPreferencesRepository(database),
  } as const;

  const adapters = {
    openRouterProvider: new OpenRouterAdapter(),
    credentialStore: new ExpoSecureCredentialStore(),
  } as const;

  const useCases = {
    createDialogueLoomTreeUseCase: new CreateDialogueLoomTreeUseCase({
      groveRepository: repositories.groveRepo,
      agentRepository: repositories.agentRepo,
      loomTreeRepository: repositories.treeRepo,
      nodeRepository: repositories.nodeRepo,
      pathRepository: repositories.pathRepo,
      pathStateRepository: repositories.pathStateRepo,
    }),
    sendDialogueTurnUseCase: new SendDialogueTurnUseCase({
      agentRepository: repositories.agentRepo,
      loomTreeRepository: repositories.treeRepo,
      nodeRepository: repositories.nodeRepo,
      edgeRepository: repositories.edgeRepo,
      pathRepository: repositories.pathRepo,
      pathStateRepository: repositories.pathStateRepo,
      rawApiResponseRepository: repositories.rawApiResponseRepo,
      llmProvider: adapters.openRouterProvider,
    }),
  } as const;

  return {
    repositories,
    adapters,
    useCases,
  };
};

const toBootstrapResult = (
  result: Awaited<ReturnType<typeof runStartupOrchestrator>>
): AppBootstrapResult => ({
  userPreferencesId: parseULID(result.userPreferencesId),
  ownerAgentId: parseULID(result.ownerAgentId),
  groveId: parseULID(result.groveId),
  createdSmokeTreeId: result.createdSmokeTreeId
    ? parseULID(result.createdSmokeTreeId)
    : undefined,
  existingTreeCount: result.existingTreeCount,
});

type AppServicesProviderProps = {
  readonly children: ReactNode;
};

export const AppServicesProvider = ({ children }: AppServicesProviderProps) => {
  const services = useMemo(() => buildAppServices(), []);
  const [bootstrap, setBootstrap] = useState<AppBootstrapState>({
    status: 'loading',
  });

  useEffect(() => {
    let isCancelled = false;

    const runBootstrap = async () => {
      try {
        const startupResult = await runStartupOrchestrator(database, {
          ensureDialogueSmokeTreeIfEmpty: false,
        });
        if (isCancelled) {
          return;
        }
        setBootstrap({
          status: 'ready',
          result: toBootstrapResult(startupResult),
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }
        setBootstrap({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    };

    void runBootstrap();

    return () => {
      isCancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      services,
      bootstrap,
    }),
    [bootstrap, services]
  );

  return (
    <AppCompositionContext.Provider value={value}>
      {children}
    </AppCompositionContext.Provider>
  );
};

export const useAppServices = (): AppServices => {
  const context = useContext(AppCompositionContext);
  if (!context) {
    throw new Error('useAppServices must be used within AppServicesProvider');
  }
  return context.services;
};

export const useAppBootstrapState = (): AppBootstrapState => {
  const context = useContext(AppCompositionContext);
  if (!context) {
    throw new Error('useAppBootstrapState must be used within AppServicesProvider');
  }
  return context.bootstrap;
};

type AppBootstrapGateProps = {
  readonly children: ReactNode;
};

export const AppBootstrapGate = ({ children }: AppBootstrapGateProps) => {
  const { colors } = useThemeColors();
  const bootstrap = useAppBootstrapState();

  if (bootstrap.status === 'loading') {
    return (
      <View style={styles.centerWrap}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (bootstrap.status === 'error') {
    return (
      <View style={styles.centerWrap}>
        <AppText variant="meta" tone="accent">
          {bootstrap.message}
        </AppText>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});

