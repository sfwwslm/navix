import React, { useState } from "react";
import styled from "styled-components";
import { reassignAnonymousDataToUser } from "@/services/claim";
import { StyledButton } from "@/components/styled/StyledButton";
import { useModal } from "@/contexts";
import { useAuth } from "@/contexts/Auth.context";
import { VscCloudUpload } from "react-icons/vsc";
import ConfirmationModal from "@/components/common/ConfirmationModal/ConfirmationModal";
import { useTranslation } from "react-i18next";

const ClaimContainer = styled.div`
  text-align: center;
`;

const DataClaim: React.FC = () => {
  const { openAlert } = useModal();
  const {
    activeUser,
    isDataOperationInProgress,
    setDataOperationInProgress,
    incrementDataVersion,
  } = useAuth();
  const [isClaiming, setIsClaiming] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const { t } = useTranslation();

  const handleConfirmClaim = async () => {
    setIsConfirmModalOpen(false);
    if (!activeUser || !activeUser.isLoggedIn) {
      openAlert({
        title: t("common.invalidOperation"),
        message: t("account.claimMustLogin"),
      });
      return;
    }

    setIsClaiming(true);
    setDataOperationInProgress(true); //

    try {
      await reassignAnonymousDataToUser(activeUser);
      incrementDataVersion(); //
      openAlert({
        title: t("account.claimSuccess"),
        message: t("account.claimSuccessMessage"),
      });
    } catch (error: unknown) {
      openAlert({
        title: t("account.claimFailed"),
        message: `${t("account.retryError")}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    } finally {
      setIsClaiming(false);
      setDataOperationInProgress(false); //
    }
  };

  return (
    <>
      <ClaimContainer className="data-claim-container">
        <StyledButton
          onClick={() => setIsConfirmModalOpen(true)}
          disabled={isClaiming || isDataOperationInProgress}
          variant="secondary"
          className="claim-data-button"
        >
          <VscCloudUpload style={{ marginRight: "8px" }} />
          {isClaiming ? t("account.claiming") : t("account.dataClaim")}
        </StyledButton>
      </ClaimContainer>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title={t("common.confirmAction")}
        message={t("account.confirmActionMessage")}
        onConfirm={() => {
          void handleConfirmClaim();
        }}
        onCancel={() => setIsConfirmModalOpen(false)}
      />
    </>
  );
};

export default DataClaim;
