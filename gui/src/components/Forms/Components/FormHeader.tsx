import { Sections } from '../../CrossSections';
import { Stepper } from '../../Stepper';

export const FormHeader = ({
  title,
  showProgress = true,
  showSections,
  setDeletedSections,
  canEdit = false,
}: {
  title: string;
  showProgress?: boolean;
  showSections: boolean;
  setDeletedSections?: any;
  canEdit?: boolean;
}) => {
  return (
    <div className="header">
      {showProgress && <Stepper />}

      <h1 className="form-title">{title}</h1>

      {showSections && <Sections setDeletedSections={setDeletedSections} canEdit={canEdit} />}
    </div>
  );
};
