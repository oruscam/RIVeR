interface VideoData {
    name: string | null;
    path: string;
    width: number;
    height: number;
    fps: number;
    blob: string | null;
    duration: number;
}

interface VideoParameters {
    step: string;
    startTime: string | null;
    endTime: string | null;
    startFrame: string;
    endFrame: string;
}


interface Video {
    data: VideoData;
    parameters: VideoParameters;
}

interface ProjectState {
    projectDirectory: string;
    video: Video;
    type: string;
    firstFramePath: string;
}

export type {
    ProjectState,
    VideoData,
    VideoParameters,
    Video
}