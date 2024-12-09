interface VideoData {
    name: string | null;
    path: string;
    width: number;
    height: number;
    fps: number;
    blob?: string | null;
    duration: number;
    creation: string;
}

interface VideoParameters {
    step: number;
    startTime: number;
    endTime: number;
    startFrame: number;
    endFrame: number;
}

interface Video {
    data: VideoData;
    parameters: VideoParameters;
}

interface ProjectDetails {
    riverName: string;
    site: string;
    unitSistem: string;
    meditionDate: string;
}

interface ProjectState {
    projectDirectory: string;
    video: Video;
    type: string;
    firstFramePath: string;
    projectDetails: ProjectDetails;
}

export type {
    ProjectState,
    VideoData,
    VideoParameters,
    Video,
    ProjectDetails
}