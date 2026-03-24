import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import UserProfileCard from "./UserProfileCard";

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.25);
  z-index: ${(props) => props.theme.zIndices.userCard};
`;

const CardWrapper = styled(motion.div)`
  pointer-events: auto;
`;

interface UserProfileModalProps {
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose }) => {
  return (
    <Overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <CardWrapper
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        onClick={(event) => event.stopPropagation()}
      >
        <UserProfileCard onClose={onClose} />
      </CardWrapper>
    </Overlay>
  );
};

export default UserProfileModal;
