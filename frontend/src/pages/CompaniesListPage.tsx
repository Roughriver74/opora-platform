import React from 'react';
import ClinicsListPage from './ClinicsListPage';

/**
 * Компонент для отображения списка компаний
 * Повторно использует функциональность ClinicsListPage, 
 * поскольку компании и клиники - это одно и то же в данном контексте
 */
const CompaniesListPage: React.FC = () => {
  return <ClinicsListPage />;
};

export default CompaniesListPage;
