import { useState } from 'react';
import { useProviderKey } from './useProviderKey';
import type { ProviderKeyConfig } from './provider-key-config';
import { ProviderKeySection } from './ProviderKeySection';
import { ProviderKeySheet } from './ProviderKeySheet';

type ProviderKeyConnectionProps = {
  readonly config: ProviderKeyConfig;
};

/** A provider's key section with the sheet it opens, on Connections. */
export const ProviderKeyConnection = ({
  config,
}: ProviderKeyConnectionProps) => {
  const keyController = useProviderKey(config.provider);
  const [editing, setEditing] = useState(false);
  return (
    <>
      <ProviderKeySection
        config={config}
        hasStoredKey={keyController.hasStoredKey}
        test={keyController.testState}
        error={keyController.error}
        onEditKey={() => setEditing(true)}
        onTestKey={() => void keyController.test()}
      />
      <ProviderKeySheet
        config={config}
        visible={editing}
        currentKey={keyController.storedKey}
        onCancel={() => setEditing(false)}
        onSave={(key) => {
          void keyController.save(key).then(() => setEditing(false));
        }}
      />
    </>
  );
};
