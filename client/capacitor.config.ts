import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "edu.vku.fieldsurvey",
  appName: "VKU Field Survey",
  webDir: "dist",
  server: {
    androidScheme: "https"
  }
};

export default config;
