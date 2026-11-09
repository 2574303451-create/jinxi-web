import RootLayout from '../../../app/layout';
import { IntegrationProvider } from '../client/provider';
import '../client/integration.css';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootLayout externalAssets={false}><IntegrationProvider>{children}</IntegrationProvider></RootLayout>;
}
