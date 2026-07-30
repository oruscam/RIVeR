import { FormProvider, useForm } from 'react-hook-form';
import { useSectionSlice } from '../hooks';
import { FormResults } from './Forms';
import { Section } from '../store/section/types';
import { useEffect } from 'react';
import { useWizard } from 'react-use-wizard';

const createInitialState = (sections: Section[]) => {
  let defaultValues = {};

  sections.forEach((section) => {
    if (section.data) {
      const baseKey = section.name;
      const { alpha, numStations, interpolated, artificialSeeding } = section;
      const { showPercentile, showVelocityStd } = section.data;
      defaultValues = {
        ...defaultValues,
        [`${baseKey}_ALPHA`]: alpha,
        [`${baseKey}_STATIONS_NUMBER`]: numStations,
        [`${baseKey}_SHOW_VELOCITY_STD`]: showVelocityStd ? ['on'] : ['off'],
        [`${baseKey}_SHOW_PERCENTILE`]: showPercentile ? ['on'] : ['off'],
        [`${baseKey}_INTERPOLATED_PROFILE`]: interpolated ? ['on'] : ['off'],
        [`${baseKey}_ARTIFICIAL_SEEDING`]: artificialSeeding,
      };
    }
  });

  return defaultValues;
};

export const Results = () => {
  const { sections, activeSection } = useSectionSlice();
  const section = sections[activeSection];
  const methods = useForm({ defaultValues: createInitialState(sections) });

  console.log(sections[activeSection]);

  const { nextStep } = useWizard();

  const onSubmit = () => {
    nextStep();
  };

  useEffect(() => {
    methods.reset(createInitialState(sections));
  }, [section, methods, sections]);

  return (
    <div className="body">
      <FormProvider {...methods}>
        {sections.map((section, index: number) => {
          return <FormResults key={section.name} index={index} onSubmit={methods.handleSubmit(onSubmit)} />;
        })}
      </FormProvider>
    </div>
  );
};
