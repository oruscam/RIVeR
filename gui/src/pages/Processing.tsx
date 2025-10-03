import { Error, Progress, ImageWithData, WizardButtons } from "../components";
import { Carousel } from "../components/index";
import { FormProcessing } from "../components/Forms";
import { useDataSlice } from "../hooks";

export const Processing = () => {
  const { images, onSetActiveImage } = useDataSlice();
  const { paths, active } = images;

  return (
    <div className="regular-page">
      <div className="media-container">
        <ImageWithData />
        <Carousel
          images={paths}
          active={active}
          setActiveImage={onSetActiveImage}
          mode="processing"
        />
        <Error />
      </div>
      <div className="form-container">
        <Progress />
        <FormProcessing />
        <WizardButtons canFollow={true} formId="form-processing" />
      </div>
    </div>
  );
};
