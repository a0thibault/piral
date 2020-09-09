import * as React from 'react';
import { useAction, useSetter } from '../hooks';

/**
 * The props for the SetProvider component.
 */
export interface SetProviderProps {
  /**
   * The provider to register.
   */
  provider: JSX.Element;
}

/**
 * The component capable of setting a global provider at mounting.
 */
export function SetProvider({ provider }: SetProviderProps): React.ReactElement {
  const includeProvider = useAction('includeProvider');
  useSetter(() => provider && includeProvider(provider));
  // tslint:disable-next-line:no-null-keyword
  return null;
}
