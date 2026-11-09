import { SiteDocument } from '../../../components/site-document';
import '../../../app/globals.css';
import '../../../styles/guild-theme.css';
import '../../../styles/community-components.css';
export { metadata, viewport } from '../../../app/layout';
import { IntegrationProvider } from '../client/provider';
import '../client/integration.css';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SiteDocument externalAssets={false}><IntegrationProvider>{children}</IntegrationProvider></SiteDocument>;
}
