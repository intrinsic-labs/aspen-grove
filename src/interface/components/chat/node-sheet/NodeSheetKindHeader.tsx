import {
  buildContinuationMenuSections,
  type ContinuationMenuAction,
} from '../continuation-menu';
import {
  buildBookmarkMenuSections,
  type BookmarkMenuAction,
} from './bookmark-menu';
import type { NodeBranchPosition } from './node-branch-position';
import {
  buildNodeInfoMenuSections,
  type NodeInfoMenuAction,
} from './node-info-menu';
import { nodeSheetTitle, type NodeSheetKind } from './node-sheet-target';
import { NodeSheetHeader } from './NodeSheetHeader';
import type { NodeSheetData } from './useNodeSheetData';

type NodeSheetKindHeaderProps = {
  readonly kind: NodeSheetKind;
  /** Absent while the node loads. */
  readonly data: NodeSheetData | null;
  readonly position: NodeBranchPosition | null;
  readonly onInfoAction: (action: NodeInfoMenuAction) => void;
  readonly onContinuationAction: (action: ContinuationMenuAction) => void;
  readonly onBookmarkAction: (action: BookmarkMenuAction) => void;
  readonly onBack: () => void;
};

/**
 * Each kind of node sheet's toolbar and menu: Node Info (title, model,
 * `[n]`), Continuation Node (the green check on the active path), and a
 * bookmark (its label over a bookmark symbol and the model, no count).
 */
export const NodeSheetKindHeader = ({
  kind,
  data,
  position,
  onInfoAction,
  onContinuationAction,
  onBookmarkAction,
  onBack,
}: NodeSheetKindHeaderProps) => {
  switch (kind) {
    case 'info':
      return (
        <NodeSheetHeader
          title={nodeSheetTitle.info}
          modelLabel={data?.modelLabel}
          count={position?.count}
          menu={
            data && position
              ? buildNodeInfoMenuSections({
                  isCurrent: position.isCurrent,
                  bookmarked: data.bookmarked,
                  pruned: data.pruned,
                })
              : undefined
          }
          onMenuAction={onInfoAction}
          onBack={onBack}
        />
      );
    case 'continuation':
      return (
        <NodeSheetHeader
          title={nodeSheetTitle.continuation}
          modelLabel={data?.modelLabel}
          count={position?.count}
          badge={position?.onActivePath ? 'check' : undefined}
          menu={
            data ? buildContinuationMenuSections(data.bookmarked) : undefined
          }
          onMenuAction={onContinuationAction}
          onBack={onBack}
        />
      );
    case 'bookmark':
      return (
        <NodeSheetHeader
          title={data?.bookmarkLabel ?? nodeSheetTitle.bookmark}
          modelLabel={data?.modelLabel}
          badge={data?.bookmarked ? 'bookmarked' : 'bookmark'}
          menu={data ? buildBookmarkMenuSections(data.bookmarked) : undefined}
          onMenuAction={onBookmarkAction}
          onBack={onBack}
        />
      );
  }
};
