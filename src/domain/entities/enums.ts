/** AuthorType used by Nodes and Agents to help identify source */
export type AgentType = 'human' | 'model';

/** LoomTreeMode for buffer or dialogue modes */
export type LoomTreeMode = 'dialogue' | 'buffer';

/** Used to determine role of an Edge source */
export type SourceRole = 'primary' | 'context' | 'instruction';

/** Used to determine the function of an Edge */
export type EdgeType = 'continuation' | 'annotation';
