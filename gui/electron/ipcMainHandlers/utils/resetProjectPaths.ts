import { ProjectConfig } from '../interfaces';

// Clear the previous project's file paths, so no handler reads or deletes its files.
function resetProjectPaths(PROJECT_CONFIG: ProjectConfig) {
  PROJECT_CONFIG.framesPath = '';
  PROJECT_CONFIG.firstFrame = '';
  PROJECT_CONFIG.matrixPath = '';
  PROJECT_CONFIG.xsectionsPath = '';
  PROJECT_CONFIG.bboxPath = '';
  PROJECT_CONFIG.maskPath = '';
  PROJECT_CONFIG.resultsPath = '';
}

export { resetProjectPaths };
