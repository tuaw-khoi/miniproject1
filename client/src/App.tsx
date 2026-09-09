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
import { EditSurveyPage } from "./pages/EditSurveyPage";
import { AdminPage } from "./pages/AdminPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SurveyDetailPage } from "./pages/SurveyDetailPage";
import { SurveysPage } from "./pages/SurveysPage";
import {
  refreshReviewMetadata,
  registerBackgroundSync,
  syncSurveys
} from "./services/syncService";

export function App() {
  const network = useNetwork();
  const [lastOnline, setLastOnline] = useState(network.connected);

  useEffect(() => {
    void registerBackgroundSync();
    void syncSurveys().then(() => refreshReviewMetadata());
  }, []);

  useEffect(() => {
    if (network.connected && !lastOnline) {
      void syncSurveys().then(() => refreshReviewMetadata());
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
          <Route
            path="surveys/:id/edit"
            element={<EditSurveyPage network={network} />}
          />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="admin" element={<AdminPage network={network} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
