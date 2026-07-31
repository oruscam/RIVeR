import { FormCrossSections } from '../Forms';
import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import './crossSections.css';
import { useDataSlice, useProjectSlice, useSectionSlice, useUiSlice } from '../../hooks';
import { useWizard } from 'react-use-wizard';
import { useCallback, useEffect } from 'react';
import { Section } from '../../store/section/types';
import { useTranslation } from 'react-i18next';
import { formatNumberTo2Decimals } from '../../helpers';
import { UNIT_CONVERSIONS } from '../../constants/constants';

const createInitialState = (sections: Section[], unitSistem: string) => {
  let defaultValues = {};
  // The store always holds SI values (metres). Convert to feet for display only.
  const toDisplay = (value: number | undefined) =>
    value === undefined ? value : unitSistem === 'imperial' ? value * UNIT_CONVERSIONS.M_TO_FT : value;

  sections.forEach((section) => {
    const { name, dirPoints, rwPoints, bathimetry, numStations, alpha } = section;
    const baseKey = name;
    defaultValues = {
      ...defaultValues,
      [`${baseKey}_CS_LENGTH`]: formatNumberTo2Decimals(toDisplay(bathimetry.width) ?? 0),
      [`${baseKey}_CS_BATHIMETRY`]: bathimetry.path,
      [`${baseKey}_LEVEL`]: formatNumberTo2Decimals(toDisplay(bathimetry.level)),
      [`${baseKey}_LEFT_BANK`]: formatNumberTo2Decimals(toDisplay(bathimetry.leftBank)),
      [`${baseKey}_eastPoint1`]: (toDisplay(rwPoints[0].x) ?? 0).toFixed(2),
      [`${baseKey}_northPoint1`]: (toDisplay(rwPoints[0].y) ?? 0).toFixed(2),
      [`${baseKey}_eastPoint2`]: (toDisplay(rwPoints[1].x) ?? 0).toFixed(2),
      [`${baseKey}_northPoint2`]: (toDisplay(rwPoints[1].y) ?? 0).toFixed(2),
      [`${baseKey}_xPoint1`]: dirPoints.length === 0 ? 0 : dirPoints[0].x.toFixed(1),
      [`${baseKey}_yPoint1`]: dirPoints.length === 0 ? 0 : dirPoints[0].y.toFixed(1),
      [`${baseKey}_xPoint2`]: dirPoints.length === 0 ? 0 : dirPoints[1].x.toFixed(1),
      [`${baseKey}_yPoint2`]: dirPoints.length === 0 ? 0 : dirPoints[1].y.toFixed(1),
      [`${baseKey}_NUM_STATIONS`]: numStations,
      [`${baseKey}_ALPHA`]: alpha,
    };
  });

  return defaultValues;
};

type CrossSectionsProps = {
  deletedSections: string;
  setDeletedSections: (value: string) => void;
};

export const CrossSections = ({ deletedSections, setDeletedSections }: CrossSectionsProps) => {
  const { sections, activeSection, onSetSections } = useSectionSlice(); // Wrap the sections variable inside an array
  const { onSetErrorMessage } = useUiSlice();
  const { type, projectDetails } = useProjectSlice();

  const methods = useForm({ defaultValues: createInitialState(sections, projectDetails.unitSistem) });
  const { nextStep } = useWizard();
  const { t } = useTranslation();

  const { images } = useDataSlice();

  const unregisterFieldsStartingWith = useCallback(
    (prefix: string) => {
      const allValues = methods.getValues(); // Obtiene todos los campos registrados y sus valores
      const fieldNames = Object.keys(allValues); // Obtiene los nombres de todos los campos

      // Filtra los nombres de los campos que comienzan con el prefijo deseado
      const fieldsToUnregister = fieldNames.filter((fieldName) => fieldName.startsWith(prefix));

      // Desregistra cada campo que coincide
      fieldsToUnregister.forEach((fieldName) => methods.unregister(fieldName));
    },
    [methods]
  );

  const onSubmit = (data: FieldValues) => {
    if (images.paths.length === 0) {
      onSetErrorMessage(t('Errors.waitingForFrames'));
      return;
    }
    onSetSections(data, type);
    nextStep();
  };

  const onError = (errors: any) => {
    console.log(errors);
    onSetErrorMessage(errors);
  };

  // * Desregistra las secciones eliminadas
  useEffect(() => {
    if (deletedSections !== '') {
      unregisterFieldsStartingWith(deletedSections);
    }
    setDeletedSections('');
  }, [deletedSections, setDeletedSections, unregisterFieldsStartingWith]);

  const activeSectionData = sections[activeSection];

  // * Actualiza el formulario
  useEffect(() => {
    methods.reset(createInitialState(sections, projectDetails.unitSistem));
    // Only reacts to the active section's own data (or which section is active) — reacting to
    // the full `sections` array would reset in-progress edits on non-active section forms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSectionData, projectDetails.unitSistem, methods]);

  return (
    <div className="body">
      <FormProvider {...methods}>
        {sections.map((section, index: number) => {
          return (
            <FormCrossSections
              key={section.name}
              onSubmit={methods.handleSubmit(onSubmit, onError)}
              name={section.name}
              index={index}
            />
          );
        })}
      </FormProvider>
    </div>
  );
};
