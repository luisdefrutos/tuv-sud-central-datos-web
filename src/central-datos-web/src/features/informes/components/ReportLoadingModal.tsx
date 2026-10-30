import React from 'react';
import { BlockingLoadingModal } from '../../../components/common/BlockingLoadingModal';

export interface ReportLoadingModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
}

/**
 * ReportLoadingModal ahora utiliza el componente unificado BlockingLoadingModal
 * para garantizar la homogeneidad de estilos con la primera pestaña de la aplicación.
 */
export const ReportLoadingModal: React.FC<ReportLoadingModalProps> = ({
  isOpen,
  title,
  message,
}) => {
  return <BlockingLoadingModal isOpen={isOpen} title={title} message={message} />;
};
