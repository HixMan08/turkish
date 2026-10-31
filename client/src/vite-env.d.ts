/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_APPLICATIONS_ENABLED?: string;
  readonly VITE_ANALYTICS_SCRIPT_URL?: string;
  readonly VITE_ANALYTICS_WEBSITE_ID?: string;
}
