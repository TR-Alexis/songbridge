import tls from 'tls';

interface SystemCertificateApi {
  getCACertificates(type: 'default' | 'system'): string[];
  setDefaultCACertificates(certificates: string[]): void;
}

export function configureSystemCertificates(): void {
  const certificateApi = tls as unknown as Partial<SystemCertificateApi>;
  if (!certificateApi.getCACertificates || !certificateApi.setDefaultCACertificates) return;

  const certificates = [
    ...certificateApi.getCACertificates('default'),
    ...certificateApi.getCACertificates('system'),
  ];
  certificateApi.setDefaultCACertificates([...new Set(certificates)]);
}
