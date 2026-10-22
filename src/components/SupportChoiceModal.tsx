import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SupportChoiceModalProps {
  open: boolean;
  onClose: () => void;
}

const SupportChoiceModal = ({ open, onClose }: SupportChoiceModalProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    onClose();
    navigate('/support');
  }, [open, onClose, navigate]);

  return null;
};

export default SupportChoiceModal;
