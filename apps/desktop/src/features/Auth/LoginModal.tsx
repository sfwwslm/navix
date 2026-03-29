import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useAuth } from "@/contexts/Auth.context";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useModal } from "@/contexts";
import {
  Input,
  FormGroup,
  Label as BaseLabel,
} from "@/components/styled/StyledForm";
import { StyledButton } from "@/components/styled/StyledButton";
import AppModal from "@/components/common/AppModal/AppModal";

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ServerConfigGrid = styled.div`
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 0.8rem;
`;

const SslCheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ErrorMessage = styled.p`
  color: ${(props) => props.theme.colors.error};
  font-size: 0.9rem;
  text-align: center;
  word-break: break-all;
  margin-top: 0.5rem;
`;

interface LoginModalProps {
  onClose: () => void;
  isOpen: boolean;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, isOpen }) => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { openConfirm } = useModal();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [serverIp, setServerIp] = useLocalStorage("serverIp", "127.0.0.1");
  const [serverPort, setServerPort] = useLocalStorage("serverPort", "9990");
  const [useHttps, setUseHttps] = useState(true);

  /**
   * @effect
   * @logic_comment
   */
  useEffect(() => {
    if (isOpen) {
      void Promise.resolve().then(() => {
        setUseHttps(true);
        setServerPort("9991");
        setUsername("");
        setPassword("");
        setError(""); //
      });
    }
  }, [isOpen, setServerPort]);

  const handleHttpsToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isEnabling = e.target.checked;

    if (isEnabling) {
      setUseHttps(true);
      setServerPort("9991"); //
    } else {
      openConfirm({
        title: t("account.httpsWarning.title"),
        message: t("account.httpsWarning.message"),
        confirmText: t("account.httpsWarning.confirmButton"),
        cancelText: t("account.httpsWarning.cancelButton"),
        onConfirm: () => {
          setUseHttps(false);
          setServerPort("9990"); //
        },
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const address = `${serverIp}:${serverPort}`;
      await login(username, password, address, useHttps);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("account.unknownError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppModal isOpen={isOpen} onClose={onClose} title={t("account.title")}>
      <Form
        autoComplete="off"
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
      >
        <ServerConfigGrid>
          <FormGroup>
            <BaseLabel htmlFor="server-ip">{t("account.serverIp")}</BaseLabel>
            <Input
              id="server-ip"
              className="server-ip-input"
              type="text"
              name="navix_server_ip"
              value={serverIp}
              onChange={(e) => setServerIp(e.target.value)}
              placeholder="e.g., 127.0.0.1"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </FormGroup>
          <FormGroup>
            <BaseLabel htmlFor="server-port">{t("account.port")}</BaseLabel>
            <Input
              id="server-port"
              className="server-port-input"
              type="number"
              name="navix_server_port"
              value={serverPort}
              onChange={(e) => setServerPort(e.target.value)}
              placeholder="e.g., 9990"
              autoComplete="off"
            />
          </FormGroup>
        </ServerConfigGrid>

        <SslCheckboxContainer>
          <input
            id="use-https"
            className="ssl-checkbox"
            type="checkbox"
            checked={useHttps}
            onChange={handleHttpsToggle}
          />
          <BaseLabel htmlFor="use-https">{t("account.enableSsl")}</BaseLabel>
        </SslCheckboxContainer>

        <FormGroup>
          <BaseLabel htmlFor="username">{t("account.username")}</BaseLabel>
          <Input
            id="username"
            className="username-input"
            type="text"
            name="navix_login_user"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </FormGroup>
        <FormGroup>
          <BaseLabel htmlFor="password">{t("account.password")}</BaseLabel>
          <Input
            id="password"
            className="password-input"
            type="password"
            name="navix_login_secret"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </FormGroup>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <StyledButton
          type="submit"
          variant="primary"
          disabled={isLoading}
          style={{ marginTop: "0.5rem" }}
        >
          {isLoading ? t("account.loggingIn") : t("account.loginButton")}
        </StyledButton>
      </Form>
    </AppModal>
  );
};

export default LoginModal;
