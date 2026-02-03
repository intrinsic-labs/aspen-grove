# React Native Development Guide for Native Developers

> A comprehensive guide for building idiomatic React Native applications, written for developers coming from Swift/SwiftUI and Kotlin/Jetpack Compose backgrounds.

**Audience**: Native mobile developers with React/Next.js experience entering React Native  
**Project Context**: Aspen Grove — an Expo + Expo Router app with Clean Architecture, WatermelonDB, and TypeScript  
**Stack**: Expo SDK 52+, Expo Router v3+, WatermelonDB, Zustand, TypeScript

---

## Table of Contents

1. [Mental Model Shifts](#mental-model-shifts)
2. [Clean Architecture in React Native](#clean-architecture-in-react-native)
3. [State Management Deep Dive](#state-management-deep-dive)
4. [Data Layer Patterns](#data-layer-patterns)
5. [Component Architecture](#component-architecture)
6. [Performance Patterns](#performance-patterns)
7. [Expo-Specific Patterns](#expo-specific-patterns)
8. [Navigation Patterns](#navigation-patterns)
9. [Testing Strategy](#testing-strategy)
10. [Common Pitfalls](#common-pitfalls)
11. [Project Structure Reference](#project-structure-reference)

---

## Mental Model Shifts

### From Native to React Native

| Native Concept | React Native Equivalent | Key Difference |
|----------------|------------------------|----------------|
| `View`/`UIView` | `<View>` component | Flexbox by default, not frame-based |
| `@State`/`State<T>` | `useState` hook | No automatic UI binding — must explicitly re-render |
| `@Published`/`StateFlow` | Context, Zustand, or observable | No built-in observable system |
| `ViewModifier`/`Modifier` | StyleSheet + component composition | Styles are objects, not chainable |
| `NavigationStack`/`NavController` | Expo Router | File-based routing, like Next.js! |
| SwiftData/Room | WatermelonDB | Lazy loading, observable queries |
| `async/await` | `async/await` (same!) | Nearly identical |
| Protocol/Interface | TypeScript interface | Same concept, different syntax |

### Your Next.js Experience is an Advantage

With Expo Router, your Next.js knowledge transfers directly:

| Next.js | Expo Router | Notes |
|---------|-------------|-------|
| `pages/` or `app/` directory | `app/` directory | Same file-based routing concept |
| `[id].tsx` dynamic routes | `[id].tsx` dynamic routes | Identical syntax |
| `_layout.tsx` | `_layout.tsx` | Same concept for shared layouts |
| `useRouter()` | `router` from `expo-router` | Similar API |
| `useSearchParams()` | `useLocalSearchParams()` | Similar API |
| `<Link href="">` | `<Link href="">` | Nearly identical |
| `next/navigation` | `expo-router` | Same patterns |

This is a huge advantage — Expo Router was designed to feel like Next.js for mobile.

### The Rendering Model

**SwiftUI/Compose**: Declarative UI with automatic diffing. State changes automatically trigger re-renders of affected views. The framework tracks dependencies.

**React Native**: Also declarative, but **you** manage when things re-render. React re-renders the entire component tree by default, and you optimize with memoization. This is the single biggest source of performance issues for native devs.

```typescript
// This re-renders EVERY time parent re-renders, even if `item` hasn't changed
const ListItem = ({ item }: { item: Item }) => {
  return <Text>{item.name}</Text>;
};

// This only re-renders when `item` actually changes (shallow comparison)
const ListItem = memo(({ item }: { item: Item }) => {
  return <Text>{item.name}</Text>;
});
```

### The "Everything is a Function" Philosophy

In SwiftUI/Compose, views are structs/composables with clear lifecycle methods. In React, components are functions that run top-to-bottom on every render. Effects and memoization are escape hatches from this model.

```typescript
// This runs on EVERY render
const MyComponent = () => {
  console.log('I run every time!');
  
  // This runs only on mount and when `dep` changes
  useEffect(() => {
    console.log('I run on mount and when dep changes');
  }, [dep]);
  
  // This value is memoized — only recomputed when `data` changes
  const processed = useMemo(() => expensiveOperation(data), [data]);
  
  return <View />;
};
```

---

## Clean Architecture in React Native

### How It Differs from Native Clean Architecture

In native development (especially with SwiftUI/Combine or Kotlin/Flow), Clean Architecture often uses **reactive streams** flowing from the data layer up through the UI:

```
[Repository] → Observable<Data> → [ViewModel] → @Published → [View]
```

In React Native, you have two main approaches:

#### Approach 1: Hook-Based (Recommended for RN)

```
[Repository] → [Custom Hook] → Component State → [View]
```

The custom hook encapsulates the use case and exposes reactive state:

```typescript
// application/hooks/useLoomTree.ts
export function useLoomTree(treeId: string) {
  const [tree, setTree] = useState<LoomTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const subscription = loomTreeRepository
      .observeById(treeId)
      .subscribe({
        next: setTree,
        error: setError,
      });
    setLoading(false);
    return () => subscription.unsubscribe();
  }, [treeId]);
  
  const addNode = useCallback(async (content: string) => {
    // Use case logic here
    await nodeRepository.create({ treeId, content });
  }, [treeId]);
  
  return { tree, loading, error, addNode };
}
```

#### Approach 2: External State Manager (For Complex Cross-Cutting State)

```
[Repository] → [Zustand Store] → [Selector Hook] → [View]
```

Use this when state needs to be shared across many unrelated components, or when you have complex derived state.

### Layer Boundaries in React Native

Your ADR-003 is well-structured. Here's how to enforce it in RN:

```
src/
├── domain/           # Pure TypeScript — NO React imports
│   ├── entities/     # Interfaces and types
│   ├── values/       # Value objects
│   └── errors/       # Domain errors
│
├── application/      # Use cases — can import domain, NO infrastructure
│   ├── usecases/     # Pure business logic functions
│   ├── repositories/ # Interface definitions (not implementations)
│   ├── services/     # Service interface definitions
│   └── hooks/        # React hooks that orchestrate use cases
│
├── infrastructure/   # Implementations — can import domain, application
│   ├── persistence/  # WatermelonDB models and repositories
│   ├── llm/          # Provider adapters
│   └── media/        # File system operations
│
└── interface/        # React Native UI — can import everything
    ├── screens/
    ├── components/
    ├── navigation/
    └── state/        # Zustand stores if needed
```

### Enforcing Layer Boundaries

Use ESLint with `eslint-plugin-import` to prevent illegal imports:

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          // Domain cannot import from any other layer
          {
            target: './src/domain',
            from: './src/application',
            message: 'Domain cannot depend on Application layer',
          },
          {
            target: './src/domain',
            from: './src/infrastructure',
            message: 'Domain cannot depend on Infrastructure layer',
          },
          {
            target: './src/domain',
            from: './src/interface',
            message: 'Domain cannot depend on Interface layer',
          },
          // Application cannot import from infrastructure or interface
          {
            target: './src/application',
            from: './src/infrastructure',
            message: 'Application cannot depend on Infrastructure layer',
          },
          {
            target: './src/application',
            from: './src/interface',
            message: 'Application cannot depend on Interface layer',
          },
          // Infrastructure cannot import from interface
          {
            target: './src/infrastructure',
            from: './src/interface',
            message: 'Infrastructure cannot depend on Interface layer',
          },
        ],
      },
    ],
  },
};
```

### Dependency Injection in React Native

Unlike native platforms with Hilt/Dagger or Swift's dependency injection, React Native typically uses:

1. **React Context for runtime DI**:

```typescript
// infrastructure/di/RepositoryProvider.tsx
const RepositoryContext = createContext<Repositories | null>(null);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const database = useDatabase(); // WatermelonDB hook
  
  const repositories = useMemo(() => ({
    loomTree: new WatermelonLoomTreeRepository(database),
    node: new WatermelonNodeRepository(database),
    // ... other repositories
  }), [database]);
  
  return (
    <RepositoryContext.Provider value={repositories}>
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepositories() {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useRepositories must be used within RepositoryProvider');
  return context;
}
```

2. **Factory functions for testing**:

```typescript
// application/usecases/generateContinuation.ts
export function createGenerateContinuation(deps: {
  nodeRepository: NodeRepository;
  llmProvider: LLMProvider;
}) {
  return async function generateContinuation(
    treeId: string,
    parentNodeId: string,
    options: GenerationOptions
  ): Promise<Node[]> {
    // Use case implementation using injected deps
  };
}
```

---

## State Management Deep Dive

This is where native developers most often struggle. React's state model is fundamentally different.

### The State Taxonomy

| State Type | Where It Lives | Examples |
|------------|---------------|----------|
| **Server/Persisted** | WatermelonDB + React Query/hooks | Loom Trees, Nodes, User Preferences |
| **Global UI** | Zustand/Context | Active tree ID, theme, Voice Mode toggle |
| **Local UI** | useState | Form inputs, modal open/closed, loading states |
| **Derived** | useMemo/selectors | Computed path, filtered nodes, search results |
| **URL/Navigation** | React Navigation params | Current screen, tree being viewed |

### Why This Matters for Aspen Grove

Your app has complex state interactions:

- **Active Path** — derived from tree structure + user navigation
- **Working Buffer** — local UI state that becomes persisted on commit  
- **Streaming Responses** — ephemeral state that becomes persisted
- **Loom-Aware Context** — computed from multiple data sources

### Recommended State Architecture

```typescript
// 1. Persisted State: WatermelonDB with observable queries
// infrastructure/persistence/repositories/WatermelonNodeRepository.ts
class WatermelonNodeRepository implements NodeRepository {
  observeByTreeId(treeId: string): Observable<Node[]> {
    return this.database
      .get<NodeModel>('nodes')
      .query(Q.where('loom_tree_id', treeId))
      .observeWithColumns(['content', 'updated_at']);
  }
}

// 2. Global UI State: Zustand (simpler than Redux, better DX than Context)
// interface/state/useNavigationStore.ts
interface NavigationState {
  activeTreeId: string | null;
  activePath: string[]; // Node IDs from root to current
  setActiveTree: (treeId: string) => void;
  navigateToNode: (nodeId: string) => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  activeTreeId: null,
  activePath: [],
  setActiveTree: (treeId) => set({ activeTreeId: treeId, activePath: [] }),
  navigateToNode: (nodeId) => {
    // Compute new path...
    set({ activePath: newPath });
  },
}));

// 3. Use custom hooks to compose state sources
// application/hooks/useActiveNode.ts
export function useActiveNode() {
  const activePath = useNavigationStore((s) => s.activePath);
  const currentNodeId = activePath[activePath.length - 1];
  
  // WatermelonDB observable via custom hook
  const node = useNode(currentNodeId);
  
  return node;
}
```

### The Golden Rules of React State

1. **Lift state only as high as necessary** — Don't put everything in global state
2. **Derive state instead of syncing state** — If you can compute it, don't store it
3. **Colocate state with its consumers** — Form state belongs in the form component
4. **Use refs for values that don't affect render** — Animation values, timers, etc.

### Avoiding the "Prop Drilling vs. Global State" False Dichotomy

Native devs often think: "I need this data in a deeply nested component, so I'll make it global."

Better options:
1. **Component composition** — Pass components as children, not data as props
2. **Compound components** — Components that share implicit state
3. **Scoped contexts** — Context that only wraps the components that need it

```typescript
// Instead of prop drilling or global state:
// Use component composition
<LoomTreeView treeId={treeId}>
  <NodeList>
    {(node) => <NodeCard node={node} />}
  </NodeList>
</LoomTreeView>

// The context is scoped to LoomTreeView, not global
function LoomTreeView({ treeId, children }) {
  const tree = useLoomTree(treeId);
  return (
    <LoomTreeContext.Provider value={tree}>
      {children}
    </LoomTreeContext.Provider>
  );
}
```

---

## Data Layer Patterns

### WatermelonDB Patterns

WatermelonDB is excellent for your use case, but requires some Expo-specific setup.

#### Expo Setup for WatermelonDB

WatermelonDB requires native code, so you'll need a **development build** (not Expo Go):

```bash
# Install WatermelonDB
npx expo install @nozbe/watermelondb

# Install the Expo config plugin
npx expo install @morrowdigital/watermelondb-expo-plugin

# Create a development build (required for native modules)
npx expo prebuild
npx expo run:ios  # or run:android
```

```typescript
// app.config.ts
export default {
  expo: {
    plugins: [
      ["@morrowdigital/watermelondb-expo-plugin"],
    ],
    // ... rest of config
  }
};
```

**Important**: You cannot use Expo Go with WatermelonDB. Use EAS Build or local development builds.

#### Key Patterns

#### 1. Model Definition

```typescript
// infrastructure/persistence/models/NodeModel.ts
import { Model } from '@nozbe/watermelondb';
import { field, relation, readonly, date } from '@nozbe/watermelondb/decorators';

export class NodeModel extends Model {
  static table = 'nodes';
  static associations = {
    loom_trees: { type: 'belongs_to', key: 'loom_tree_id' },
  } as const;

  @field('local_id') localId!: string;
  @field('loom_tree_id') loomTreeId!: string;
  @field('content') content!: string;
  @field('author_agent_id') authorAgentId!: string;
  @field('author_type') authorType!: 'human' | 'model';
  @field('content_hash') contentHash!: string;
  @field('edited_from') editedFrom!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  
  @relation('loom_trees', 'loom_tree_id') loomTree!: Relation<LoomTreeModel>;
}
```

#### 2. Repository Implementation

```typescript
// infrastructure/persistence/repositories/WatermelonNodeRepository.ts
export class WatermelonNodeRepository implements NodeRepository {
  constructor(private database: Database) {}

  async findById(id: string): Promise<Node | null> {
    try {
      const model = await this.database.get<NodeModel>('nodes').find(id);
      return this.toDomain(model);
    } catch {
      return null;
    }
  }

  async findByLocalId(treeId: string, localId: string): Promise<Node | null> {
    const models = await this.database
      .get<NodeModel>('nodes')
      .query(
        Q.where('loom_tree_id', treeId),
        Q.where('local_id', localId)
      )
      .fetch();
    return models[0] ? this.toDomain(models[0]) : null;
  }

  observeByTreeId(treeId: string): Observable<Node[]> {
    return this.database
      .get<NodeModel>('nodes')
      .query(Q.where('loom_tree_id', treeId))
      .observeWithColumns(['content', 'content_hash', 'updated_at'])
      .pipe(map((models) => models.map(this.toDomain)));
  }

  private toDomain(model: NodeModel): Node {
    return {
      id: model.id,
      localId: model.localId,
      loomTreeId: model.loomTreeId,
      content: JSON.parse(model.content), // Content is stored as JSON
      authorAgentId: model.authorAgentId,
      authorType: model.authorType,
      contentHash: model.contentHash,
      createdAt: model.createdAt,
      editedFrom: model.editedFrom,
    };
  }
}
```

#### 3. Observable Hook

```typescript
// application/hooks/useNodes.ts
export function useNodes(treeId: string) {
  const { node: nodeRepository } = useRepositories();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscription = nodeRepository
      .observeByTreeId(treeId)
      .subscribe({
        next: (newNodes) => {
          setNodes(newNodes);
          setLoading(false);
        },
        error: (err) => {
          console.error('Failed to observe nodes:', err);
          setLoading(false);
        },
      });

    return () => subscription.unsubscribe();
  }, [treeId, nodeRepository]);

  return { nodes, loading };
}
```

### Handling Streaming Responses

For LLM streaming, you need ephemeral state that eventually persists:

```typescript
// application/hooks/useGeneration.ts
interface GenerationState {
  status: 'idle' | 'generating' | 'error';
  streamedContent: string;
  error: Error | null;
}

export function useGeneration(treeId: string, parentNodeId: string) {
  const [state, setState] = useState<GenerationState>({
    status: 'idle',
    streamedContent: '',
    error: null,
  });
  
  const { node: nodeRepository } = useRepositories();
  const { llm } = useLLMProvider();

  const generate = useCallback(async (options: GenerationOptions) => {
    setState({ status: 'generating', streamedContent: '', error: null });
    
    try {
      const stream = llm.generateStreamingCompletion(/* ... */);
      
      for await (const chunk of stream) {
        if (chunk.type === 'text') {
          setState((prev) => ({
            ...prev,
            streamedContent: prev.streamedContent + chunk.content,
          }));
        }
        
        if (chunk.type === 'done') {
          // Persist the completed response
          await nodeRepository.create({
            loomTreeId: treeId,
            content: { type: 'text', text: state.streamedContent },
            // ... other fields
          });
          
          setState({ status: 'idle', streamedContent: '', error: null });
        }
      }
    } catch (error) {
      setState({ status: 'error', streamedContent: '', error: error as Error });
    }
  }, [treeId, parentNodeId, llm, nodeRepository]);

  return { ...state, generate };
}
```

---

## Component Architecture

### Atomic Design in React Native

Organize components by abstraction level:

```
interface/components/
├── atoms/          # Smallest building blocks
│   ├── Text.tsx    # Themed text with variants
│   ├── Icon.tsx    # Icon wrapper
│   └── Pressable.tsx # Accessible touch target
│
├── molecules/      # Combinations of atoms
│   ├── NodeBadge.tsx
│   ├── AgentAvatar.tsx
│   └── BranchIndicator.tsx
│
├── organisms/      # Complex, self-contained units
│   ├── NodeCard.tsx
│   ├── PathBreadcrumb.tsx
│   └── GenerationControls.tsx
│
└── templates/      # Page-level layouts
    ├── TreeViewLayout.tsx
    └── SettingsLayout.tsx
```

### Component Patterns

#### 1. Presentational vs. Container (Still Useful!)

```typescript
// Presentational: Pure, receives all data via props
// Easy to test, easy to reuse
const NodeCardView = memo(function NodeCardView({
  content,
  author,
  isBookmarked,
  onPress,
  onLongPress,
}: NodeCardViewProps) {
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress}>
      <AgentAvatar agent={author} />
      <ContentRenderer content={content} />
      {isBookmarked && <BookmarkBadge />}
    </Pressable>
  );
});

// Container: Handles data fetching and state
const NodeCard = ({ nodeId }: { nodeId: string }) => {
  const node = useNode(nodeId);
  const author = useAgent(node?.authorAgentId);
  const { navigateToNode } = useNavigation();
  
  if (!node || !author) return <NodeCardSkeleton />;
  
  return (
    <NodeCardView
      content={node.content}
      author={author}
      isBookmarked={node.metadata.bookmarked}
      onPress={() => navigateToNode(nodeId)}
      onLongPress={() => {/* open context menu */}}
    />
  );
};
```

#### 2. Compound Components for Complex UI

For your Buffer Mode editor or tree viewer:

```typescript
// Usage
<LoomTreeViewer treeId={treeId}>
  <LoomTreeViewer.Header />
  <LoomTreeViewer.PathNavigator />
  <LoomTreeViewer.NodeList>
    {(node) => <LoomTreeViewer.Node node={node} />}
  </LoomTreeViewer.NodeList>
  <LoomTreeViewer.GenerationControls />
</LoomTreeViewer>

// Implementation
const LoomTreeContext = createContext<LoomTreeContextValue | null>(null);

function LoomTreeViewer({ treeId, children }: LoomTreeViewerProps) {
  const tree = useLoomTree(treeId);
  const navigation = useTreeNavigation(treeId);
  
  return (
    <LoomTreeContext.Provider value={{ tree, ...navigation }}>
      <View style={styles.container}>{children}</View>
    </LoomTreeContext.Provider>
  );
}

LoomTreeViewer.Header = function Header() {
  const { tree } = useLoomTreeContext();
  return <Text style={styles.title}>{tree.title}</Text>;
};

LoomTreeViewer.NodeList = function NodeList({ children }) {
  const { activePath, nodes } = useLoomTreeContext();
  // Render nodes using the render prop pattern
};

// ... other compound components
```

#### 3. Render Props for Flexibility

```typescript
interface NodeListProps {
  treeId: string;
  renderNode: (node: Node, index: number) => ReactNode;
  renderEmpty?: () => ReactNode;
  renderLoading?: () => ReactNode;
}

function NodeList({ treeId, renderNode, renderEmpty, renderLoading }: NodeListProps) {
  const { nodes, loading } = useNodes(treeId);
  
  if (loading) return renderLoading?.() ?? <DefaultLoading />;
  if (nodes.length === 0) return renderEmpty?.() ?? <DefaultEmpty />;
  
  return (
    <FlatList
      data={nodes}
      renderItem={({ item, index }) => renderNode(item, index)}
      keyExtractor={(node) => node.id}
    />
  );
}
```

---

## Performance Patterns

### The React Native Performance Model

Key insight: **JavaScript runs on a separate thread from the UI**. Heavy JS work blocks the JS thread, not the UI thread — but it blocks bridge communication, which causes jank.

#### 1. Memoization is Your Friend

```typescript
// Memoize components that receive object/array props
const NodeCard = memo(function NodeCard({ node }: { node: Node }) {
  // ...
});

// Memoize expensive computations
function useTreeStatistics(nodes: Node[]) {
  return useMemo(() => {
    return {
      totalNodes: nodes.length,
      branchPoints: nodes.filter(isBranchPoint).length,
      modelNodes: nodes.filter((n) => n.authorType === 'model').length,
      // ... expensive calculations
    };
  }, [nodes]);
}

// Memoize callbacks passed to children
function TreeControls({ treeId }: { treeId: string }) {
  const { generateContinuation } = useGeneration(treeId);
  
  // Without useCallback, this creates a new function every render
  // causing child components to re-render unnecessarily
  const handleGenerate = useCallback(() => {
    generateContinuation({ n: 1 });
  }, [generateContinuation]);
  
  return <GenerateButton onPress={handleGenerate} />;
}
```

#### 2. List Virtualization

For your Loom Tree views:

```typescript
import { FlashList } from '@shopify/flash-list';

function NodeList({ nodes }: { nodes: Node[] }) {
  const renderItem = useCallback(({ item }: { item: Node }) => (
    <NodeCard node={item} />
  ), []);

  return (
    <FlashList
      data={nodes}
      renderItem={renderItem}
      estimatedItemSize={120} // Approximate height in pixels
      keyExtractor={(node) => node.id}
    />
  );
}
```

#### 3. Avoid Anonymous Objects in Props

```typescript
// BAD: Creates new object every render, breaks memoization
<View style={{ flex: 1, padding: 16 }}>
  <NodeCard node={node} />
</View>

// GOOD: Static style object
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});

<View style={styles.container}>
  <NodeCard node={node} />
</View>

// GOOD: Memoized dynamic styles
const dynamicStyles = useMemo(() => ({
  container: { flex: 1, padding: isCompact ? 8 : 16 },
}), [isCompact]);
```

#### 4. Optimize Re-renders with Selectors

```typescript
// BAD: Re-renders on ANY store change
function MyComponent() {
  const store = useNavigationStore();
  return <Text>{store.activeTreeId}</Text>;
}

// GOOD: Re-renders only when activeTreeId changes
function MyComponent() {
  const activeTreeId = useNavigationStore((s) => s.activeTreeId);
  return <Text>{activeTreeId}</Text>;
}
```

#### 5. Debounce Expensive Operations

For Buffer Mode's working buffer:

```typescript
function useAutoSave(content: string, save: (content: string) => Promise<void>) {
  const debouncedSave = useMemo(
    () => debounce(save, 1000),
    [save]
  );

  useEffect(() => {
    debouncedSave(content);
    return () => debouncedSave.cancel();
  }, [content, debouncedSave]);
}
```

---

## Expo-Specific Patterns

### Why Expo?

Expo provides a managed workflow that handles much of the native complexity. For Aspen Grove:

- **expo-secure-store** — For API keys (replaces raw Keychain/Keystore access)
- **expo-file-system** — For media storage
- **expo-av** — For Voice Mode audio
- **expo-speech** — For TTS
- **Expo Router** — File-based navigation (see below)
- **EAS Build** — Cloud builds without local Xcode/Android Studio setup

### Expo Router vs React Navigation

Expo Router is built on React Navigation but uses **file-based routing** (like Next.js). This is a major mental model shift from both native and traditional React Navigation.

| Concept | React Navigation | Expo Router |
|---------|-----------------|-------------|
| Route definition | Explicit `<Stack.Screen>` | File in `app/` directory |
| Params | `navigation.navigate('Screen', { id })` | `router.push('/screen/[id]')` |
| Layouts | Wrapper components | `_layout.tsx` files |
| Deep links | Manual config | Automatic from file structure |
| Type safety | Manual type definitions | Generated from file structure |

### File Structure for Aspen Grove

```
app/
├── _layout.tsx              # Root layout (providers, fonts, etc.)
├── index.tsx                # Home/Grove screen (/)
├── settings.tsx             # Settings screen (/settings)
├── (tabs)/                  # Tab group
│   ├── _layout.tsx          # Tab navigator config
│   ├── grove.tsx            # Grove tab
│   └── documents.tsx        # Documents tab
├── tree/
│   ├── [treeId]/
│   │   ├── _layout.tsx      # Tree-specific layout
│   │   ├── index.tsx        # Tree view (/tree/[treeId])
│   │   └── node/
│   │       └── [nodeId].tsx # Node detail (/tree/[treeId]/node/[nodeId])
├── agent/
│   └── [agentId].tsx        # Agent config (/agent/[agentId])
└── +not-found.tsx           # 404 handler
```

### Navigation in Expo Router

```typescript
// app/tree/[treeId]/index.tsx
import { useLocalSearchParams, router } from 'expo-router';

export default function LoomTreeScreen() {
  // Params come from the URL, typed automatically
  const { treeId } = useLocalSearchParams<{ treeId: string }>();
  
  const openNode = (nodeId: string) => {
    // Navigate using URL-like paths
    router.push(`/tree/${treeId}/node/${nodeId}`);
  };
  
  const goBack = () => {
    router.back();
  };
  
  // Can also use Link component for declarative navigation
  return (
    <View>
      <Link href={`/tree/${treeId}/node/${someNodeId}`}>
        <NodeCard node={node} />
      </Link>
    </View>
  );
}
```

### Layouts and Providers

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { RepositoryProvider } from '../src/infrastructure/di/RepositoryProvider';
import { database } from '../src/infrastructure/persistence/database';

export default function RootLayout() {
  return (
    <DatabaseProvider database={database}>
      <RepositoryProvider>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Grove' }} />
          <Stack.Screen name="tree/[treeId]" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
      </RepositoryProvider>
    </DatabaseProvider>
  );
}

// app/tree/[treeId]/_layout.tsx
import { Stack, useLocalSearchParams } from 'expo-router';
import { LoomTreeProvider } from '../../../src/interface/providers/LoomTreeProvider';

export default function TreeLayout() {
  const { treeId } = useLocalSearchParams<{ treeId: string }>();
  
  // Scoped provider for this tree
  return (
    <LoomTreeProvider treeId={treeId}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Loom Tree' }} />
        <Stack.Screen name="node/[nodeId]" options={{ title: 'Node' }} />
      </Stack>
    </LoomTreeProvider>
  );
}
```

### Type-Safe Routes (Expo Router v3+)

Expo Router can generate types from your file structure:

```typescript
// In app.json or app.config.ts
{
  "expo": {
    "experiments": {
      "typedRoutes": true
    }
  }
}

// Now routes are typed!
router.push('/tree/123');           // ✓ Valid
router.push('/tree/123/node/456');  // ✓ Valid  
router.push('/invalid/route');      // ✗ Type error
```

### Deep Linking (Automatic!)

With Expo Router, deep links work automatically based on your file structure:

```typescript
// app.json
{
  "expo": {
    "scheme": "aspengrove",
    "web": {
      "bundler": "metro"
    }
  }
}

// These URLs now work automatically:
// aspengrove:///tree/abc123
// aspengrove:///tree/abc123/node/def456
// https://aspengrove.app/tree/abc123 (with proper web config)
```

### Modal and Sheet Patterns

```typescript
// app/tree/[treeId]/generation-options.tsx
import { router } from 'expo-router';

export default function GenerationOptionsModal() {
  return (
    <View style={styles.modal}>
      <GenerationForm 
        onSubmit={(options) => {
          // Pass data back via params or global state
          router.back();
        }}
      />
    </View>
  );
}

// In _layout.tsx, present as modal:
<Stack.Screen 
  name="generation-options" 
  options={{ 
    presentation: 'modal',
    headerTitle: 'Generation Options'
  }} 
/>
```

---

## Navigation Patterns

### When to Use What

| Pattern | Use Case | Example |
|---------|----------|---------|
| `router.push()` | Navigate forward, add to stack | Opening a tree |
| `router.replace()` | Replace current screen | After login |
| `router.back()` | Go back one screen | Cancel action |
| `router.dismiss()` | Dismiss modal | Close options sheet |
| `<Link>` component | Declarative navigation | List items |
| `router.setParams()` | Update current params | Filter changes |

### Passing Data Between Screens

```typescript
// Option 1: URL params (for IDs, simple values)
router.push(`/tree/${treeId}`);

// Option 2: Global state (for complex objects, avoid serialization)
const useGenerationStore = create((set) => ({
  pendingOptions: null,
  setPendingOptions: (options) => set({ pendingOptions: options }),
}));

// Set before navigation
useGenerationStore.getState().setPendingOptions(options);
router.push('/tree/123/generate');

// Read in destination
const options = useGenerationStore((s) => s.pendingOptions);
```

---

## Testing Strategy

### Layer-Appropriate Testing

| Layer | Test Type | Tools | What to Test |
|-------|-----------|-------|--------------|
| Domain | Unit | Jest | Entity validation, hash computation, value objects |
| Application | Unit + Integration | Jest + mock repos | Use case logic, repository interface contracts |
| Infrastructure | Integration | Jest + test DB | Repository implementations, LLM adapter responses |
| Interface | Component + E2E | React Testing Library + Maestro | User interactions, navigation flows |

### Testing Patterns

#### 1. Domain Layer (Pure Functions)

```typescript
// domain/values/ContentHash.test.ts
describe('ContentHash', () => {
  it('computes consistent hash for same content', () => {
    const content = { type: 'text', text: 'Hello' };
    const hash1 = computeContentHash(content, 'agent-1', 'human');
    const hash2 = computeContentHash(content, 'agent-1', 'human');
    expect(hash1).toBe(hash2);
  });

  it('differs for different content', () => {
    const hash1 = computeContentHash({ type: 'text', text: 'Hello' }, 'agent-1', 'human');
    const hash2 = computeContentHash({ type: 'text', text: 'World' }, 'agent-1', 'human');
    expect(hash1).not.toBe(hash2);
  });
});
```

#### 2. Application Layer (Use Cases)

```typescript
// application/usecases/generateContinuation.test.ts
describe('generateContinuation', () => {
  const mockNodeRepo = createMockNodeRepository();
  const mockLLMProvider = createMockLLMProvider();
  
  const generateContinuation = createGenerateContinuation({
    nodeRepository: mockNodeRepo,
    llmProvider: mockLLMProvider,
  });

  it('creates node from LLM response', async () => {
    mockLLMProvider.generateCompletion.mockResolvedValue({
      content: 'Generated text',
      finishReason: 'stop',
      // ...
    });

    const result = await generateContinuation('tree-1', 'parent-node', {});
    
    expect(mockNodeRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        loomTreeId: 'tree-1',
        content: { type: 'text', text: 'Generated text' },
      })
    );
  });
});
```

#### 3. Infrastructure Layer (With Test Database)

```typescript
// infrastructure/persistence/repositories/WatermelonNodeRepository.test.ts
describe('WatermelonNodeRepository', () => {
  let database: Database;
  let repository: WatermelonNodeRepository;

  beforeEach(async () => {
    database = await createTestDatabase();
    repository = new WatermelonNodeRepository(database);
  });

  afterEach(async () => {
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
  });

  it('finds node by localId within tree', async () => {
    // Create test data
    await database.write(async () => {
      await database.get('nodes').create((node) => {
        node.localId = '01HQ3K';
        node.loomTreeId = 'tree-1';
        node.content = JSON.stringify({ type: 'text', text: 'Test' });
      });
    });

    const result = await repository.findByLocalId('tree-1', '01HQ3K');
    expect(result).not.toBeNull();
    expect(result?.localId).toBe('01HQ3K');
  });
});
```

#### 4. Interface Layer (Component Tests)

```typescript
// interface/components/NodeCard.test.tsx
import { render, fireEvent } from '@testing-library/react-native';

describe('NodeCard', () => {
  const mockNode: Node = {
    id: 'node-1',
    localId: '01HQ3K',
    content: { type: 'text', text: 'Test content' },
    authorType: 'human',
    // ...
  };

  it('renders node content', () => {
    const { getByText } = render(
      <TestProviders>
        <NodeCardView node={mockNode} onPress={jest.fn()} />
      </TestProviders>
    );
    
    expect(getByText('Test content')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <NodeCardView node={mockNode} onPress={onPress} />
      </TestProviders>
    );
    
    fireEvent.press(getByTestId('node-card'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

---

## Common Pitfalls

### 1. Unnecessary Re-renders

**Symptom**: UI feels sluggish, especially in lists.

**Cause**: Not memoizing components or passing new object references as props.

**Fix**:
```typescript
// Use memo for components receiving object props
const NodeCard = memo(function NodeCard({ node }: Props) { ... });

// Use useMemo for object creation
const style = useMemo(() => ({ color: isActive ? 'blue' : 'gray' }), [isActive]);

// Use useCallback for handlers passed to children
const handlePress = useCallback(() => navigate(nodeId), [nodeId]);
```

### 2. Stale Closures

**Symptom**: Event handlers use outdated values.

**Cause**: Callbacks capture values from render scope.

**Fix**:
```typescript
// BAD: count is captured at creation time
const handlePress = useCallback(() => {
  console.log(count); // Always logs initial value
}, []); // Empty deps!

// GOOD: Include all dependencies
const handlePress = useCallback(() => {
  console.log(count);
}, [count]);

// OR: Use ref for values that shouldn't trigger re-creation
const countRef = useRef(count);
countRef.current = count;
const handlePress = useCallback(() => {
  console.log(countRef.current);
}, []);
```

### 3. Memory Leaks from Subscriptions

**Symptom**: "Can't perform state update on unmounted component" warning.

**Cause**: Not cleaning up subscriptions/async operations.

**Fix**:
```typescript
useEffect(() => {
  let isMounted = true;
  const subscription = observable.subscribe((data) => {
    if (isMounted) setState(data);
  });
  
  return () => {
    isMounted = false;
    subscription.unsubscribe();
  };
}, []);
```

### 4. Bridge Traffic Jams

**Symptom**: Animations stutter, touch responses delayed.

**Cause**: Too much data crossing the JS-Native bridge.

**Fix**:
- Use `react-native-reanimated` for animations (runs on UI thread)
- Batch state updates
- Use `InteractionManager` for heavy work after animations
- Flatten component hierarchies

```typescript
import { InteractionManager } from 'react-native';

// Defer heavy work until after navigation animation
useEffect(() => {
  const task = InteractionManager.runAfterInteractions(() => {
    loadExpensiveData();
  });
  return () => task.cancel();
}, []);
```

### 5. Infinite Effect Loops

**Symptom**: Component re-renders forever, app crashes.

**Cause**: Effect updates state that's in its own dependency array.

**Fix**:
```typescript
// BAD: Infinite loop
useEffect(() => {
  setItems([...items, newItem]); // items changes → effect runs → items changes...
}, [items, newItem]);

// GOOD: Use functional update
useEffect(() => {
  setItems((prev) => [...prev, newItem]);
}, [newItem]); // Only depends on newItem
```

### 6. Over-fetching in WatermelonDB

**Symptom**: Slow initial load, high memory usage.

**Cause**: Loading entire tables instead of lazy queries.

**Fix**:
```typescript
// BAD: Loads ALL nodes upfront
const allNodes = await database.get('nodes').query().fetch();

// GOOD: Query only what's needed
const treeNodes = await database
  .get('nodes')
  .query(Q.where('loom_tree_id', treeId))
  .fetch();

// BETTER: Use observables for reactive updates
const nodes$ = database
  .get('nodes')
  .query(Q.where('loom_tree_id', treeId))
  .observe();
```

### 7. Not Handling Keyboard on iOS

**Symptom**: Input fields hidden behind keyboard.

**Fix**:
```typescript
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView 
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  {/* Your content */}
</KeyboardAvoidingView>
```

### 8. Ignoring the New Architecture

**Note**: React Native's New Architecture (Fabric, TurboModules) is becoming standard. For new projects in 2025:

- Use the New Architecture from the start
- Prefer libraries that support Fabric
- Use JSI-based libraries when available (faster than bridge)

### 9. Using Expo Go with Native Modules (Expo-Specific)

**Symptom**: App crashes or module not found errors in Expo Go.

**Cause**: WatermelonDB (and other native modules) require a development build.

**Fix**:
```bash
# Create a development build instead of using Expo Go
npx expo prebuild
npx expo run:ios   # Local build
# OR
eas build --profile development --platform ios  # Cloud build
```

### 10. Forgetting to Handle Expo Router Params (Expo-Specific)

**Symptom**: Params are `undefined` on first render, or wrong types.

**Cause**: Expo Router params come from URL, need proper handling.

**Fix**:
```typescript
// BAD: Assumes params exist immediately
const { treeId } = useLocalSearchParams();
const tree = useLoomTree(treeId); // treeId might be undefined!

// GOOD: Handle loading state
const { treeId } = useLocalSearchParams<{ treeId: string }>();

if (!treeId) {
  return <LoadingScreen />;
}

const tree = useLoomTree(treeId);
```

### 11. Putting Business Logic in Route Files (Expo-Specific)

**Symptom**: Route files become bloated, hard to test.

**Cause**: Treating `app/` like a monolithic screens folder.

**Fix**: Route files should be thin — just connecting UI to logic:
```typescript
// app/tree/[treeId]/index.tsx — KEEP IT THIN
export default function LoomTreeScreen() {
  const { treeId } = useLocalSearchParams<{ treeId: string }>();
  
  if (!treeId) return <LoadingScreen />;
  
  // All the real work happens in components and hooks
  return <LoomTreeView treeId={treeId} />;
}

// src/interface/components/organisms/LoomTreeView.tsx — LOGIC LIVES HERE
export function LoomTreeView({ treeId }: { treeId: string }) {
  const { tree, nodes, loading } = useLoomTree(treeId);
  // ... actual implementation
}
```

### 12. Not Using Expo's Built-in Solutions

**Symptom**: Reinventing the wheel, compatibility issues.

**Fix**: Prefer Expo packages when available:

| Need | Use This | Not This |
|------|----------|----------|
| Secure storage | `expo-secure-store` | `react-native-keychain` |
| File system | `expo-file-system` | `react-native-fs` |
| Audio/Video | `expo-av` | `react-native-video` |
| Camera | `expo-camera` | `react-native-camera` |
| Speech-to-text | `expo-speech` + native | Community packages |
| Haptics | `expo-haptics` | `react-native-haptic-feedback` |

---

## Project Structure Reference

### Recommended Structure for Aspen Grove (Expo Router)

```
aspen-grove-rn/
├── app/                              # Expo Router - file-based routes
│   ├── _layout.tsx                   # Root layout (providers)
│   ├── index.tsx                     # Home screen (/)
│   ├── settings.tsx                  # Settings (/settings)
│   ├── (tabs)/                       # Tab group (optional)
│   │   ├── _layout.tsx
│   │   ├── grove.tsx
│   │   └── documents.tsx
│   ├── tree/
│   │   └── [treeId]/
│   │       ├── _layout.tsx           # Tree-scoped providers
│   │       ├── index.tsx             # Tree view
│   │       ├── buffer.tsx            # Buffer mode view
│   │       └── node/
│   │           └── [nodeId].tsx      # Node detail
│   ├── agent/
│   │   └── [agentId].tsx
│   └── +not-found.tsx
│
├── src/
│   ├── domain/                       # Layer 1: Pure TypeScript
│   │   ├── entities/
│   │   │   ├── LoomTree.ts
│   │   │   ├── Node.ts
│   │   │   ├── Edge.ts
│   │   │   ├── Agent.ts
│   │   │   └── index.ts
│   │   ├── values/
│   │   │   ├── Content.ts
│   │   │   ├── ContentHash.ts
│   │   │   ├── EdgeSource.ts
│   │   │   └── index.ts
│   │   └── errors/
│   │       ├── DomainError.ts
│   │       └── index.ts
│   │
│   ├── application/                  # Layer 2: Use cases
│   │   ├── usecases/
│   │   │   ├── generation/
│   │   │   │   ├── generateContinuation.ts
│   │   │   │   └── assembleContext.ts
│   │   │   ├── navigation/
│   │   │   │   ├── computePath.ts
│   │   │   │   └── switchBranch.ts
│   │   │   └── tree/
│   │   │       ├── createNode.ts
│   │   │       └── forkTree.ts
│   │   ├── repositories/             # Interfaces only
│   │   │   ├── LoomTreeRepository.ts
│   │   │   ├── NodeRepository.ts
│   │   │   └── index.ts
│   │   ├── services/                 # Interfaces only
│   │   │   ├── LLMProvider.ts
│   │   │   └── MediaStorage.ts
│   │   └── hooks/                    # React hooks for use cases
│   │       ├── useLoomTree.ts
│   │       ├── useNodes.ts
│   │       ├── useGeneration.ts
│   │       └── index.ts
│   │
│   ├── infrastructure/               # Layer 3: Implementations
│   │   ├── persistence/
│   │   │   ├── database.ts
│   │   │   ├── schema.ts
│   │   │   ├── migrations/
│   │   │   ├── models/
│   │   │   │   ├── NodeModel.ts
│   │   │   │   └── LoomTreeModel.ts
│   │   │   └── repositories/
│   │   │       ├── WatermelonNodeRepository.ts
│   │   │       └── WatermelonLoomTreeRepository.ts
│   │   ├── llm/
│   │   │   ├── adapters/
│   │   │   │   ├── AnthropicAdapter.ts
│   │   │   │   ├── OpenAIAdapter.ts
│   │   │   │   └── OpenRouterAdapter.ts
│   │   │   └── ModelCatalogService.ts
│   │   ├── media/
│   │   │   └── ExpoFileSystemMediaStorage.ts  # Uses expo-file-system
│   │   ├── secure-storage/
│   │   │   └── ExpoSecureStorage.ts           # Uses expo-secure-store
│   │   └── di/
│   │       └── RepositoryProvider.tsx
│   │
│   └── interface/                    # Layer 4: UI (non-route)
│       ├── components/
│       │   ├── atoms/
│       │   ├── molecules/
│       │   ├── organisms/
│       │   └── templates/
│       ├── providers/                # Scoped context providers
│       │   ├── LoomTreeProvider.tsx
│       │   └── VoiceModeProvider.tsx
│       ├── state/                    # Zustand stores
│       │   ├── useNavigationStore.ts
│       │   └── useVoiceModeStore.ts
│       └── theme/
│           ├── colors.ts
│           ├── typography.ts
│           └── spacing.ts
│
├── __tests__/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── interface/
│
├── assets/                           # Static assets (images, fonts)
│   ├── images/
│   └── fonts/
│
├── app.json                          # Expo config (or app.config.ts)
├── babel.config.js
├── metro.config.js
├── tsconfig.json
├── .eslintrc.js
├── eas.json                          # EAS Build config
└── package.json
```

### Key Differences from Bare React Native

1. **`app/` directory** — Routes live here, not in `src/interface/screens`
2. **No manual navigation setup** — Expo Router handles it
3. **Expo packages** — Use `expo-file-system`, `expo-secure-store`, `expo-av` instead of community packages
4. **`app.config.ts`** — Dynamic config is often preferable to static `app.json`
5. **EAS Build** — Use `eas.json` for build profiles

---

## Summary: Key Principles for Idiomatic React Native

### 1. Embrace the Rendering Model
- Components are functions that run on every render
- Use memoization strategically, not everywhere
- Understand when and why components re-render

### 2. State Belongs Where It's Used
- Local state for local concerns
- Lift state only as high as necessary
- Derive state instead of syncing state
- Use external stores for truly global concerns

### 3. Clean Architecture Adapts, Not Translates
- Don't copy native patterns verbatim
- Hooks replace ViewModels in many cases
- Context provides scoped DI
- Repository pattern works great with WatermelonDB

### 4. Performance is About the Bridge
- Minimize JS-Native communication
- Use the right tool: Reanimated for animations, FlashList for lists
- Memoize to prevent unnecessary re-renders
- Profile with Flipper and React DevTools

### 5. Type Everything
- TypeScript catches errors early
- Type your navigation params
- Type your Zustand stores
- Type your repository interfaces

### 6. Test at the Right Level
- Pure domain logic: unit tests
- Use cases: unit tests with mocked repos
- Repositories: integration tests with test DB
- UI: component tests for interactions, E2E for flows

---

## Recommended Learning Path

1. **Week 1**: Build simple screens, understand hooks and rendering
2. **Week 2**: Set up WatermelonDB, implement one repository
3. **Week 3**: Add Zustand for navigation state, practice memoization
4. **Week 4**: Implement streaming LLM integration
5. **Week 5**: Performance profiling and optimization
6. **Ongoing**: Add features, refine patterns based on real usage

---

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [WatermelonDB Documentation](https://watermelondb.dev/)
- [WatermelonDB with Expo](https://watermelondb.dev/docs/Installation#expo-managed-workflow)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [FlashList Documentation](https://shopify.github.io/flash-list/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

---

*This guide should evolve as the project progresses. Update it when you discover new patterns or pitfalls.*