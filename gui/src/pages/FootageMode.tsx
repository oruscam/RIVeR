import { WizardButtons } from "../components/WizzardButtons.js";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { useWizard } from "react-use-wizard";
import { useProjectSlice } from "../hooks/index.js";
import { Icon } from "../components/Icon.js";
import { useState } from "react";
import {
  OperationCanceledError,
  UserSelectionError,
} from "../errors/errors.js";
import { drone, ipcam, oblique } from "../assets/icons/icons";
import "./pages.css";

type Video = {
  name: string;
  path: string;
  type: string;
};

const footageTypes = [
  { id: "uav", icon: drone },
  { id: "oblique", icon: oblique },
  { id: "ipcam", icon: ipcam },
];

export const FootageMode = () => {
  const { handleSubmit } = useForm();
  const { onInitProject, onGetVideo } = useProjectSlice();
  const { nextStep, previousStep } = useWizard();
  const formId = "form-step-2";
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const [dragOver, setDragOver] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [video, setVideo] = useState<Video>();

  const onSubmit = async () => {
    if (video) {
      try {
        await onInitProject(video, currentLanguage);
        nextStep();
      } catch (error) {
        if (error instanceof OperationCanceledError) previousStep();
      }
    }
  };

  const onClickItem = async (type: string) => {
    if (!["uav", "oblique", "ipcam"].includes(type)) return;
    try {
      const { path, name } = await onGetVideo();
      setVideo({ name, path, type });
    } catch (error) {
      if (error instanceof UserSelectionError) {
        setError(t("Step-2.pleaseSelectVideo", { defaultValue: "Commons.randomError" }));
        setTimeout(() => setError(""), 3000);
      }
    }
  };

  const handleDragOver = (id: string) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(id);
  };

  const handleDragLeave = () => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(null);
  };

  const handleDrop = (type: string) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(null);
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const path = window.webUtils.getPathForFile(file);
      setVideo({ name: file.name, path, type });
    }
  };

  return (
    <div className="App">
      <h2 className="step-2-title">{t("Step-2.title")}</h2>
      <form className="file-upload-container" onSubmit={handleSubmit(onSubmit)} id={formId}>
        {footageTypes.map(({ id, icon }) => (
          <div
            key={id}
            className={`footage-button-container ${dragOver === id ? `drag-over-${id}` : ""}`}
            onDragOver={handleDragOver(id)}
            onDragLeave={handleDragLeave()}
            onDrop={handleDrop(id)}
            id={id}
          >
            <button
              className="button-transparent"
              type="button"
              onClick={() => onClickItem(id)}
              id={id}
            >
              <Icon path={icon} />
            </button>
          </div>
        ))}
      </form>
      {video && <p className="file-name mt-2">{video.name}</p>}
      {error && <p className="file-name mt-2">{error}</p>}
      <WizardButtons canFollow={true} formId={formId} />
    </div>
  );
};
