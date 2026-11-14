/** AuthorType used by Nodes and Agents to help identify source */
export type AgentType = 'human' | 'model';

/**
 * Who a Node speaks as. Agents are only human or model; a node can also be a
 * system message (Open Loom `author.role: "system"`), written by a human and
 * sent to the model with the `system` role, in place on the path.
 */
export type NodeAuthorType = AgentType | 'system';

/** LoomTreeMode for buffer or dialogue modes */
export type LoomTreeMode = 'dialogue' | 'buffer';

/** Used to determine role of an Edge source */
export type SourceRole = 'primary' | 'context' | 'instruction';

/** Used to determine the function of an Edge */
export type EdgeType = 'continuation' | 'annotation';
