import type { Metadata } from 'next';
import { SiteDocument } from '../../../components/site-document';
import { IntegrationProvider } from '../../../integration-local/site/client/provider';
import '../../../app/globals.css';
import '../../../styles/guild-theme.css';
import '../../../styles/community-components.css';
import '../../../integration-local/site/client/integration.css';

export const metadata: Metadata = {
  title: '今夕公会 · 独立合成 TEST',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SiteDocument externalAssets={false}>
    <IntegrationProvider surface="synthetic-test">{children}</IntegrationProvider>
  </SiteDocument>;
}
