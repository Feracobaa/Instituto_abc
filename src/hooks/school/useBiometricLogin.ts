import { useState, useCallback } from 'react';

interface BiometricLoginResult {
  success: boolean;
  studentName?: string;
  error?: string;
}

export function useBiometricLogin() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [statusText, setStatusText] = useState<string>('');

  /**
   * El login facial permanece deshabilitado hasta que el servidor valide una
   * evidencia PAD vinculada a un reto de un solo uso. No se envían embeddings.
   */
  const authenticateWithEmbedding = useCallback(async (
    _embedding: number[],
    _institutionId?: string
  ): Promise<BiometricLoginResult> => {
    setIsAuthenticating(true);
    setStatusText('Acceso facial temporalmente no disponible.');

    try {
      return {
        success: false,
        error: 'El acceso facial está temporalmente deshabilitado mientras se implementa verificación de vida en servidor.',
      };
    } finally {
      setIsAuthenticating(false);
      setStatusText('');
    }
  }, []);

  return {
    isAuthenticating,
    statusText,
    authenticateWithEmbedding,
  };
}
