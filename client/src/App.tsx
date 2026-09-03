import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Route,
  Routes
} from "react-router-dom";
import { PageShell } from "./components/PageShell";
import { useNetwork } from "./hooks/useNetwork";
import { HomePage } from "./pages/HomePage";
import { NewSurveyPage } from "./pages/NewSurveyPage";
import { SurveyDetailPage } from "./pages/SurveyDetailPage";
import { SurveysPage } from "./pages/SurveysPage";
import {
  registerBackgroundSync,
  syncSurveys
} from "./services/syncService";

export function App() {
  const network = useNetwork();
  const [lastOnline, setLastOnline] = useState(network.connected);

  useEffect(() => {
    void registerBackgroundSync();
    void syncSurveys();
  }, []);

  useEffect(() => {
    if (network.connected && !lastOnline) {
      void syncSurveys();
      void registerBackgroundSync();
    }

    setLastOnline(network.connected);
  }, [lastOnline, network.connected]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PageShell />}>
          <Route index element={<HomePage network={network} />} />
          <Route path="new" element={<NewSurveyPage network={network} />} />
          <Route path="surveys" element={<SurveysPage />} />
          <Route path="surveys/:id" element={<SurveyDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
