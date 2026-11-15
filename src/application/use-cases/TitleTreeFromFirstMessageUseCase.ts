import type { ILoomTreeRepository } from '@application/repositories';
import {
  isDefaultTreeTitle,
  titleFromFirstMessage,
} from '@application/services/tree-title';
import type { ULID } from '@domain/value-objects';

export type TitleTreeFromFirstMessageInput = {
  readonly treeId: ULID;
  readonly firstMessage: string;
};

export type TitleTreeFromFirstMessageDependencies = {
  readonly loomTreeRepository: Pick<ILoomTreeRepository, 'findById' | 'update'>;
};

/**
 * Titles a still-untitled tree from its first message, as Latent Spaces
 * does when a tree is created (see `titleFromFirstMessage`). Returns the new
 * title, or null when the tree already had one.
 */
export class TitleTreeFromFirstMessageUseCase {
  private readonly deps: TitleTreeFromFirstMessageDependencies;

  constructor(dependencies: TitleTreeFromFirstMessageDependencies) {
    this.deps = dependencies;
  }

  async execute(input: TitleTreeFromFirstMessageInput): Promise<string | null> {
    const tree = await this.deps.loomTreeRepository.findById(input.treeId);
    if (!tree || !isDefaultTreeTitle(tree.title)) {
      return null;
    }
    const title = titleFromFirstMessage(input.firstMessage);
    if (!title) {
      return null;
    }
    await this.deps.loomTreeRepository.update({
      id: input.treeId,
      changes: { title },
    });
    return title;
  }
}
