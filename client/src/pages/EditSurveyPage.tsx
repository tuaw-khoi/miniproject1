import { useNavigate, useParams } from "react-router-dom";
import type { NetworkState } from "../hooks/useNetwork";
import { useSurveyEditDraft } from "../hooks/useSurveyEditDraft";
import { submitSurvey } from "../services/syncService";
import { InspectionForm } from "./NewSurveyPage";

interface EditSurveyPageProps {
  network: NetworkState;
}

export function EditSurveyPage({ network }: EditSurveyPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    draft,
    loading,
    saveState,
    updateSurvey,
    updateReason,
    commit,
    cancel
  } = useSurveyEditDraft(id);

  const save = async (): Promise<void> => {
    const editedSurvey = await commit();
    const result = await submitSurvey(editedSurvey, network.connected);
    navigate(`/surveys/${editedSurvey.id}`, {
      state: {
        message: `Version ${editedSurvey.version} saved. ${result.message}`
      }
    });
  };

  const cancelEdit = async (): Promise<void> => {
    await cancel();
    navigate(id ? `/surveys/${id}` : "/surveys");
  };

  return (
    <InspectionForm
      network={network}
      draft={draft?.survey}
      loading={loading}
      saveState={saveState}
      mode="edit"
      editReason={draft?.reason}
      onEditReasonChange={updateReason}
      onChange={updateSurvey}
      onSubmit={save}
      onCancel={cancelEdit}
    />
  );
}
